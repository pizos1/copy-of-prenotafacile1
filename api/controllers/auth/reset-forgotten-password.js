const { find, update } = require("../../utils/CRUDs/index");
const { query } = require("../../utils/db");
const { hashPassword } = require("../../utils/localAuth");
const { castMessage } = require("../../utils/utils");
const moment = require("moment");

module.exports = {
    inputs: {
        token: {
            type: "string",
            required: true,
        },
        password: {
            type: "string",
            required: true,
        },
        confermaPassword: {
            type: "string",
            required: true,
        },
        id_tenant: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: {},
        invalidToken: { statusCode: 400 },
        passwordMismatch: { statusCode: 400 },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            // Verifico che le password coincidano
            if (inputs.password !== inputs.confermaPassword) {
                return exits.passwordMismatch(
                    castMessage(this.req, "errors", "password_mismatch"),
                );
            }

            // Cerco utente tramite token nel tenant
            const { data: rows } = await find({
                tenant: inputs.id_tenant,
                table: "utenti",
                id_utente: this.req.id_utente,
                where: { password_reset_token: inputs.token },
                includePrivates: true,
            });

            if (!rows || rows.length === 0) {
                return exits.invalidToken(
                    castMessage(this.req, "errors", "invalid_token"),
                );
            }

            const user = rows[0];

            // Verifico scadenza token
            if (
                moment().isAfter(moment(user.password_reset_token_expires_at))
            ) {
                return exits.invalidToken(
                    castMessage(this.req, "errors", "token_expired"),
                );
            }

            // Aggiorno password e cancello token
            const hashed_password = hashPassword(inputs.password);
            await update({
                tenant: inputs.id_tenant,
                table: "utenti",
                id_utente: user.id_utente,
                where: { password_reset_token: inputs.token },
                inputs: {
                    password: hashed_password,
                    password_reset_token: null,
                    password_reset_token_expires_at: null,
                },
            });

            return exits.success({ status: true });
        } catch (err) {
            console.log("Errore reset password:", err);
            return exits.genericError({ error: err.message });
        }
    },
};
