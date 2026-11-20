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
        token: {
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
            "SELECT * FROM utenti WHERE email = ? AND change_password_token = ?",
            [email, inputs.token],
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

        // controllo se il codice è scaduto
        if (moment().isAfter(utente[0].change_password_expiration)) {
            return exits.genericError(
                castMessage(this.req, "errors", "expired_token"),
            );
        }

        return exits.success({ status: true });
    },
};
