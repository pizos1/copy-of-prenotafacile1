const { query } = require("../../utils/db");
const {
    verifyAccessToken: verifyLocalAccessToken,
} = require("../../utils/localAuth");
const { castMessage } = require("../../utils/utils");
const sails = require("sails");

module.exports = {
    friendlyName: "isUserAuthenticated",

    description: "Get informations if the user is authenticated or not",

    inputs: {},

    exits: {
        success: { responseType: "ok" },
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
            responseType: "badRequest",
        },
        invalid: {
            description: "Parametri non validi",
            responseType: "badRequest",
        },
    },

    fn: async function (inputs, exits) {
        let richiedente;
        richiedente = await verifyLocalAccessToken(this.req);
        if (!richiedente || !richiedente.active) {
            return exits.success({ status: false });
        }

        const utente = await query(
            { id_tenant: richiedente.id_tenant },
            "SELECT * FROM utenti WHERE email = ?",
            [richiedente.email],
        );
        if (utente.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        // recupero il profilo
        const profilo = await query(
            { id_tenant: richiedente.id_tenant },
            "SELECT * FROM profili WHERE id_profilo = ?",
            [utente[0].id_profilo],
        );
        if (profilo.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "profile_not_found"),
            );

        return exits.success({ status: true, area: profilo[0].area });
    },
};
