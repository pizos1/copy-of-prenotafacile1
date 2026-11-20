const { getDB, query } = require("../db");
const Models = require("../../../config/models/index");

module.exports = {
    create: async (opts = {}) => {
        const { inputs, table, tenant, allowedFields, excludes, id_utente } =
            opts;

        const dbName = sails.config.custom.dbName;

        if (!inputs || !table)
            throw new Error("Missing inputs or table option");

        const Model = Models[table];
        const attrs = Model?.attributes || {};
        const operations = ["calculate", "validate", "formatDb"];

        let targetDb;
        if (tenant) {
            const masterDb = await getDB();
            const tenantRows = await masterDb.query(
                "SELECT tenant FROM tenants WHERE id_tenant = ?",
                [tenant],
            );
            if (!tenantRows?.length)
                throw new Error(`Tenant ${tenant} non trovato`);
            targetDb = await getDB(`${dbName}_${tenantRows[0].tenant}`);
        } else {
            targetDb = await getDB();
        }

        const whiteList =
            Array.isArray(allowedFields) && allowedFields.length > 0
                ? allowedFields
                : null;
        const excluded = Array.isArray(excludes) ? excludes : [];
        const columns = [];
        const placeholders = [];
        const values = [];
        // Escludo i campi non presenti negli attributi del modello o quelli esplicitamente esclusi
        const keysToProcess = whiteList || [
            ...new Set([...Object.keys(inputs), ...Object.keys(attrs)]),
        ];

        for (const key of keysToProcess) {
            const attr = attrs[key] || {};
            if (!attr.type && !attr.columnName) continue;
            if (excluded.includes(key)) continue;

            const colName = attr.columnName || key;
            let valueToProcess = inputs[key];

            for (const op of operations) {
                if (typeof attr[op] !== "function") continue;
                if (op === "validate" && valueToProcess === undefined) continue;

                const result = attr[op](valueToProcess, inputs);
                if (op !== "formatDb" && result === false)
                    throw new Error(`Validation failed for field ${key}`);
                if (result != null && typeof result !== "boolean")
                    valueToProcess = result;
            }

            if (valueToProcess === undefined) continue;
            columns.push(colName);
            placeholders.push("?");
            values.push(valueToProcess);
        }

        if (columns.length === 0) throw new Error("No valid fields to insert");

        // Questo serve perche' potrebbe dare problemi con certe tabelle se contengono -
        const tableName = table.includes("-") ? `\`${table}\`` : table;
        const sql = `INSERT INTO ${tableName} (\`${columns.join("`, `")}\`) VALUES (${placeholders.join(", ")})`;

        if (tenant) {
            const res = await query(
                { id_tenant: tenant, id_utente: id_utente },
                sql,
                values,
            );
            return Number(res.insertId);
        }

        const result = await targetDb.query(sql, values);
        return Number(result.insertId);
    },
};
