const moment = require("moment");
const { find } = require("../../utils/CRUDs/find");
const { getDB } = require("../../utils/db");

module.exports = function emailReminder(sails) {
    let timer = null;

    function getTimeLeftToMidnight() {
        const now = moment();
        const nextMidnight = now.clone().add(1, "day").startOf("day");
        return nextMidnight.diff(now);
    }

    function scheduleNextRun() {
        sails.log.info("1");
        const timeLeft = getTimeLeftToMidnight();

        // Pulizia eventuale timer precedente per sicurezza
        if (timer) clearTimeout(timer);

        sails.log.info("2");

        timer = setTimeout(async () => {
            // Chiamata interna al metodo dell'hook
            await sails.hooks.emailreminder.run();
            sails.log.info("3");
        }, timeLeft);
    }

    return {
        async initialize() {
            sails.log.info("Hook emailreminder: initialize() chiamato");
            sails.log.info(
                "Tempo rimanente a mezzanotte:",
                getTimeLeftToMidnight(),
            );

            sails.after("hook:orm:loaded", () => {
                sails.log.info("4");
                sails.log.info("ORM pronto. Avvio scheduler...");
                scheduleNextRun();
            });
        },

        async run() {
            try {
                sails.log.info("5");
                sails.log.info("Esecuzione email reminder...");

                const db = await getDB();
                // Assicurati che db.query restituisca direttamente l'array dei record
                const tenants = await db.query("SELECT * FROM tenants", []);

                sails.log.info("6");

                let reminderList = [];

                for (const tenant of tenants) {
                    const reminders = await find({
                        tenant: tenant.id_tenant,
                        table: "eventi-utenti",
                        joins: [
                            {
                                table: "eventi",
                                tableAbbreviation: "e",
                                on: "e.id_evento = eu.id_evento",
                                select: [
                                    "id_evento",
                                    "data_inizio",
                                    "data_fine",
                                    "titolo",
                                ],
                            },
                        ],
                    });
                    reminderList.push(...reminders);
                }
                sails.log.info("6");

                sails.log.info("Reminder list:", reminderList);

                sails.log.info(`Trovati ${reminderList.length} reminder.`);
                // TODO: Logica invio mail
            } catch (err) {
                sails.log.info("7");
                sails.log.error(
                    "Errore nell'esecuzione dell'email reminder:",
                    err,
                );
            } finally {
                sails.log.info("8");
                // Riprogramma la corsa per la mezzanotte successiva
                scheduleNextRun();
            }
        },
    };
};
