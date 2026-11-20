const { find } = require("../../utils/CRUDs/find");
const { formatDb } = require("../../utils/formatDb");

module.exports = {
    inputs: {},

    exits: {
        success: { description: "Eventi recuperati con successo" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            const id_utente = this.req.id_utente;
            const res = await find({
                tenant: this.req.id_tenant ?? 1,
                table: "eventi",
                id_utente: id_utente,
                where: { id_host: id_utente },
                joins: [
                    {
                        type: "LEFT",
                        table: "comuni",
                        tableAbbreviation: "c",
                        on: "e.id_comune = c.id_comune",
                        select: ["comune"],
                    },
                    {
                        type: "LEFT",
                        table: "allegati",
                        tableAbbreviation: "a",
                        on: "e.id_evento = a.id_evento",
                        select: ["allegato", "tipologia_allegato"],
                    },
                ],
                orderBy: "e.data_inizio ASC, a.id_allegato ASC",
                sortingField: "titolo",
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
                        allegati: [],
                    };
                    delete existingEvent.data;
                    delete existingEvent.data_inizio_prenotazione;
                    delete existingEvent.data_fine_prenotazione;
                    delete existingEvent.ordinamento;

                    acc.push(existingEvent);
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

            return exits.success({ ...res });
        } catch (error) {
            return exits.genericError({ error: error.message || "Error" });
        }
    },
};
