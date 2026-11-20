const { update } = require("../../utils/CRUDs/update");

module.exports = {
    inputs: {
        ordinamento: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: {
            description: "Event date order updated successfully",
        },
        error: {
            description: "Error updating event date order",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const id_tenant = this.req.id_tenant;
            const id_evento = this.req.params.id;
            const { ordinamento } = inputs;

            await update({
                tenant: id_tenant,
                table: "eventi",
                id_utente: this.req.id_utente,
                where: { id_evento: id_evento },
                inputs: { ordinamento },
            });

            return exits.success({
                status: "success",
                message: "Event date order updated successfully",
            });
        } catch (error) {
            return exits.error({
                message: "Error updating event date order",
                error,
            });
        }
    },
};
