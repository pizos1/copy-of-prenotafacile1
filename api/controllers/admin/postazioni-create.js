const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { deleteUserFromKeycloak } = require("../../utils/keycloak");
const { castMessage, randomStr } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");

module.exports = {
    friendlyName: "Crea postazione",

    inputs: {
        nome: {
            type: "string",
            required: true,
        },
        numero: {
            type: "string",
            required: true,
        },
        indirizzo: {
            type: "string",
            required: true,
        },
        latitudine: {
            type: "number",
        },
        longitudine: {
            type: "number",
        },
        attiva: {
            type: "number",
        },
        note_interne: {
            type: "string",
        },
        id_tipo_postazione: {
            type: "number",
        },
    },

    exits: {
        success: {},
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
        },
    },

    fn: async function (inputs, exits) {
        const db = await getDB();
        let id_tenant = this.req.id_tenant;

        const tipo_postazione = await query(
            { id_tenant },
            "SELECT * FROM tipi_postazioni WHERE id_tipo_postazione = ?",
            [inputs.id_tipo_postazione],
        );
        if (tipo_postazione.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "missing_tipo_postazione"),
            );
        }

        await query(
            { id_tenant },
            "INSERT INTO postazioni(nome, numero, indirizzo, latitudine, longitudine, attiva, note_interne, id_tipo_postazione) values (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                inputs.nome,
                inputs.numero,
                inputs.indirizzo,
                inputs.latitudine,
                inputs.longitudine,
                inputs.attiva,
                inputs.note_interne,
                tipo_postazione[0].id_tipo_postazione,
            ],
        );

        return exits.success({ status: true });
    },
};
