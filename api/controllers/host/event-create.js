const { create } = require("../../utils/CRUDs/create");
const { formatDb } = require("../../utils/formatDb");

module.exports = {
    inputs: {
        titolo: { type: "string", required: true },
        id_comune: { type: "number", required: true },
        id_tenant: { type: "number", required: true, private: true },
        id_host: { type: "number", required: true },
        descrizione: { type: "string" },
        logo: { type: "string" },
        dates: { type: "json", required: true },
        allegati: { type: "json" },
        tipologie_allegato: { type: "json" },
        codice_menu: { type: "string" },
        caparra: { type: "number" },
        ora_inizio: { type: "ref" },
        ora_fine: { type: "ref" },
        max_posti: { type: "number" },
        ordinamento: { type: "number" },
    },

    exits: {
        success: { description: "Evento creato" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        const {
            id_tenant,
            titolo,
            id_comune,
            dates,
            descrizione = "",
            logo: url_logo,
            allegati = [],
            tipologie_allegato,
            caparra,
            codice_menu,
            ordinamento,
        } = inputs;
        const { id_utente } = this.req;

        const tipologie = Array.isArray(tipologie_allegato)
            ? tipologie_allegato
            : Array(allegati.length).fill(tipologie_allegato);

        // Inizializzo le date di inizio e date di fine come ordine mandato da frontend
        let earliest = new Date(dates[0].data_inizio);
        let latest = new Date(dates[0].data_fine);

        // controllo ogni data, e se trovo una data di inizio precedente alla data di inizio attuale, aggiorno la data di inizio, e se trovo una data di fine successiva alla data di fine attuale, aggiorno la data di fine
        for (const item of dates) {
            const startDate = new Date(item.data_inizio);
            const endDate = new Date(item.data_fine);

            if (isNaN(startDate.getTime()) || startDate < earliest) {
                earliest = startDate;
            }
            if (isNaN(endDate.getTime()) || endDate > latest) {
                latest = endDate;
            }
        }

        const data_inizio = earliest;
        const data_fine = latest;

        if (!Array.isArray(dates) || dates.length === 0) {
            return exits.genericError({
                error: "dates array is required and must not be empty",
            });
        }

        try {
            // Inserimento evento con i dati principali, prendo l'id_evento generato per inserire le date nella tabella eventi-date
            const id_evento = await create({
                table: "eventi",
                tenant: id_tenant,
                id_utente: this.req.id_utente,
                inputs: {
                    id_host: id_utente,
                    titolo: titolo,
                    id_comune: id_comune,
                    data_inizio: data_inizio,
                    data_fine: data_fine,
                    descrizione,
                    logo: url_logo || "url_logo",
                    codice_menu: codice_menu || null,
                    caparra: caparra,
                    ordinamento: ordinamento || 0,
                },
            });

            for (let i = 0; i < allegati.length; i++) {
                await create({
                    table: "allegati",
                    tenant: id_tenant,
                    id_utente: this.req.id_utente,
                    inputs: {
                        id_evento: id_evento,
                        allegato: allegati[i],
                        tipologia_allegato: tipologie[i],
                    },
                });
            }

            for (const item of dates) {
                // Itero sull'array delle date dell'evento per inserire ogni data nella tabella eventi-date, collegandola all'id_evento generato precedentemente
                const data_inizio_raw = new Date(item.data_inizio);
                const data_fine_raw = new Date(item.data_fine);
                const data_inizio = formatDb(item.data_inizio, "Date");

                const pad = (n) => String(n).padStart(2, "0");
                const getTimeStr = (d) =>
                    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

                const ora_inizio = item.ora_inizio
                    ? formatDb(item.ora_inizio, "Time")
                    : getTimeStr(data_inizio_raw);
                const ora_fine = item.ora_fine
                    ? formatDb(item.ora_fine, "Time")
                    : getTimeStr(data_fine_raw);

                const id_evento_data = await create({
                    table: "eventi-date",
                    tenant: id_tenant,
                    id_utente: this.req.id_utente,
                    inputs: {
                        id_evento,
                        data: data_inizio,
                        ora_inizio: ora_inizio,
                        ora_fine: ora_fine,
                        prenotabile: item.prenotabile ? 1 : 0,
                        id_utente: this.req.id_utente,
                        data_inizio_prenotazione:
                            item.data_inizio_prenotazione || null,
                        data_fine_prenotazione:
                            item.data_fine_prenotazione || null,
                        caparra:
                            item.caparra ||
                            (caparra !== undefined ? caparra : 0),
                        ordinamento: item.ordinamento || ordinamento || 0,
                    },
                });

                const fasce = item.fasce || [];
                for (const fascia of fasce) {
                    await create({
                        table: "eventi-fasce",
                        tenant: id_tenant,
                        id_utente: this.req.id_utente,
                        inputs: {
                            id_evento,
                            "id_evento-data": id_evento_data,
                            ora_inizio: fascia.ora_inizio,
                            ora_fine: fascia.ora_fine,
                            max_posti: fascia.max_posti || null,
                        },
                    });
                }

                if (fasce.length === 0 && item.ora_inizio && item.ora_fine) {
                    await create({
                        table: "eventi-fasce",
                        tenant: id_tenant,
                        id_utente: this.req.id_utente,
                        inputs: {
                            id_evento,
                            "id_evento-data": id_evento_data,
                            ora_inizio: item.ora_inizio,
                            ora_fine: item.ora_fine,
                            max_posti: item.max_posti || null,
                        },
                    });
                }
            }

            return exits.success({ id_evento, status: true });
        } catch (err) {
            return exits.genericError({ error: err.message });
        }
    },
};
