const { find, update } = require("../../utils/CRUDs/index");

module.exports = {
    inputs: {
        token: {
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
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            const users = await find({
                tenant: inputs.id_tenant,
                table: "utenti",
                id_utente: this.req.id_utente,
                where: { email_proof_token: inputs.token },
                id_utente: this.req.id_utente,
                includePrivates: true,
            });
            if (!users || users.length === 0) {
                return exits.invalidToken({
                    error: "Token scaduto o non valido",
                });
            }
            await update({
                tenant: inputs.id_tenant,
                table: "utenti",
                id_utente: this.req.id_utente,
                where: { email_proof_token: inputs.token },
                id_utente: this.req.id_utente,
                inputs: {
                    email_status: "confirmed",
                    email_proof_token: null,
                    email_proof_token_expires_at: null,
                },
                includePrivates: true,
            });
            return exits.success({
                success: true,
            });
        } catch (err) {
            return exits.genericError({
                success: false,
                message: "An error occurred during email verification",
            });
        }
    },
};
