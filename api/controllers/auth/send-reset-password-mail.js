const { find, update } = require("../../utils/CRUDs/index");
const { randomStr } = require("../../utils/utils");
const moment = require("moment");

module.exports = {
    inputs: {
        email: {
            type: "string",
            required: true,
        },
        id_tenant: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: { description: "Email inviata" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            const user = await find({
                tenant: inputs.id_tenant,
                table: "utenti",
                where: { email: inputs.email },
            });

            if (!user) {
                return exits.genericError({
                    error: "User not found",
                });
            }

            const token = randomStr(10);
            const expiresAt = moment()
                .add(24, "hours")
                .format("YYYY-MM-DD HH:mm:ss");

            // Salvo il codice di accesso
            await update({
                tenant: inputs.id_tenant,
                table: "utenti",
                id_utente: user.data[0].id_utente,
                where: { email: inputs.email },
                inputs: {
                    password_reset_token: token,
                    password_reset_token_expires_at: expiresAt,
                },
            });

            const link = `${sails.config.custom.baseUrl}/reset-password?token=${token}&id_utente=${user.data[0].id}`;

            await sails.helpers.sendEmail(
                inputs.email,
                "Richiesta cambio password",
                `Ciao ${user.data[0].nome} ${user.data[0].cognome},\nPer cambiare la password, clicca il link:\n${link}\n\nIl link scade tra 24 ore.`,
            );

            return exits.success({
                expiration: expiresAt,
            });
        } catch (err) {
            return exits.genericError({ error: err.message });
        }
    },
};
