const { find } = require("../../utils/CRUDs/find");

module.exports = {
    inputs: {
        today: {
            type: "string",
            required: true,
        },
    },

    exits: {
        success: {
            description: "Eventi retrieved successfully",
        },
        error: {
            description: "Error retrieving eventi",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const id_tenant = this.req.id_tenant;
            const today = new Date(inputs.today);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const formatDate = (d) => d.toISOString().split("T")[0];

            const date_eventi = await find({
                tenant: id_tenant,
                table: "eventi-date",
                orderBy: "titolo ASC",
                id_utente: this.req.id_utente,
                where: {
                    data: {
                        Between: [formatDate(yesterday), formatDate(tomorrow)],
                    },
                },

                joins: [
                    {
                        table: "eventi",
                        tableAbbreviation: "e",
                        on: "ed.id_evento = e.id_evento",
                        select: ["titolo"],
                    },
                ],
                excludes: [
                    "id_evento",
                    "ora_inizio",
                    "ora_fine",
                    "prenotabile",
                    "data_inizio_prenotazione",
                    "data_fine_prenotazione",
                    "caparra",
                    "fasce_orarie",
                ],
            });
            return exits.success(date_eventi);
        } catch (error) {
            return exits.error(error);
        }
    },
};
