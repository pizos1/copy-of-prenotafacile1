const { find, create, update } = require("../../utils/CRUDs/index");
const QRGenerator = require("../../utils/QRGenerator");
const PDFGenerator = require("../../utils/PDFGenerator");
const { formatDb } = require("../../utils/formatDb");

module.exports = {
    inputs: {
        prenotazione_id: {
            type: "number",
            required: true,
        },
        numero_posti: {
            type: "number",
            required: true,
        },
        note: {
            type: "string",
        },
        presenza_diversamente_abile: {
            type: "number",
            required: true,
        },
        reminder_time: {
            type: "ref",
        },
    },

    exits: {
        success: {
            description: "Prenotazione salvata con successo",
        },
        error: {
            description: "Errore nel salvataggio della prenotazione",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const id_tenant = this.req.id_tenant;
            const id_utente = this.req.id_utente;
            const {
                prenotazione_id,
                numero_posti,
                note,
                presenza_diversamente_abile,
                reminder_time,
            } = inputs;

            const checkPrenotazione = await find({
                tenant: id_tenant,
                table: "eventi-utenti",
                where: {
                    "id_evento-fascia": prenotazione_id,
                    id_utente: id_utente,
                },
            });

            if (checkPrenotazione.data.length > 0) {
                return exits.error(new Error("Prenotazione già esistente"));
            }

            const evento = await find({
                tenant: id_tenant,
                table: "eventi-fasce",
                joins: [
                    {
                        type: "LEFT",
                        table: "eventi-date",
                        tableAbbreviation: "ed",
                        on: "ef.id_evento = ed.id_evento",
                        select: ["data"],
                    }
            ],
                where: {
                    "id_evento-fascia": prenotazione_id,
                },
            });

            if (evento.data[0].max_posti < numero_posti) {
                return exits.error(new Error("Numero di posti insufficiente"));
            }

            const qrIscrizione = await QRGenerator.generateQRCode(
                evento.data[0].id_evento,
            );

            const newPrenotazione = await create({
                tenant: id_tenant,
                table: "eventi-utenti",
                id_utente,
                inputs: {
                    "id_evento-fascia": prenotazione_id,
                    id_utente: id_utente,
                    id_evento: evento.data[0].id_evento,
                    num_posti_prenotati: numero_posti,
                    QRString: qrIscrizione.qrString,
                    note: note,
                    presenza_diversamente_abile: presenza_diversamente_abile
                        ? 1
                        : 0,
                    reminder_time: (() => {
                        if (reminder_time) {
                            return formatDb(reminder_time, "DateTime");
                        }
                        if (evento.data[0].data) {
                            const eventDate = new Date(evento.data[0].data);
                            eventDate.setDate(eventDate.getDate() - 1);
                            return formatDb(eventDate, "DateTime");
                        }
                        return null;
                    })(),
                },
            });

            // Modifico il numero di posti prenotati dell'evento
            await update({
                tenant: id_tenant,
                table: "eventi-fasce",
                id_utente,
                where: {
                    "id_evento-fascia": evento.data[0].id,
                },
                inputs: {
                    max_posti: evento.data[0].max_posti - numero_posti,
                },
            });

            return exits.success({ status: true, newPrenotazione });
        } catch (error) {
            return exits.error(error);
        }
    },
};
