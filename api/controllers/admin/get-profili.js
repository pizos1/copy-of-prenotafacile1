const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { deleteUserFromKeycloak } = require("../../utils/keycloak");
const { castMessage, randomStr } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");

module.exports = {
    friendlyName: "Get profili disponibili",

    inputs: {},

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

        const profili = await query({ id_tenant }, "SELECT * FROM profili");

        return exits.success({ data: profili });
    },
};
