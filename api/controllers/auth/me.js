const { find } = require("../../utils/CRUDs/find");

module.exports = {
    inputs: {},

    exits: {
        success: {},
        genericError: {
            description: "An error occurred while fetching user data",
            statusCode: "500",
        },
    },

    fn: async function (inputs, exits) {
        try {
            // =========================================
            // Serve per passare AuthContext in frontend
            // =========================================

            const id_tenant = this.req.id_tenant;
            const id_utente = this.req.id_utente;

            if (!id_tenant || !id_utente) {
                return exits.success({
                    success: false,
                    message: "Informazioni sessione mancanti (Tenant o Utente)",
                });
            }

            const result = await find({
                tenant: id_tenant,
                table: "utenti",
                where: {
                    id_utente: id_utente,
                },
                limit: 1,
            });

            if (!result.data || result.data.length === 0) {
                return exits.success({
                    success: false,
                    message: "Utente non trovato nel database tenant",
                });
            }

            return exits.success({
                success: true,
                user: result.data[0],
            });
        } catch (err) {
            return exits.genericError({
                success: false,
                message: "Errore interno durante il recupero dei dati",
            });
        }
    },
};
