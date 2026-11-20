const { getDB, query, pagination } = require("../db");
const _ = require("lodash");
const Models = require("../../../config/models/index");

module.exports = {
    find: async (opts) => {
        const {
            tenant,
            table,
            where,
            joins,
            limit,
            offset,
            orderBy,
            groupBy,
            includePrivates = false,
            excludes,
            id_utente,
            sortingField,
            sortingDirection,
        } = opts;
        // Passo i parametri come opts solo per versatilita' e liberta' dell'ordine durante la chiamata della funzione, solo table e tenant sono necessari

        if (!table || !tenant)
            throw new Error("Missing table or tenant option");

        const operations = ["calculate", "validate", "formatDb"];
        const master = await getDB();
        const tenantRows = await master.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [tenant],
        );
        if (!tenantRows || tenantRows.length === 0)
            throw new Error(`Tenant ${tenant} non trovato`);

        // Trovo il modello corrispondente alla tabella specificata per poter usare i suoi attributi durante la costruzione della query
        const Model = Models[table];
        if (!Model)
            throw new Error(`Model per la tabella ${table} non trovato`);

        // Se presente il campo tableAbbreviation uso quello, altrimenti prendo la prima lettera del nome della tabella
        const tableAbbreviation =
            Model.tableAbbreviation || table.substring(0, 1);
        let attrs = Model.attributes || {};

        const selectColumns = [];

        for (const key of Object.keys(attrs)) {
            const attr = attrs[key];
            const columnName = attr.columnName || key;

            // Filtro gli attributi che non hanno un tipo o una colonna associata, quelli presenti nell'array excludes e quelli marcati come private se includePrivates è false
            if (!attr.type && !attr.columnName) continue;

            if (
                excludes &&
                (excludes.includes(key) || excludes.includes(columnName))
            ) {
                continue;
            }

            if (attr.private && !includePrivates) continue;

            selectColumns.push(
                `${tableAbbreviation}.\`${columnName}\` AS \`${key}\``,
            );
        }

        if (joins && Array.isArray(joins)) {
            joins.forEach((join) => {
                if (join.select && Array.isArray(join.select)) {
                    const jAbbr =
                        join.tableAbbreviation || join.table.substring(0, 1);
                    join.select.forEach((col) => {
                        selectColumns.push(`${jAbbr}.\`${col}\` AS \`${col}\``);
                    });
                }
            });
        }

        const selectClause = selectColumns.join(", ");
        let sql = `SELECT ${selectClause} FROM \`${table}\` AS ${tableAbbreviation}`;
        let countSql = `SELECT COUNT(*) as total FROM \`${table}\` AS ${tableAbbreviation}`;
        const sqlArgs = [];

        if (joins && Array.isArray(joins)) {
            joins.forEach((join) => {
                const jAbbr =
                    join.tableAbbreviation || join.table.substring(0, 1);
                const joinType =
                    join.type?.toUpperCase() === "LEFT"
                        ? "LEFT JOIN"
                        : join.type?.toUpperCase() === "RIGHT"
                          ? "RIGHT JOIN"
                          : "JOIN";
                const joinString = ` ${joinType} \`${join.table}\` AS ${jAbbr} ON ${join.on}`;
                sql += joinString;
                countSql += joinString;
            });
        }

        if (where && Object.keys(where).length > 0) {
            const buildConditions = (whereObj) => {
                return Object.keys(whereObj).map((key) => {
                    const value = whereObj[key];

                    // Caso OR (Ricorsivo)
                    if (key.toLowerCase() === "or" && Array.isArray(value)) {
                        const orConditions = value.map((condition) => {
                            const innerConditions = buildConditions(condition);
                            return `(${innerConditions.join(" AND ")})`;
                        });
                        return `(${orConditions.join(" OR ")})`;
                    }

                    let column;
                    let alias;

                    if (key.includes(".")) {
                        const parts = key.split(".");
                        alias = parts[0];
                        const actualKey = parts[1];
                        column = attrs[actualKey]?.columnName || actualKey;
                    } else {
                        alias = tableAbbreviation;
                        column = attrs[key]?.columnName || key;
                    }

                    if (value && typeof value === "object") {
                        // Caso BETWEEN
                        if (value.Between) {
                            sqlArgs.push(value.Between[0], value.Between[1]);
                            return `\`${alias}\`.\`${column}\` BETWEEN ? AND ?`;
                        }

                        // Caso LIKE
                        if (value.Like) {
                            sqlArgs.push(`%${value.Like}%`);
                            return `\`${alias}\`.\`${column}\` LIKE ?`;
                        }

                        // Caso IN
                        if (value.In && Array.isArray(value.In)) {
                            sqlArgs.push(...value.In);
                            const placeholders = value.In.map(() => "?").join(
                                ", ",
                            );
                            return `\`${alias}\`.\`${column}\` IN (${placeholders})`;
                        }

                        // Caso JSON_CONTAINS
                        if (value.JSON_CONTAINS) {
                            const path = value.JSON_CONTAINS.path || "$";
                            const valToContain =
                                value.JSON_CONTAINS.value !== undefined
                                    ? value.JSON_CONTAINS.value
                                    : value.JSON_CONTAINS;

                            sqlArgs.push(JSON.stringify(valToContain));
                            return `JSON_CONTAINS (\`${alias}\`.\`${column}\`, ?, '${path}')`;
                        }
                    }

                    sqlArgs.push(value);
                    return `\`${alias}\`.\`${column}\` = ?`;
                });
            };

            const conditions = buildConditions(where);
            const whereClause = ` WHERE ${conditions.join(" AND ")}`;
            sql += whereClause;
            countSql += whereClause;
        }

        const countResult = await query(
            { id_tenant: tenant, id_utente },
            countSql,
            sqlArgs,
        );
        const total = countResult[0]?.total || 0;

        if (groupBy) {
            sql += ` GROUP BY ${groupBy}`;
        }

        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }

        if (limit) {
            sql += pagination({
                limit: Number(limit),
                offset: offset ? Number(offset) : undefined,
                sortingField: sortingField,
                sortingDirection: sortingDirection,
            });
        }

        const data = await query(
            { id_tenant: tenant, id_utente },
            sql,
            sqlArgs,
        );

        const result = data.map((row) => {
            for (const key in attrs) {
                const attr = attrs[key];
                if (!attr.type && !attr.columnName) continue;

                let value = row[key];
                for (const op of operations) {
                    if (typeof attr[op] !== "function") continue;
                    if (op === "validate" && value === undefined) continue;

                    const result = attr[op](value, row);
                    if (op !== "formatDb" && result === false)
                        throw new Error(
                            `Validation failed for field ${key} with value ${value}`,
                        );
                    if (result != null && typeof result !== "boolean")
                        value = result;
                }
                row[key] = value;
            }
            return row;
        });

        const page =
            offset !== undefined && limit ? Math.floor(offset / limit) + 1 : 1;
        const totalPages = limit ? Math.ceil(total / limit) : 1;

        return {
            data: result,
            count: total,
            pagination: {
                page,
                limit: limit || total,
                totalPages,
                total,
            },
        };
    },
};
