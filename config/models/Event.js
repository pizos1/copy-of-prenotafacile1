const { formatDb } = require("../../api/utils/formatDb");

module.exports = {
    table: "eventi",
    primaryKey: "id",
    tableAbbreviation: "e",

    attributes: {
        id: {
            type: "number",
            autoIncrement: true,
            columnName: "id_evento",
        },
        id_comune: {
            type: "number",
            required: true,
            columnName: "id_comune",
        },
        titolo: {
            type: "string",
            required: true,
            columnName: "titolo",
        },
        descrizione: {
            type: "string",
            columnName: "descrizione",
        },
        data_inizio: {
            type: "ref",
            columnType: "datetime",
            required: true,
            columnName: "data_inizio",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
        data_fine: {
            type: "ref",
            columnType: "datetime",
            required: true,
            columnName: "data_fine",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
        codice_menu: {
            type: "string",
            columnName: "codice_menu",
        },
        logo: {
            type: "string",
            columnName: "logo",
        },
        id_host: {
            type: "number",
            required: true,
            columnName: "id_host",
        },
        ordinamento: {
            type: "number",
            columnName: "ordinamento",
        },
    },
};
