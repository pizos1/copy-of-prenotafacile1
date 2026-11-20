const { find } = require("../../utils/CRUDs/find");
const { formatDb } = require("../../utils/formatDb");
const QRGenerator = require("../../utils/QRGenerator");

module.exports = {
    inputs: {
        page: { type: "number" },
        limit: { type: "number" },
        sortingField: { type: "string" },
        sortingDirection: { type: "number" },
    },

    exits: {
        success: {
            description: "Eventi subscriptions retrieved successfully",
        },
        error: {
            description: "Error retrieving eventi subscriptions",
        },
    },

    fn: async function (inputs, exits) {
        try {
            const id_tenant = this.req.id_tenant;
            const id_utente = this.req.id_utente;
            const res = await find({
                tenant: id_tenant,
                table: "eventi-utenti",
                id_utente: id_utente,
                page: inputs.page,
                limit: inputs.limit,
                sortingField: inputs.sortingField,
                sortingDirection: inputs.sortingDirection,
                where: {
                    id_utente: id_utente,
                },
                joins: [
                    {
                        table: "eventi",
                        tableAbbreviation: "e",
                        on: "e.id_evento = eu.id_evento",
                        select: ["titolo"],
                    },
                    {
                        table: "comuni",
                        tableAbbreviation: "c",
                        on: "e.id_comune = c.id_comune",
                        select: ["comune"],
                    },
                    {
                        table: "eventi-fasce",
                        tableAbbreviation: "ef",
                        type: "LEFT",
                        on: "eu.`id_evento-fascia` = ef.`id_evento-fascia`",
                        select: ["ora_inizio", "ora_fine"],
                    },
                    {
                        table: "eventi-date",
                        tableAbbreviation: "ed",
                        on: "ef.`id_evento-data` = ed.`id_evento-data`",
                        select: ["data"],
                    },
                ],
                orderBy: "e.data_inizio",
                excludes: ["id_evento-fascia", "id_utente"],
            });

            for (const item of res.data) {
                const subscriptionQR = await QRGenerator.generateQRCode(
                    item.id_evento,
                    item.QRString,
                );
                item.QRString = subscriptionQR.qrString;
                item.QRBase64 = subscriptionQR.qrBase64;

                if (item.data) {
                    item.data = formatDb(item.data, "Date");
                }

                // formatto presenza_diversamente_abile
                if (item.presenza_diversamente_abile) {
                    item.presenza_diversamente_abile = formatDb(
                        item.presenza_diversamente_abile,
                        "Boolean",
                    );
                }
            }

            return exits.success({ ...res });
        } catch (err) {
            console.error("Error retrieving eventi subscriptions:", err);
            return exits.error(err);
        }
    },
};
