const { create, find, update } = require("../../utils/CRUDs/index");

module.exports = {
    inputs: {
        id_evento: {
            type: "number",
            required: true,
        },
        data: {
            type: "ref",
            required: true,
            columnType: "dateTime",
            columnName: "data",
        },
        ora_inizio: {
            type: "ref",
            required: true,
            coluimnType: "time",
            columnName: "ora_inizio",
        },
        ora_fine: {
            type: "ref",
            required: true,
            columnType: "time",
            columnName: "ora_fine",
        },
        data_inizio_prenotazione: {
            type: "ref",
            columnType: "dateTime",
            columnName: "data_inizio_prenotazione",
        },
        data_fine_prenotazione: {
            type: "ref",
            columnType: "dateTime",
            columnName: "data_fine_prenotazione",
        },
        prenotabile: {
            type: "ref",
            columnType: "binary",
            columnName: "prenotabile",
        },
        caparra: {
            type: "number",
            columnName: "caparra",
        },
        ordinamento: {
            type: "number",
            columnName: "ordinamento",
        },
        fasce: {
            type: "json",
        },
    },

    exits: {
        success: {
            description: "Evento creato",
        },
        genericError: {
            statusCode: 500,
        },
    },

    fn: async function (inputs, exits) {
        const {
            id_evento,
            data,
            ora_inizio,
            ora_fine,
            data_inizio_prenotazione,
            data_fine_prenotazione,
            caparra,
            prenotabile,
            ordinamento,
            fasce,
        } = inputs;
        const id_tenant = this.req.id_tenant;
        const id_utente = this.req.id_utente;

        try {
            const newEventDay = await create({
                table: "eventi-date",
                tenant: id_tenant,
                id_utente,
                inputs: {
                    id_evento,
                    data: data,
                    ora_inizio: ora_inizio,
                    ora_fine: ora_fine,
                    data_inizio_prenotazione: data_inizio_prenotazione || null,
                    data_fine_prenotazione: data_fine_prenotazione || null,
                    prenotabile: prenotabile ? 1 : 0,
                    caparra: caparra || 0,
                    ordinamento: ordinamento || 0,
                },
            });

            if (fasce && fasce.length > 0) {
                for (const fascia of fasce) {
                    await create({
                        table: "eventi-fasce",
                        tenant: id_tenant,
                        id_utente,
                        inputs: {
                            id_evento,
                            "id_evento-data": newEventDay,
                            ora_inizio: fascia.ora_inizio,
                            ora_fine: fascia.ora_fine,
                            max_posti: fascia.max_posti || null,
                        },
                    });
                }
            } else {
                await create({
                    table: "eventi-fasce",
                    tenant: id_tenant,
                    id_utente,
                    inputs: {
                        id_evento,
                        "id_evento-data": newEventDay,
                        ora_inizio: inputs.ora_inizio,
                        ora_fine: inputs.ora_fine,
                        max_posti: null,
                    },
                });
            }

            const allDates = await find({
                tenant: id_tenant,
                table: "eventi-date",
                where: { id_evento },
            });

            const datesArray = allDates.data;

            if (datesArray && datesArray.length > 0) {
                let earliest = null;
                let latest = null;

                datesArray.forEach((date) => {
                    const d = new Date(date.data);
                    if (!isNaN(d.getTime())) {
                        if (!earliest || d < earliest) earliest = d;
                        if (!latest || d > latest) latest = d;
                    }
                });

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
            }

            return exits.success({ status: true });
        } catch (err) {
            return exits.genericError({ error: err.message });
        }
    },
};
