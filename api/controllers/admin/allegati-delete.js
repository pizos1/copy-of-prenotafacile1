const { find } = require("../../utils/CRUDs/index");
const deleteAttachment = require("../../utils/deleteAttachment");

module.exports = {
    inputs: {
        id_allegato: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: {
            description: "Allegato eliminato",
        },
        notFound: {
            description: "Allegato non trovato",
        },
        badRequest: {
            description: "Errore nell'eliminazione dell'allegato",
        },
        notAllowed: {
            description: "Non autorizzato",
            statusCode: 403,
        },
    },

    fn: async function (inputs, exits) {
        try {
            const { id_allegato } = inputs;
            const id_utente = this.req.id_utente;
            const id_tenant = this.req.id_tenant;

            const role = await find({
                tenant: id_tenant,
                table: "utenti",
                id_utente,
                where: { id_utente },
            });

            const userRole = role?.data?.[0];

            if (!userRole) {
                return exits.notAllowed({ error: "Non autorizzato" });
            }

            if (userRole.id_profilo === 1) {
                return exits.notAllowed({ error: "Non autorizzato" });
            }

            const result = await deleteAttachment({
                tenant: id_tenant,
                id_utente,
                id_allegato,
            });

            if (!result?.deleted) {
                return exits.notFound({ error: "Allegato non trovato" });
            }

            return exits.success({ status: true });
        } catch (error) {
            return exits.badRequest({ error: error.message });
        }
    },
};
