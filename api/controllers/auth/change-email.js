const { sendEmail } = require("../../utils/email");
const { randomStr, castMessage } = require("../../utils/utils");
const { updateUserInKeycloak } = require("../../utils/keycloak");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const sails = require("sails");

module.exports = {
    friendlyName: "Cambio mail",

    inputs: {
        email: {
            type: "string",
            required: true,
        },
        code: {
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
        const db = await getDB();

        const utente = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE id_utente = ?",
            [id_utente],
        );
        if (utente.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        if (utente[0].change_email_code !== inputs.code) {
            return exits.invalid(
                castMessage(this.req, "errors", "invalid_code"),
            );
        }
        if (moment().isAfter(moment(utente[0].change_email_code_expiration))) {
            return exits.invalid(
                castMessage(this.req, "errors", "code_expired"),
            );
        }

        const emailInUse = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE email = ?",
            [inputs.email],
        );
        if (emailInUse.length > 0)
            return exits.invalid(
                castMessage(this.req, "errors", "email_in_use"),
            );

        let res = true;
        if (!sails.config.custom.keycloak.ACTIVE) {
            res = true;
        } else {
            // aggiorno anche su keycloak
            res = await updateUserInKeycloak(id_tenant, utente[0].id_keycloak, {
                email: inputs.email,
            });
        }

        if (res) {
            await query(
                { id_tenant },
                "UPDATE utenti SET email = ?, change_email_code = NULL, change_email_code_expiration = NULL WHERE id_utente = ?",
                [inputs.email, id_utente],
            );
            await db.query("UPDATE utenti SET email = ? WHERE email = ?", [
                inputs.email,
                utente[0].email,
            ]);
        }

        return exits.success({ status: res });
    },
};
