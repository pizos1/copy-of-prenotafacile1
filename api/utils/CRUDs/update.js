const { getDB, query } = require("../db");
const Models = require("../../../config/models/index");

module.exports = {
    update: async (opts) => {
        const { tenant, table, where, inputs, allowedFields, id_utente } = opts;
        if (!table || !where || !inputs)
            throw new Error("Missing table, tenant, where or values option");

        const dbName = sails.config.custom.dbName;
        const masterDb = await getDB();
        let tenantRows = null;
        let tenantName = null;

        if (tenant !== null && tenant !== undefined) {
            tenantRows = await masterDb.query(
                "SELECT * FROM tenants WHERE id_tenant = ?",
                [tenant],
            );
            if (!tenantRows || tenantRows.length === 0)
                throw new Error(`Tenant ${tenant} non trovato`);
            tenantName = tenantRows[0].tenant;
        }

        const db = tenantName
            ? await getDB(`${dbName}_${tenantName}`)
            : masterDb;
        const Model = Models[table] || {};
        const attrs = Model.attributes || {};
        const operations = ["calculate", "validate", "formatDb"];

        let whitelist = null;
        if (Array.isArray(allowedFields) && allowedFields.length) {
            whitelist = allowedFields;
        } else if (Object.keys(attrs).length) {
            whitelist = Object.keys(attrs);
        }

        const finalUpdates = {};
        for (const key in inputs) {
            const attrDef = attrs[key];
            const isPhysicalColumn =
                attrDef && (attrDef.type || attrDef.columnName);
            const isPrivate = attrDef && attrDef.private;
            const isAllowed = !whitelist || whitelist.includes(key);

            if (!isPhysicalColumn || !isAllowed || inputs[key] === undefined) {
                continue;
            }

            const dbCol = attrDef.columnName || key;
            let valueToUpdate = inputs[key];

            for (const op of operations) {
                if (typeof attrs[key]?.[op] === "function") {
                    const result = attrs[key][op](valueToUpdate, inputs);
                    if (result === false) {
                        throw new Error(`Validation failed for field ${key}`);
                    }

                    if (
                        result !== undefined &&
                        result !== null &&
                        typeof result !== "boolean"
                    ) {
                        valueToUpdate = result;
                    }
                }
            }
            finalUpdates[dbCol] = valueToUpdate;
        }

        if (Object.keys(finalUpdates).length === 0) {
            throw new Error("No valid fields provided for update");
        }

        const setClause = Object.keys(finalUpdates)
            .map((k) => `${k} = ?`)
            .join(", ");
        const updateValues = Object.values(finalUpdates);

        const whereKeys = Object.keys(where);
        if (whereKeys.length === 0)
            throw new Error("Where clause cannot be empty");

        const whereClause = whereKeys
            .map((k) => {
                const attr = attrs[k];
                const colName = attr && attr.columnName ? attr.columnName : k;
                return `\`${colName}\` = ?`;
            })
            .join(" AND ");
        const whereValues = whereKeys.map((k) => where[k]);

        const params = [...updateValues, ...whereValues];
        const queryStr = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`;

        if (!tenantName) {
            return await masterDb.query(queryStr, params);
        } else {
            const opt = {
                id_tenant: tenant !== undefined ? tenant : null,
                id_utente: id_utente,
            };
            return await query(opt, queryStr, params);
        }
    },
};
