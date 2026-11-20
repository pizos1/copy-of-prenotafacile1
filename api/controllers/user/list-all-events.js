const { allegati } = require("../../../config/models");
const { find } = require("../../utils/CRUDs/find");
const { formatDb } = require("../../utils/formatDb");

module.exports = {
    inputs: {
        startDate: { type: "ref" },
        endDate: { type: "ref" },
        search: { type: "string" },
        page: { type: "number" },
        limit: { type: "number" },
        sortingField: { type: "string" },
        sortingDirection: { type: "number" },
        id_tenant: { type: "number" },
    },

    exits: {
        success: { description: "Eventi retrieved successfully" },
        error: { description: "Error retrieving eventi" },
    },

    fn: async function (inputs, exits) {
        const {
            startDate,
            endDate,
            search,
            page,
            limit,
            sortingField,
            sortingDirection,
            id_tenant: id_tenant_input,
        } = inputs;

        try {
            const id_tenant = id_tenant_input ?? this.req.id_tenant ?? 1;
            const cleanStartDate = startDate
                ? formatDb(startDate, "Date")
                : null;
            const cleanEndDate = endDate ? formatDb(endDate, "Date") : null;

            const res = await find({
                tenant: id_tenant,
                table: "eventi",
                page,
                limit,
                id_utente: this.req.id_utente ?? null,
                sortingField,
                sortingDirection,
                joins: [
                    {
                        table: "comuni",
                        tableAbbreviation: "c",
                        on: "e.id_comune = c.id_comune",
                        select: ["comune"],
                    },
                    {
                        table: "eventi-date",
                        tableAbbreviation: "ed",
                        on: "e.id_evento = ed.id_evento",
                        select: [
                            "data",
                            "id_evento-data",
                            "data_inizio_prenotazione",
                            "data_fine_prenotazione",
                            "prenotabile",
                        ],
                    },
                    {
                        type: "LEFT",
                        table: "allegati",
                        tableAbbreviation: "a",
                        on: "e.id_evento = a.id_evento",
                        select: ["allegato", "tipologia_allegato"],
                    },
                ],
                where: {
                    ...(search && { "e.titolo": { Like: search } }),
                    "ed.data": {
                        Between: [cleanStartDate, cleanEndDate],
                    },
                },
                orderBy: "e.data_inizio, a.id_allegato ASC",
            });

            const raw_data = res.data ?? [];

            // grouping livello js, perche il group by non funziona come voglio

            const grouped_events = raw_data.reduce((acc, item) => {
                let existingEvent = acc.find((e) => e.id === item.id);

                const allegatiObj = item.allegato
                    ? {
                          allegato: item.allegato,
                          tipologia_allegato: item.tipologia_allegato,
                      }
                    : null;

                if (!existingEvent) {
                    const {
                        data,
                        ora_inizio,
                        ora_fine,
                        prenotabile,
                        max_posti,
                        allegato,
                        tipologia_allegato,
                        "id_evento-data": idEd,
                        "id_evento-fascia": idEf,
                        ...cleanItem
                    } = item;

                    existingEvent = {
                        ...cleanItem,
                        data_inizio: formatDb(cleanItem.data_inizio, "Date"),
                        data_fine: formatDb(cleanItem.data_fine, "Date"),
                        date: [],
                        allegati: [],
                    };
                    delete existingEvent.data;
                    delete existingEvent.data_inizio_prenotazione;
                    delete existingEvent.data_fine_prenotazione;

                    acc.push(existingEvent);
                }

                if (item.data) {
                    const dataEsistente = existingEvent.date.find(
                        (d) => d.data === formatDb(item.data, "Date"),
                    );
                    if (!dataEsistente) {
                        existingEvent.date.push({
                            data: formatDb(item.data, "Date"),
                            prenotabile: formatDb(item.prenotabile, "Boolean"),
                            ora_inizio: item.ora_inizio,
                            ora_fine: item.ora_fine,
                            max_posti: item.max_posti,
                        });
                    }
                }

                // Add allegati for both new and existing events
                if (allegatiObj) {
                    const alreadyExists = existingEvent.allegati.some(
                        (a) => a.allegato === allegatiObj.allegato,
                    );

                    if (!alreadyExists) {
                        existingEvent.allegati.push({
                            allegato: allegatiObj.allegato,
                            tipologia_allegato: allegatiObj.tipologia_allegato,
                        });
                    }
                }

                return acc;
            }, []);

            res.data = grouped_events;

            // Serve per dare precedenza agli eventi con ordinamenti cusom
            const priorityEvents = [];
            const otherEvents = [];

            for (const item of res.data) {
                if (item.data) {
                    item.data = formatDb(item.data, "Date");
                }

                if (item.ordinamento !== 0) {
                    priorityEvents.push(item);
                } else {
                    otherEvents.push(item);
                }
            }

            priorityEvents.sort((a, b) => a.ordinamento - b.ordinamento);

            res.data = priorityEvents.concat(otherEvents);

            return exits.success({ ...res });
        } catch (err) {
            console.error("Error retrieving eventi:", err);
            return exits.error(err);
        }
    },
};
