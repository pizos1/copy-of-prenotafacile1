module.exports = {
    table: "allegati",
    primaryKey: "id",
    tableAbbreviation: "a",

    attributes: {
        id: {
            type: "number",
            autoIncrement: true,
            columnName: "id_allegato",
        },
        id_evento: {
            type: "number",
            required: true,
            columnName: "id_evento",
        },
        allegato: {
            type: "string",
            required: true,
            columnName: "allegato",
        },
        tipologia_allegato: {
            type: "string",
            required: true,
            columnName: "tipologia_allegato",
        },
    },
};
