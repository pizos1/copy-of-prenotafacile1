const { getDB, query } = require("../db");
const Models = require("../../../config/models/index");

module.exports = {
    delete: async (opts) => {
        let { tenant, table, delete_id, where, id_utente } = opts || {};
        if (!table) throw new Error("Missing table option");
        if (!delete_id && (!where || Object.keys(where).length === 0))
            throw new Error("Missing delete_id or where option");

        const dbName = sails.config.custom.dbName;
        const Model = Models[table] || {};
        const attrs = Model.attributes || {};
        const tableAbbreviation =
            Model.tableAbbreviation || table.substring(0, 1);

        let db;
        if (tenant) {
            const masterDb = await getDB();
            const tenantRows = await masterDb.query(
                "SELECT tenant FROM tenants WHERE id_tenant = ?",
                [tenant],
            );
            if (!tenantRows || tenantRows.length === 0)
                throw new Error(`Tenant ${tenant} non trovato`);
            const tenantName = tenantRows[0].tenant;
            db = await getDB(`${dbName}_${tenantName}`);
        } else {
            db = await getDB();
        }

        const whereClause = [];
        const whereValues = [];

        if (delete_id) {
            let pkAttr = Object.keys(attrs).find(
                (k) =>
                    attrs[k] &&
                    (attrs[k].primaryKey === true || attrs[k].primaryKey),
            );
            if (!pkAttr) {
                pkAttr = "id";
            }
            const column =
                attrs[pkAttr] && attrs[pkAttr].columnName
                    ? attrs[pkAttr].columnName
                    : pkAttr;
            whereClause.push(`${tableAbbreviation}.${column} = ?`);
            whereValues.push(delete_id);
        } else {
            for (const key in where) {
                const column =
                    attrs[key] && attrs[key].columnName
                        ? attrs[key].columnName
                        : key;
                whereClause.push(`${tableAbbreviation}.\`${column}\` = ?`);
                whereValues.push(where[key]);
            }
        }
        if (whereClause.length === 0)
            throw new Error("No valid where conditions provided");

        const sql = `DELETE FROM \`${table}\` AS ${tableAbbreviation} WHERE ${whereClause.join(" AND ")}`;
        try {
            if (tenant) {
                return await query(
                    { id_tenant: tenant, id_utente: id_utente },
                    sql,
                    whereValues,
                );
            }

            return await db.query(sql, whereValues);
        } catch (err) {
            sails.log.error("Error executing delete query: ", err);
            throw err;
        }
    },
};
