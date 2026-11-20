const { formatDb } = require("../../api/utils/formatDb");

module.exports = {
    table: "eventi-fasce",
    primaryKey: "id",
    tableAbbreviation: "ef",

    attributes: {
        id: {
            type: "number",
            autoIncrement: true,
            columnName: "id_evento-fascia",
        },
        id_evento: {
            type: "number",
            required: true,
            columnName: "id_evento",
        },
        "id_evento-data": {
            type: "number",
            required: true,
            columnName: "id_evento-data",
        },
        ora_inizio: {
            type: "string",
            columnType: "time",
            columnName: "ora_inizio",
            formatDb: (value) => formatDb(value, "Time"),
        },
        ora_fine: {
            type: "string",
            columnType: "time",
            columnName: "ora_fine",
            formatDb: (value) => formatDb(value, "Time"),
        },
        max_posti: {
            type: "number",
            columnName: "max_posti",
        },
    },
};
