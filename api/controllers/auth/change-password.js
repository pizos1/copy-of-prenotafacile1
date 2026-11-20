const { sendEmail } = require("../../utils/email");
const { randomStr, castMessage } = require("../../utils/utils");
const {
    loginToKeycloak,
    updateKeycloakUserPassword,
} = require("../../utils/keycloak");
const { verifyPassword, hashPassword } = require("../../utils/localAuth");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const sails = require("sails");

module.exports = {
    friendlyName: "Cambio password",

    inputs: {
        password_old: {
            type: "string",
            required: true,
        },
        password_new: {
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
        const id_utente = this.req.id_utente;
        const id_tenant = this.req.id_tenant;

        const utente = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE id_utente = ?",
            [id_utente],
        );
        if (utente.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        if (!sails.config.custom.keycloak.ACTIVE) {
            // verify old password locally
            const valid = verifyPassword(
                inputs.password_old,
                utente[0].password,
            );
            if (!valid) {
                return exits.invalid(
                    castMessage(this.req, "errors", "wrong_credentials"),
                );
            }
            const password_hashed = hashPassword(inputs.password_new);
            await query(
                { id_tenant },
                "UPDATE utenti SET password = ? WHERE id_utente = ?",
                [password_hashed, id_utente],
            );
        } else {
            let keycloakLogin;
            try {
                keycloakLogin = await loginToKeycloak(id_tenant, {
                    username: utente[0].email,
                    password: inputs.password_old,
                });
            } catch (e) {
                keycloakLogin = null;
            }
            if (!keycloakLogin || !keycloakLogin.access_token) {
                return exits.invalid(
                    castMessage(this.req, "errors", "wrong_credentials"),
                );
            }
            await updateKeycloakUserPassword(
                id_tenant,
                utente[0].id_keycloak,
                inputs.password_new,
            );
        }

        return exits.success({ status: true });
    },
};
