const { find } = require("../../utils/CRUDs/find");
const { formatDb } = require("../../utils/formatDb");

module.exports = {
    inputs: {
        page: { type: "number" },
        limit: { type: "number" },
        sortingField: { type: "string" },
        sortingDirection: { type: "number" },
    },

    exits: {
        success: { description: "Eventi retrieved successfully" },
        error: { description: "Error retrieving eventi" },
    },

    fn: async function (inputs, exits) {
        try {
            const id_tenant = this.req.id_tenant;
            const res = await find({
                tenant: id_tenant,
                table: "eventi",
                page: inputs.page,
                limit: inputs.limit,
                sortingField: inputs.sortingField,
                sortingDirection: inputs.sortingDirection,
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
                        ],
                    },
                    {
                        table: "eventi-fasce",
                        tableAbbreviation: "ef",
                        type: "LEFT",
                        on: "ed.`id_evento-data` = ef.`id_evento-data`",
                        select: [
                            "ora_inizio",
                            "ora_fine",
                            "max_posti",
                            "id_evento-fascia",
                        ],
                    },
                ],
                orderBy: "e.data_inizio",
            });

            const raw_data = res.data ?? [];

            // grouping livello js, perche il group by non funziona come voglio
            const grouped_events = raw_data.reduce((acc, item) => {
                const eventId = item.id;
                let existingEvent = acc.find((e) => e.id === eventId);

                const fascia =
                    item.ora_inizio || item.ora_fine
                        ? {
                              "id_evento-fascia": item["id_evento-fascia"],
                              ora_inizio: item.ora_inizio,
                              ora_fine: item.ora_fine,
                              max_posti: item.max_posti,
                          }
                        : null;

                const dataStr = formatDb(item.data, "Date");

                if (existingEvent) {
                    // Cerchiamo se la data esiste gia'
                    const existingDate = existingEvent.date_evento.find(
                        (d) => d["id_evento-data"] === item["id_evento-data"],
                    );

                    if (existingDate) {
                        if (fascia) {
                            const fasciaExists = existingDate.fasce.some(
                                (f) =>
                                    f["id_evento-fascia"] ===
                                    fascia["id_evento-fascia"],
                            );
                            if (!fasciaExists) existingDate.fasce.push(fascia);
                        }
                    } else {
                        existingEvent.date_evento.push({
                            data: dataStr,
                            "id_evento-data": item["id_evento-data"],
                            fasce: fascia ? [fascia] : [],
                        });
                    }
                } else {
                    const {
                        data,
                        ora_inizio,
                        ora_fine,
                        max_posti,
                        "id_evento-data": idEd,
                        "id_evento-fascia": idEf,
                        ...cleanItem
                    } = item;

                    acc.push({
                        ...cleanItem,
                        data_inizio: formatDb(
                            cleanItem.data_inizio,
                            "DateTime",
                        ),
                        data_fine: formatDb(cleanItem.data_fine, "DateTime"),
                        date_evento: [
                            {
                                data: dataStr,
                                "id_evento-data": idEd,
                                fasce: fascia ? [fascia] : [],
                            },
                        ],
                    });
                }
                return acc;
            }, []);

            res.data = grouped_events;
            return exits.success({ ...res });
        } catch (err) {
            console.error("Error retrieving eventi:", err);
            return exits.error(err);
        }
    },
};
