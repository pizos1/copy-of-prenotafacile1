const mysql = require("mysql");
const prepareLogQuery = (opts) => {
    let { sql, params, id_utente, timeStamp } = opts || {};
    const cleanSql = sql.replace(/\s+/g, " ").trim();

    if (/^SELECT\s+\*/i.test(cleanSql) || /^SELECT\s+COUNT/i.test(cleanSql)) {
        return null;
    }

    id_utente = id_utente || 0;
    const dateObj = timeStamp instanceof Date ? timeStamp : new Date();

    const timeStampDB = dateObj
        .toLocaleString("sv-SE", { timeZone: "Europe/Rome" })
        .substring(0, 19);

    let paramsForLog = params || [];
    if (Array.isArray(params)) {
        paramsForLog = params.map((p) => {
            if (p instanceof Date) {
                // formato sv-SE perche' nativamente in formato YYYY-MM-DD HH:mm:ss
                return p
                    .toLocaleString("sv-SE", { timeZone: "Europe/Rome" })
                    .substring(0, 19);
            }
            if (
                cleanSql.toLowerCase().includes("password") &&
                typeof p === "string" &&
                p.length > 100
            ) {
                return "*****";
            }
            return p;
        });
    }

    const formattedParams =
        Array.isArray(paramsForLog) && paramsForLog.length > 0
            ? paramsForLog.join(", ")
            : "none";

    const logSql =
        "INSERT INTO `query_logs` (`id_utente`, `params`, `query`, `correct`, `dateTime`) VALUES (?, ?, ?, ?, ?)";
    const logParams = [id_utente, formattedParams, cleanSql, 0, timeStampDB];

    return { sql: logSql, params: logParams };
};

module.exports = {
    prepareLogQuery,

    updateQuery: async (opts) => {
        let { id_query, correct = 1, tenantDb } = opts || {};
        if (!id_query) {
            sails.log.error("Missing id_query for updateQuery");
            return;
        }
        try {
            const updateSql = mysql.format(
                "UPDATE `query_logs` SET `correct` = ? WHERE `id_log` = ?",
                [correct ? 1 : 0, id_query],
            );
            if (tenantDb && typeof tenantDb.query === "function") {
                await tenantDb.query(updateSql);
            } else {
                await sails.getDatastore().sendNativeQuery(updateSql);
            }
        } catch (err) {
            sails.log.error("Error updating query log: ", err);
        }
    },
};
