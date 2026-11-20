const { find, customDelete, update } = require("../../utils/CRUDs/index");

module.exports = {
    inputs: {
        prenotazione_id: {
            type: "number",
            required: true,
        },
    },

    exits: {
        success: {
            description: "Prenotazione cancellata con successo",
        },
        error: {
            description: "Errore nella cancellazione della prenotazione",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const id_tenant = this.req.id_tenant;
            const id_utente = this.req.id_utente;
            const { prenotazione_id } = inputs;

            const res = await find({
                tenant: id_tenant,
                table: "eventi-utenti",
                where: {
                    "id_evento-utente": prenotazione_id,
                    id_utente: id_utente,
                },
            });

            if (res.data.length === 0) {
                return exits.error(new Error("Prenotazione non trovata"));
            }

            const evento = await find({
                tenant: id_tenant,
                table: "eventi-fasce",
                where: {
                    "id_evento-fascia": res.data[0]["id_evento-fascia"],
                },
            });

            await update({
                tenant: id_tenant,
                table: "eventi-fasce",
                id_utente,
                where: {
                    "id_evento-fascia": res.data[0]["id_evento-fascia"],
                },
                inputs: {
                    max_posti:
                        evento.data[0].max_posti +
                        res.data[0].num_posti_prenotati,
                },
            });

            const deletePrenotazione = await customDelete({
                tenant: id_tenant,
                table: "eventi-utenti",
                where: {
                    "id_evento-utente": prenotazione_id,
                    id_utente: id_utente,
                },
            });

            if (deletePrenotazione.affectedRows === 0) {
                return exits.error(new Error("Prenotazione non trovata"));
            }
            return exits.success({ status: true });
        } catch (error) {
            return exits.error(error);
        }
    },
};
