const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { deleteUserFromKeycloak } = require("../../utils/keycloak");
const { castMessage, randomStr } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");

module.exports = {
    friendlyName: "Elimina postazione",

    inputs: {
        id_postazione: {
            type: "number",
            required: true,
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

        // elimino la postazione
        await query(
            { id_tenant },
            "DELETE FROM postazioni WHERE id_postazione = ?",
            [inputs.id_postazione],
        );

        return exits.success({ status: true });
    },
};
