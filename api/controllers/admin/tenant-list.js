const sails = require("sails");
const { castMessage } = require("../../utils/utils");
const { getDB } = require("../../utils/db");

module.exports = {
    friendlyName: "List Tenants",

    inputs: {},

    exits: {
        success: {
            description: "Lista dei tenants recuperata con successo.",
        },
        unauthorized: {
            statusCode: 401,
            description: "Non hai i permessi per visualizzare i tenants.",
        },
        genericError: {
            description: "Errore generico",
            statusCode: 500,
        },
    },

    fn: async function (inputs, exits) {
        const userEmail = this.req.email_richiedente;

        // if (!userEmail) {
        //     return exits.unauthorized({
        //         message: "Non hai i permessi per visualizzare i tenants.",
        //     });
        // }

        try {
            const db = await getDB();
            const tenants = await db.query(
                "SELECT id_tenant AS id, tenant FROM tenants",
            );
            return exits.success(tenants);
        } catch (error) {
            sails.log.error("Errore durante il recupero dei tenants:", error);
            return exits.genericError({
                message: "Errore durante il recupero dei tenants.",
            });
        }
    },
};
