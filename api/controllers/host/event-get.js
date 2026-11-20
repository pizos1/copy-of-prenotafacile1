const { find } = require("../../utils/CRUDs/find");
const { formatDb } = require("../../utils/formatDb");

module.exports = {
    inputs: {
        id_evento: { type: "number", required: true },
    },

    exits: {
        success: { description: "Evento trovato" },
        notFound: { statusCode: 404, description: "Evento non trovato" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            const result = await find({
                tenant: this.req.id_tenant,
                table: "eventi",
                tableAbbreviation: "e",
                id_utente: this.req.id_utente,
                where: { "e.id_evento": inputs.id_evento },
                joins: [
                    {
                        table: "comuni",
                        tableAbbreviation: "c",
                        on: "e.id_comune = c.id_comune",
                        select: ["comune", "provincia"],
                    },
                    {
                        table: "eventi-date",
                        tableAbbreviation: "ed",
                        on: "e.id_evento = ed.id_evento",
                        select: ["data", "id_evento-data", "prenotabile"],
                    },
                    {
                        table: "eventi-fasce",
                        tableAbbreviation: "ef",
                        type: "LEFT",
                        on: "ed.`id_evento-data` = ef.`id_evento-data` ",
                        select: [
                            "ora_inizio",
                            "ora_fine",
                            "max_posti",
                            "id_evento-fascia",
                        ],
                    },
                    {
                        table: "allegati",
                        type: "LEFT",
                        tableAbbreviation: "a",
                        on: "e.id_evento = a.id_evento",
                        select: [
                            "allegato",
                            "tipologia_allegato",
                            "id_allegato",
                        ],
                    },
                ],
                orderBy: "ed.data ASC",
            });

            if (!result || !result.data || result.data.length === 0) {
                return exits.notFound({ error: "Evento non trovato" });
            }

            const rawData = result.data;

            const grouped = rawData.reduce((acc, item) => {
                let existingEvent = acc.find((e) => e.id === item.id);

                const isPrenotabile = formatDb(item.prenotabile, "Boolean");

                if (!existingEvent) {
                    const {
                        data,
                        ora_inizio,
                        ora_fine,
                        prenotabile,
                        max_posti,
                        allegato,
                        tipologia_allegato,
                        id_allegato,
                        "id_evento-data": idEd,
                        "id_evento-fascia": idEf,
                        ...cleanItem
                    } = item;

                    existingEvent = {
                        ...cleanItem,
                        date_evento: [],
                        allegati: [],
                    };
                    acc.push(existingEvent);
                }

                const idDataCorrente = item["id_evento-data"];
                let existingDate = existingEvent.date_evento.find(
                    (d) => d.id_date === idDataCorrente,
                );

                const allegatiObj = item.allegato
                    ? {
                          allegato: item.allegato,
                          tipologia_allegato: item.tipologia_allegato,
                          id_allegato: item.id_allegato,
                      }
                    : null;

                if (existingDate && isPrenotabile) {
                    existingDate.prenotabile = isPrenotabile;
                }

                if (!existingDate && idDataCorrente) {
                    existingDate = {
                        id_date: idDataCorrente,
                        data: item.data,
                        prenotabile: isPrenotabile,
                        fasce: [],
                    };
                    existingEvent.date_evento.push(existingDate);
                }

                const idFasciaCorrente = item["id_evento-fascia"];
                if (existingDate && idFasciaCorrente) {
                    const fasciaGiaPresente = existingDate.fasce.some(
                        (f) => f.id_fascia === idFasciaCorrente,
                    );

                    if (!fasciaGiaPresente) {
                        existingDate.fasce.push({
                            id_fascia: idFasciaCorrente,
                            ora_inizio: item.ora_inizio,
                            ora_fine: item.ora_fine,
                            max_posti: item.max_posti,
                        });
                        existingDate.fasce.sort((a, b) =>
                            a.ora_inizio.localeCompare(b.ora_inizio),
                        );
                    }
                }

                if (allegatiObj) {
                    const alreadyExists = existingEvent.allegati.some(
                        (a) => a.allegato === allegatiObj.allegato,
                    );

                    if (!alreadyExists) {
                        existingEvent.allegati.push({
                            allegato: allegatiObj.allegato,
                            tipologia_allegato: allegatiObj.tipologia_allegato,
                            id_allegato: allegatiObj.id_allegato,
                        });
                    }
                }

                return acc;
            }, []);

            result.data = grouped;

            return exits.success({ evento: grouped[0] || null });
        } catch (error) {
            return exits.genericError({ error: error.message || "Error" });
        }
    },
};
