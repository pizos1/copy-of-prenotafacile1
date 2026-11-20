const {
    find,
    update,
    create,
    customDelete,
} = require("../../utils/CRUDs/index");

module.exports = {
    inputs: {
        id_evento: {
            type: "number",
            required: true,
        },
        data: {
            type: "string",
        },
        id_evento_data: {
            type: "number",
        },
        titolo: {
            type: "string",
        },
        descrizione: {
            type: "string",
        },
        id_comune: {
            type: "number",
        },
        data_inizio: {
            type: "ref",
            columnType: "datetime",
        },
        data_fine: {
            type: "ref",
            columnType: "datetime",
        },
        ora_inizio: {
            type: "ref",
            columnType: "time",
        },
        ora_fine: {
            type: "ref",
            columnType: "time",
        },
        max_posti: {
            type: "number",
        },
        fasce: {
            type: "json",
        },
        allegati: {
            type: "json",
        },
    },

    exits: {
        success: {
            description: "Evento aggiornato",
        },
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const {
                id_evento,
                titolo,
                descrizione,
                id_comune,
                id_evento_data,
                data_inizio,
                data_fine,
                fasce,
                allegati,
            } = inputs;

            const id_tenant = this.req.id_tenant;
            const id_utente = this.req.id_utente;

            await update({
                tenant: id_tenant,
                id_utente,
                table: "eventi",
                where: { id: id_evento || 1 },
                inputs: { titolo, descrizione, id_comune },
            });

            // Handle allegati
            if (allegati && Array.isArray(allegati)) {
                // Get existing allegati for this event
                const existingResult = await find({
                    tenant: id_tenant,
                    table: "allegati",
                    where: { id_evento },
                });
                const existingAllegati = existingResult.data || [];

                const existingIds = new Set(
                    existingAllegati.map((a) => a.id).filter(Boolean),
                );
                const receivedIds = new Set(
                    allegati
                        .filter((a) => a.id_allegato)
                        .map((a) => a.id_allegato),
                );

                // Delete removed allegati
                for (const existing of existingAllegati) {
                    if (existing.id && !receivedIds.has(existing.id)) {
                        await customDelete({
                            tenant: id_tenant,
                            table: "allegati",
                            where: { id: existing.id },
                        });
                    }
                }

                // Update or create allegati
                for (const allegato of allegati) {
                    if (allegato.id_allegato) {
                        // Update existing
                        await update({
                            tenant: id_tenant,
                            id_utente,
                            table: "allegati",
                            where: { id: allegato.id_allegato },
                            inputs: {
                                allegato: allegato.allegato,
                                tipologia_allegato: allegato.tipologia_allegato,
                            },
                        });
                    } else {
                        // Create new
                        await create({
                            tenant: id_tenant,
                            id_utente,
                            table: "allegati",
                            inputs: {
                                id_evento,
                                allegato: allegato.allegato,
                                tipologia_allegato: allegato.tipologia_allegato,
                            },
                        });
                    }
                }
            }

            if (id_evento_data) {
                const dataPayload = {};
                if (data_inizio) dataPayload.data = data_inizio;
                if (data_fine) dataPayload.data_fine = data_fine;

                if (Object.keys(dataPayload).length > 0) {
                    await update({
                        tenant: id_tenant,
                        id_utente,
                        table: "eventi-date",
                        where: { id: id_evento_data },
                        inputs: dataPayload,
                    });
                }

                if (fasce && Array.isArray(fasce)) {
                    for (const fascia of fasce) {
                        const idFascia = fascia["id_evento-fascia"];

                        const fasciaPayload = {
                            ora_inizio: fascia.ora_inizio,
                            ora_fine: fascia.ora_fine,
                            max_posti: fascia.max_posti,
                        };

                        if (idFascia) {
                            await update({
                                tenant: id_tenant,
                                id_utente,
                                table: "eventi-fasce",
                                where: { id: idFascia },
                                inputs: fasciaPayload,
                            });
                        }
                    }
                }
            }

            return exits.success({ status: true });
        } catch (error) {
            return exits.genericError({ error: error.message });
        }
    },
};
