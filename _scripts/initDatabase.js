const mariadb = require("mariadb");
const { custom } = require("../config/custom");

//per le credenziali del database
let cachedDbUrl = null;
const getDbUrl = () => {
    if (cachedDbUrl) return cachedDbUrl;
    try {
        const local = require("../config/local");
        cachedDbUrl = local.datastores.default.url;
    } catch (e) {
        const datastores = require("../config/datastores");
        if (
            datastores &&
            datastores.datastores &&
            datastores.datastores.default
        ) {
            cachedDbUrl = datastores.datastores.default.url;
        }
    }
    return cachedDbUrl;
};

//funzione che inizializza il database
const initDatabase = async (opt, tenant) => {
    //controllo parametri
    if (!opt || (opt !== "--init" && opt !== "--tenant")) {
        throw new Error("Invalid option. Use --init or --tenant");
    }

    const db_config = {
        user: sails.config.datastores.custom.extractedUser,
        passwod: process.env.PASSSWORD,
    };
    const db_url = getDbUrl();
    if (db_url) {
        let connection = db_url.split("@")[0];
        connection = connection.split("//")[1];
        let parts = connection.split(":");
        db_config.user = parts[0];
        db_config.passwod = parts[1];
    }

    //creo il pool di connessione a mariadb
    const pool = mariadb.createPool({
        host: "localhost",
        user: db_config.user,
        password: db_config.passwod,
    });

    dbName = sails.config.custom.dbName;

    //nome del database in base ai parametri
    let db_code = tenant ? dbName + "_" + tenant : dbName;

    let conn;
    try {
        //ottengo la connessione
        conn = await pool.getConnection();

        //controllo se il database esiste
        const rows = await conn.query(
            "SELECT SCHEMA_NAME AS name FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
            [db_code],
        );
        if (rows && rows.length > 0) {
            //se esiste lo elimino
            await conn.query(`DROP DATABASE \`${db_code}\``);
        }

        //creo il database da zero
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${db_code}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );

        //se il database è stato creato, lo uso e creo le tabelle
        await conn.query(`USE \`${db_code}\``);
        if (opt === "--init") {
            //se l'opzione è --init creo le tabelle del database master
            await conn.query(`CREATE TABLE IF NOT EXISTS tenants (
                id_tenant MEDIUMINT(8) UNSIGNED NOT NULL AUTO_INCREMENT,
                tenant VARCHAR(100) DEFAULT NULL,
                keycloak_secret VARCHAR(100) DEFAULT NULL,
                PRIMARY KEY (id_tenant)
            )`);
            await conn.query(`CREATE TABLE IF NOT EXISTS utenti (
                id_utente MEDIUMINT(8) UNSIGNED NOT NULL AUTO_INCREMENT,
                email VARCHAR(100) DEFAULT NULL,
                id_tenant MEDIUMINT(8) UNSIGNED DEFAULT NULL,
                PRIMARY KEY (id_utente),
                KEY utenti_tenants_FK (id_tenant),
                CONSTRAINT utenti_tenants_FK FOREIGN KEY (id_tenant) REFERENCES tenants (id_tenant)
            )`);
        } else if (opt === "--tenant") {
            //se l'opzione è --tenant creo le tabelle del database del tenant
            await conn.query(`CREATE TABLE IF NOT EXISTS profili (
                id_profilo MEDIUMINT(8) UNSIGNED NOT NULL AUTO_INCREMENT,
                profilo VARCHAR(100) DEFAULT NULL,
                area varchar(100) DEFAULT NULL,
                PRIMARY KEY (id_profilo)
            )`);
            await conn.query(`CREATE TABLE IF NOT EXISTS utenti (
                id_utente MEDIUMINT(8) UNSIGNED NOT NULL AUTO_INCREMENT,
                email VARCHAR(100) DEFAULT NULL,
                password VARCHAR(255) DEFAULT NULL,
                login_token VARCHAR(6) DEFAULT NULL,
                login_expiration DATETIME DEFAULT NULL,
                id_profilo MEDIUMINT(8) UNSIGNED DEFAULT NULL,
                id_keycloak varchar(100) DEFAULT NULL,
                mfa_attivo tinyint(1) DEFAULT NULL,
                change_email_code varchar(6) DEFAULT NULL,
                change_email_code_expiration datetime DEFAULT NULL,
                PRIMARY KEY (id_utente),
                UNIQUE KEY utenti_keycloak (id_keycloak),
                KEY utenti_profili_FK (id_profilo),
                CONSTRAINT utenti_profili_FK FOREIGN KEY (id_profilo) REFERENCES profili (id_profilo)
            )`);
            await conn.query(`CREATE TABLE IF NOT EXISTS comuni (
                id_comune MEDIUMINT(8) UNSIGNED NOT NULL AUTO_INCREMENT,
                comune VARCHAR(100) DEFAULT NULL,
                provincia VARCHAR(100) DEFAULT NULL,
                regione VARCHAR(100) DEFAULT NULL,
                attivo BINARY(1) DEFAULT NULL,
                PRIMARY KEY (id_comune),
                UNIQUE KEY nome (nome, provincia)
            )`);
            await conn.query(
                `CREATE TABLE \`eventi-date\` (
                    \`id_evento-data\` int(11) NOT NULL AUTO_INCREMENT,
                    \`id_evento\` int(11) NOT NULL,
                    \`data\` datetime NOT NULL,
                    \`ora_inizio\` time DEFAULT NULL,
                    \`ora_fine\` time DEFAULT NULL,
                    \`prenotabile\` binary(1) DEFAULT NULL,
                    \`data_inizio_prenotazione\` datetime DEFAULT NULL,
                    \`data_fine_prenotazione\` datetime DEFAULT NULL,
                    \`caparra\` int(11) DEFAULT NULL,
                    \`ordinamento\` int(11) DEFAULT NULL,
                    PRIMARY KEY (\`id_evento-data\`),
                    KEY \`id_evento\` (\`id_evento\`)
            )`,
            );
            await conn.query(
                `CREATE TABLE IF NOT EXISTS \`eventi-fasce\` (
                    \`id_evento-fascia\` int(11) NOT NULL AUTO_INCREMENT,
                    \`id_evento-data\` int(11) DEFAULT NULL,
                    \`id_evento\` int(11) NOT NULL,
                    \`ora_inizio\` time DEFAULT NULL,
                    \`ora_fine\` time DEFAULT NULL,
                    \`max_posti\` int(11) DEFAULT NULL,
                    PRIMARY KEY (\`id_evento-fascia\`)
            )`,
            );
            await conn.query(
                `CREATE TABLE IF NOT EXISTS \`eventi-utenti\` (
                    \`id_evento-utente\` int(11) NOT NULL AUTO_INCREMENT,
                    \`id_utente\` int(11) NOT NULL,
                    \`id_evento-fascia\` int(11) NOT NULL,
                    \`id_evento\` int(11) NOT NULL,
                    \`num_posti_prenotati\` int(11) NOT NULL,
                    \`QRString\` varchar(10) NOT NULL,
                    PRIMARY KEY (\`id_evento-utente\`)
            )`,
            );
            await conn.query(
                `CREATE TABLE IF NOT EXISTS query_logs (
                    id_log int(11) NOT NULL AUTO_INCREMENT,
                    id_utente int(11) NOT NULL,
                    params varchar(1000) DEFAULT NULL,
                    query varchar(1000) DEFAULT NULL,
                    correct int(1) DEFAULT 0,
                    dateTime datetime DEFAULT NULL,
                    PRIMARY KEY (id_log)
            )`,
            );
            await conn.query(
                `CREATE TABLE IF NOT EXISTS associazioni (
                    id_associazione int(11) NOT NULL AUTO_INCREMENT,
                    ragione_sociale varchar(1000) NOT NULL,
                    mail varchar(1000) NOT NULL,
                    PEC varchar(1000) NOT NULL,
                    partita_iva varchar(11) NOT NULL,
                    telefono varchar(15) NOT NULL,
                    PRIMARY KEY (id_associazione)
            )`,
            );
            await conn.query(
                `CREATE TABLE IF NOT EXISTS allegati (
                    id_allegato int (11) NOT NULL AUTO_INCREMENT,
                    id_evento int (11) NOT NULL,
                    allegato varchar (1000) NOT NULL,
                    tipologia_allegato varchar (1000) NOT NULL,
                    PRIMARY KEY (id_allegato)
            )`,
            );
        }
    } finally {
        //chiudo la connessione e il pool
        if (conn) conn.end();
        if (pool) pool.end();
    }

    return true;
};

//invoco la funzione con i parametri passati da linea di comando
initDatabase(process.argv[2], process.argv[3]);
