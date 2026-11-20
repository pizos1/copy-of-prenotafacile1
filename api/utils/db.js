const sails = require("sails");
const passport = require("passport");
const mariadb = require("mariadb");
const _ = require("lodash");

const dbs = {};

let cachedDbUrl = null;
const getDbUrl = () => {
    if (cachedDbUrl) return cachedDbUrl;
    try {
        const local = require("../../config/local");
        cachedDbUrl = local.datastores.default.url;
    } catch (e) {}
    if (!cachedDbUrl) {
        cachedDbUrl = sails.config.datastores.default.url;
    }
    return cachedDbUrl;
};

const getDB = async (req) => {
    const db_config = {
        user: sails.config.custom.dbUser,
        password: sails.config.custom.dbPassword,
    };
    const db_url = getDbUrl();
    if (db_url) {
        let connection = db_url.split("@")[0];
        connection = connection.split("//")[1];
        let parts = connection.split(":");
        db_config.user = parts[0];
        db_config.password = parts[1];
    }

    let db_code = req ? req : sails.config.custom.dbName;

    if (dbs[db_code]) return dbs[db_code];

    const pool = mariadb.createPool({
        host: "localhost",
        user: db_config.user,
        password: db_config.password,
        database: db_code,
    });

    dbs[db_code] = pool;

    return pool.getConnection();
};

const query = async (opt, query_str, params) => {
    const { prepareLogQuery, updateQuery } = require("./logger");
    let db = null;

    if (!opt || !opt.id_tenant) {
        opt.id_tenant = 1;
    }
    if (opt && opt.id_tenant) {
        const master = await getDB();
        const tenant = await master.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [opt.id_tenant],
        );

        if (!tenant || tenant.length === 0) throw new Error("Tenant not found");
        const tenant_name = sails.config.custom.dbName + "_" + tenant[0].tenant;

        if (tenant[0].tenant && dbs[tenant_name]) {
            db = dbs[tenant_name];
        } else {
            const db_config = {
                user: sails.config.custom.dbUser,
                password: sails.config.custom.dbPassword,
            };
            const db_url = getDbUrl();
            if (db_url) {
                let connection = db_url.split("@")[0];
                connection = connection.split("//")[1];
                let parts = connection.split(":");
                db_config.user = parts[0];
                db_config.password = parts[1];
            }

            const pool = mariadb.createPool({
                host: "localhost",
                user: db_config.user,
                password: db_config.password,
                database: tenant_name,
            });

            dbs[tenant_name] = pool;

            db = pool;
        }
    }

    let logId = null;
    try {
        const logData = prepareLogQuery({
            sql: query_str,
            params: params,
            id_utente: opt.id_utente,
            timeStamp: new Date(),
            tenantDb: opt.id_tenant,
        });
        if (logData) {
            const result = await db.query(logData.sql, logData.params);
            logId = result.insertId;
        }
    } catch (err) {
        sails.log.error("Error logging query: ", err);
    }

    try {
        const data = await db.query(query_str, params);
        if (logId) {
            await updateQuery({ id_query: logId, correct: 1, tenantDb: db });
        }
        return data;
    } catch (err) {
        if (logId) {
            await updateQuery({ id_query: logId, correct: 0, tenantDb: db });
        }
        sails.log.error("Error executing query:", err);
        throw err;
    }
};

const pagination = ({
    page = 0,
    limit = 10,
    sortingFiled,
    sortingDirection,
}) => {
    const offset = page * limit;
    let str = "";

    str += ` LIMIT ${limit} OFFSET ${offset}`;
    if (sortingFiled)
        str = ` ORDER BY ${sortingFiled} ${sortingDirection} ` + str;

    return str;
};

// opt: contiene l'id del tenant { id_tenant }
const insert = async (opt, table, data) => {
    const cols = [];
    const params = [];
    const preParams = [];
    _.each(data, (value, key) => {
        cols.push(key);
        params.push(value);
        preParams.push("?");
    });
    const queryStr = `INSERT INTO ${table}(${cols.join(", ")}) VALUES (${preParams.join(", ")})`;
    const res = await query(opt, queryStr, params);

    return res.insertId;
};

const find = async (opt, table, data, joins, opts) => {
    const cols = [];
    const params = [];
    const paginationData = _.pick(data, ["page", "limit"]);
    let filter = _.pick(data, ["filter"]);

    let select = [table[0] + ".*"];
    let dettagli = [];
    let having = [];
    let having_params = [];
    let groupByStr = null;
    let havingStr = null;

    if (joins && joins.length) {
        _.each(joins, (join) => {
            select.push(join[0]);
        });
    }

    if (opts && opts.details) {
        // 1️⃣ Prendere tutti i dettagli per costruire le colonne dinamiche
        dettagli = await query(
            opt,
            `SELECT dettaglio FROM dettagli_${table.split(" ")[0]}`,
        );
        dettagli = _.map(dettagli, "dettaglio");
        const cols = dettagli
            .map(
                (d) =>
                    `MAX(CASE WHEN d.dettaglio = '${d}' THEN ud.valore END) AS \`${d}\``,
            )
            .join(", ");
        select = _.concat(select, cols);

        // 2️⃣ Aggiungere la JOIN con la tabella dei dettagli
        joins = _.concat(joins || [], [
            [
                null,
                `LEFT JOIN ${table.split(" ")[0]}_dettagli ud ON ud.${opts.details[0]} = ${table.split(" ")[1]}.${opts.details[0]}`,
            ],
            [
                null,
                `LEFT JOIN dettagli_${table.split(" ")[0]} d ON d.${opts.details[1]} = ud.${opts.details[1]}`,
            ],
        ]);

        // 3️⃣ Raggruppare per l'ID dell'articolo
        groupByStr = `${table.split(" ")[1]}.${opts.details[0]}`;
    }

    if (_.has(filter, "filter")) {
        if (_.isString(filter.filter)) filter = JSON.parse(filter.filter);
        else filter = filter.filter;
    }

    _.each(filter, (value, key) => {
        if (dettagli.indexOf(key) > -1) {
            if (value !== "") {
                having.push(
                    `MAX(CASE WHEN d.dettaglio='${key}' THEN ud.valore END) = ?`,
                );
                having_params.push(value);
            }
        } else {
            if (value !== "") {
                cols.push(key);
                if (key.indexOf("id_") === 0) params.push(value);
                else params.push(`%${value}%`);
            }
        }
    });

    if (having.length) {
        havingStr = having.join(" AND ");
        havingStr = ` HAVING ${havingStr} `;
    }

    let queryStr = `SELECT ${select.join(", ")} FROM ${table}`;
    if (joins && joins.length) {
        _.each(joins, (join) => {
            if (join[1]) queryStr += ` ${join[1]}`;
        });
    }

    let countStr = `SELECT ${groupByStr ? `${table.split(" ")[1]}.*` : `count(*) as count`} FROM ${table}`;
    if (joins && joins.length) {
        _.each(joins, (join) => {
            countStr += ` ${join[1]}`;
        });
    }

    let where = "";
    if (params.length) {
        where = _.map(cols, (col) => {
            if (col.indexOf("id_") === 0) {
                return `${col} = ?`;
            }
            return `${col} like ?`;
        }).join(" AND ");

        queryStr += " WHERE " + where;
        countStr += " WHERE " + where;
    }

    // aggiungo i parametri per l'having
    if (having_params.length) {
        params.push(...having_params);
    }
    if (groupByStr) {
        queryStr += ` GROUP BY ${groupByStr} `;
        countStr += ` GROUP BY ${groupByStr} `;
    }
    if (havingStr) {
        queryStr += havingStr;
        countStr += havingStr;
    }
    if (groupByStr) {
        countStr = `SELECT COUNT(*) AS count FROM (${countStr}) t`;
    }

    queryStr += pagination(paginationData);

    const res = await query(opt, queryStr, params);
    const count = await query(opt, countStr, params);

    return { data: res, count: Number(count[0].count) };
};

const findOne = async (opt, table, data) => {
    const res = await find(opt, table, data);

    return res.data[0];
};

const update = async (opt, table, filter, data) => {
    const res = await findOne(opt, table, { filter });

    if (!res) return { error: "missing_user" };
    const params = [];

    const updateStr = _.map(data, (val, key) => {
        params.push(val);
        return `${key} = ?`;
    }).join(", ");

    const filterStr = _.map(filter, (val, key) => {
        params.push(val);
        return `${key} = ?`;
    }).join(" AND ");

    let queryStr = `UPDATE ${table} SET ${updateStr} WHERE ${filterStr}`;

    await query(opt, queryStr, params);

    return true;
};

const deleteEntry = async (opt, table, filter) => {
    let queryStr = `DELETE FROM ${table}`;
    let where = "";
    const params = [];

    if (_.keys(filter).length) {
        where = _.map(filter, (value, col) => {
            params.push(value);
            return `${col} = ?`;
        }).join(" AND ");

        queryStr += " WHERE " + where;
    } else {
        return { error: "missing_delete_filter" };
    }

    await query(opt, queryStr, params);

    return true;
};

module.exports = {
    getDB,
    query,
    pagination,
    insert,
    find,
    findOne,
    update,
    deleteEntry,
};
