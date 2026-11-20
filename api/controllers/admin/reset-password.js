const { sendEmail } = require("../../utils/email");
const { randomStr, castMessage } = require("../../utils/utils");
const {
    loginToKeycloak,
    updateKeycloakUserPassword,
} = require("../../utils/keycloak");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { hashPassword } = require("../../utils/localAuth");
const sails = require("sails");

module.exports = {
    friendlyName: "Reset password",

    inputs: {
        id_utente: {
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
        const id_tenant = this.req.id_tenant;

        const utente = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE id_utente = ?",
            [inputs.id_utente],
        );
        if (utente.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        let password_new = randomStr(12);
        // TODO: test
        password_new = "1";

        // aggiorno password
        if (!sails.config.custom.keycloak.ACTIVE) {
            const password_hashed = hashPassword(password_new);
            await query(
                { id_tenant },
                "UPDATE utenti SET password = ? WHERE id_utente = ?",
                [password_hashed, inputs.id_utente],
            );
        } else {
            const res = await updateKeycloakUserPassword(
                id_tenant,
                utente[0].id_keycloak,
                password_new,
            );
        }

        sendEmail(
            utente[0].email,
            castMessage(this.req, "resetPassword", "mail_object"),
            castMessage(this.req, "resetPassword", "mail_body").replace(
                "<<password>>",
                password_new,
            ),
        );

        return exits.success({ status: true });
    },
};
