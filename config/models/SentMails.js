const { formatDb } = require("../../api/utils/formatDb");

module.exports = {
    table: "mail_inviate",
    primaryKey: "id",
    tableAbbreviation: "m",

    attributes: {
        id: {
            type: "number",
            autoIncrement: true,
            columnName: "id_mail",
        },
        timestamp: {
            type: "ref",
            columnType: "datetime",
            required: true,
            columnName: "timestamp",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
        mail_ricevitore: {
            type: "string",
            required: true,
            columnName: "mail_ricevitore",
        },
        oggetto: {
            type: "string",
            required: true,
            columnName: "oggetto",
        },
        testo: {
            type: "string",
            required: true,
            columnName: "testo",
        },
    },
};
