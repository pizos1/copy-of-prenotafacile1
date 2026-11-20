const { formatDb } = require("../../api/utils/formatDb");

module.exports = {
    tableName: "eventi-date",
    primaryKey: "id",
    tableAbbreviation: "ed",

    attributes: {
        id: {
            type: "number",
            autoIncrement: true,
            columnName: "id_evento-data",
        },
        id_evento: {
            type: "number",
            required: true,
            columnName: "id_evento",
        },
        data: {
            type: "ref",
            columnType: "date",
            columnName: "data",
            required: true,
            formatDb: (value) => formatDb(value, "Date"),
        },
        ora_inizio: {
            type: "ref",
            columnType: "time",
            columnName: "ora_inizio",
            formatDb: (value) => formatDb(value, "Time"),
        },
        ora_fine: {
            type: "ref",
            columnType: "time",
            columnName: "ora_fine",
            formatDb: (value) => formatDb(value, "Time"),
        },
        prenotabile: {
            type: "number",
            columnName: "prenotabile",
            defaultsTo: 0,
            formatDb: (value) => formatDb(value, "Boolean"),
        },
        data_inizio_prenotazione: {
            type: "ref",
            columnType: "datetime",
            columnName: "data_inizio_prenotazione",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
        data_fine_prenotazione: {
            type: "ref",
            columnType: "datetime",
            columnName: "data_fine_prenotazione",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
        caparra: {
            type: "number",
            columnName: "caparra",
        },
    },
    afterFind: function (records, cb) {
        let results = Array.isArray(records) ? records : [records];

        results.forEach((record) => {
            if (!record) return;

            let val = record.prenotabile;

            if (val === null || val === undefined) {
                record.prenotabile = false;
            } else if (Buffer.isBuffer(val)) {
                record.prenotabile = val[0] === 1;
            } else if (
                typeof val === "object" &&
                val.type === "Buffer" &&
                val.data
            ) {
                record.prenotabile = val.data[0] === 1;
            } else if (typeof val === "number") {
                record.prenotabile = val === 1;
            } else if (typeof val === "string") {
                record.prenotabile = val === "1" || val.charCodeAt(0) === 1;
            } else {
                record.prenotabile = !!val;
            }
        });

        if (cb) return cb();
        return records;
    },
};
