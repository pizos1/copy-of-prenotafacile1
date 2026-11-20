const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { loginToKeycloak } = require("../../utils/keycloak");
const {
    generateTokens,
    prefixToken,
    verifyPassword,
} = require("../../utils/localAuth");
const { castMessage, randomStr } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");

module.exports = {
    friendlyName: "Verifica codice di login",

    inputs: {
        email: {
            type: "string",
            required: true,
        },
        password: {
            type: "string",
            required: true,
        },
        login_token: {
            type: "string",
            required: true,
        },
    },

    exits: {
        success: {},
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
        },
    },

    fn: async function (inputs, exits) {
        const db = await getDB();
        let id_tenant = null;

        // controllo se l'utente esiste
        const utenti = await db.query(
            "SELECT * FROM utenti u WHERE u.email = ?",
            [inputs.email],
        );
        if (utenti.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        id_tenant = utenti[0].id_tenant;

        let access_token = null;
        let refresh_token = null;
        if (!sails.config.custom.keycloak.ACTIVE) {
            const utenteCheck = await query(
                { id_tenant },
                "SELECT * FROM utenti WHERE email = ?",
                [inputs.email],
            );
            if (utenteCheck.length === 0)
                return exits.genericError(
                    castMessage(this.req, "errors", "user_not_found"),
                );
            const valid = verifyPassword(
                inputs.password,
                utenteCheck[0].password,
            );
            if (!valid)
                return exits.genericError(
                    castMessage(this.req, "errors", "wrong_credentials"),
                );
            const tokens = generateTokens({
                id_tenant,
                email: inputs.email,
                id_utente: utenteCheck[0].id_utente,
            });
            access_token = tokens.access_token;
            refresh_token = tokens.refresh_token;
        } else {
            // effettuo il login su keycloak
            try {
                const response = await loginToKeycloak(id_tenant, {
                    username: inputs.email,
                    password: inputs.password,
                });
                if (response.access_token) access_token = response.access_token;
                if (response.refresh_token)
                    refresh_token = response.refresh_token;
            } catch (e) {
                return exits.genericError(
                    castMessage(this.req, "errors", "wrong_credentials"),
                );
            }
        }

        // controllo che l'utente esista nel suo tenant
        const utente = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE email = ?",
            [inputs.email],
        );
        if (utente.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        // verifico il codice di login
        if (utente[0].login_token !== inputs.login_token) {
            return exits.genericError(
                castMessage(this.req, "errors", "wrong_login_code"),
            );
        }

        // verifico la scadenza del codice di login
        if (moment().isAfter(moment(utente[0].login_expiration))) {
            return exits.genericError(
                castMessage(this.req, "login", "code_expired"),
            );
        }

        // recupero il profilo dell'utente
        const profilo = await query(
            { id_tenant },
            "SELECT * FROM profili WHERE id_profilo = ?",
            [utente[0].id_profilo],
        );
        if (profilo.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "profile_not_found"),
            );

        return exits.success({
            access_token: prefixToken(id_tenant, access_token),
            refresh_token: prefixToken(id_tenant, refresh_token),
            area: profilo[0].area,
        });
    },
};
