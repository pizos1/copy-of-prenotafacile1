const { find, customDelete, update } = require("../../utils/CRUDs/index");

module.exports = {
    inputs: {
        delete_id: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: { description: "Data eliminata e evento aggiornato" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        const { delete_id } = inputs;
        const id_tenant = this.req.id_tenant;
        const id_utente = this.req.id_utente;

        try {
            const responseFind = await find({
                tenant: id_tenant,
                id_utente,
                table: "eventi-date",
                where: { "id_evento-data": delete_id },
            });

            const dayToCancel = responseFind.data && responseFind.data[0];

            if (!dayToCancel) {
                return exits.success({
                    status: true,
                    message: "Data non trovata",
                });
            }

            const id_evento = dayToCancel.id_evento;

            await customDelete({
                tenant: id_tenant,
                id_utente,
                table: "eventi-date",
                where: { "id_evento-data": delete_id },
            });

            const allDates = await find({
                tenant: id_tenant,
                table: "eventi-date",
                where: { id_evento },
            });

            const datesArray = allDates.data;

            let earliest = null;
            let latest = null;

            if (datesArray && datesArray.length > 0) {
                datesArray.forEach((date) => {
                    const d = new Date(date.data);
                    if (!isNaN(d.getTime())) {
                        if (!earliest || d < earliest) earliest = d;
                        if (!latest || d > latest) latest = d;
                    }
                });
            }

            await update({
                tenant: id_tenant,
                id_utente,
                table: "eventi",
                where: { id: id_evento },
                inputs: {
                    data_inizio: earliest,
                    data_fine: latest,
                },
            });

            return exits.success({ status: true });
        } catch (error) {
            return exits.genericError({ error: error.message });
        }
    },
};
