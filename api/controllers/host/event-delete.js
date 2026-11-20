const { customDelete, find } = require("../../utils/CRUDs/index");
const deleteAttachment = require("../../utils/deleteAttachment");

module.exports = {
    inputs: {
        delete_id: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: {},
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const tenantId = this.req.id_tenant;
            const id_utente = this.req.id_utente;
            const id_evento = inputs.delete_id;

            const deleted = await customDelete({
                tenant: tenantId,
                table: "eventi",
                id_utente,
                delete_id: id_evento,
            });
            if (!deleted) {
                return exits.genericError();
            }

            const deletedDates = await customDelete({
                tenant: tenantId,
                table: "eventi-date",
                id_utente,
                where: { id_evento: id_evento },
            });
            if (!deletedDates) {
                return exits.genericError();
            }

            const deletedFasce = await customDelete({
                tenant: tenantId,
                table: "eventi-fasce",
                id_utente,
                where: { id_evento: id_evento },
            });
            if (!deletedFasce) {
                return exits.genericError();
            }

            const allegatiResult = await find({
                tenant: tenantId,
                table: "allegati",
                id_utente,
                where: { id_evento: id_evento },
            });

            if (allegatiResult?.data?.length > 0) {
                for (const allegato of allegatiResult.data) {
                    await deleteAttachment({
                        tenant: tenantId,
                        id_utente,
                        id_allegato: allegato.id,
                    });
                }
            }

            return exits.success({ status: true });
        } catch (error) {
            return exits.genericError({ error: error.message });
        }
    },
};
