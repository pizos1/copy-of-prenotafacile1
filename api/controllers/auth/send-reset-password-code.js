const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { loginToKeycloak } = require("../../utils/keycloak");
const {
    verifyPassword,
    generateTokens,
    prefixToken,
} = require("../../utils/localAuth");
const { castMessage, randomStr } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");

module.exports = {
    friendlyName: "Send Reset Password Code",

    inputs: {
        email: {
            type: "string",
            required: true,
        },
    },

    exits: {
        success: { responseType: "ok" },
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
            responseType: "badRequest",
        },
        invalid: {
            description: "Parametri non validi",
            responseType: "badRequest", // questa chiama la tua risposta personalizzata
        },
    },

    fn: async function (inputs, exits) {
        const email = inputs.email;
        const db = await getDB();

        let id_tenant = null;

        // controllo se l'utente esiste
        const utenti = await db.query(
            "SELECT * FROM utenti u WHERE u.email = ?",
            [email],
        );
        if (utenti.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );
        }

        id_tenant = utenti[0].id_tenant;

        // controllo che l'utente esista nel suo tenant
        const utente = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE email = ?",
            [email],
        );
        if (utente.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );
        }
        if (utente[0].attivo === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "disbled_user"),
            );
        }

        // invio email con codice di accesso
        let token = randomStr(6, { only_numbers: true });
        const expiration = moment()
            .add(5 * 60, "seconds")
            .toDate();

        // salvo il codice di accesso
        await query(
            { id_tenant },
            "UPDATE utenti SET change_password_token = ?, change_password_expiration = ? WHERE id_utente = ?",
            [token, expiration, utente[0].id_utente],
        );

        sendEmail(
            utente[0].email,
            castMessage(this.req, "login", "reset_object"),
            castMessage(this.req, "login", "reset_body").replace(
                "<<code>>",
                token,
            ),
        );

        return exits.success({ expiration });
    },
};
