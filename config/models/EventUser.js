const { formatDb } = require("../../api/utils/formatDb");

module.exports = {
    table: "eventi-utenti",
    primaryKey: "id",
    tableAbbreviation: "eu",

    attributes: {
        id: {
            type: "number",
            autoIncrement: true,
            columnName: "id_evento-utente",
        },
        id_utente: {
            type: "number",
            required: true,
            columnName: "id_utente",
        },
        "id_evento-fascia": {
            type: "number",
            required: true,
            columnName: "id_evento-fascia",
        },
        id_evento: {
            type: "number",
            required: true,
            columnName: "id_evento",
        },
        num_posti_prenotati: {
            type: "number",
            required: true,
            columnName: "num_posti_prenotati",
        },
        QRString: {
            type: "string",
            required: true,
            columnName: "QRString",
            columnType: "varchar(10)",
        },
        note: {
            type: "string",
            columnName: "note",
        },
        presenza_diversamente_abile: {
            type: "number",
            columnName: "presenza_diversamente_abile",
            defaultsTo: 0,
            formatDb: (value) => formatDb(value, "Boolean"),
        },
        reminder_time: {
            type: "ref",
            columnType: "datetime",
            columnName: "reminder_time",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
    },
};
