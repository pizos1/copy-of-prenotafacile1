const { refreshAccessToken } = require("../../utils/keycloak");
const {
    refreshAccessToken: refreshLocalAccessToken,
} = require("../../utils/localAuth");
const { castMessage } = require("../../utils/utils");
const sails = require("sails");

module.exports = {
    friendlyName: "Refresh Access Token",

    inputs: {
        refresh_token: {
            type: "string",
            required: true,
        },
    },

    exits: {
        success: { responseType: "ok" },
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
            responseType: "badRequest",
        },
        invalid: {
            description: "Parametri non validi",
            responseType: "badRequest", // questa chiama la tua risposta personalizzata
        },
    },

    fn: async function (inputs, exits) {
        let response;
        let id_tenant = inputs.refresh_token.split("_")[0];
        if (!sails.config.custom.keycloak.ACTIVE) {
            response = await refreshLocalAccessToken(inputs.refresh_token);
        } else {
            response = await refreshAccessToken(inputs.refresh_token);
        }
        if (response && response.access_token && response.refresh_token) {
            return exits.success({
                access_token: `${id_tenant}_${response.access_token}`,
                refresh_token: `${id_tenant}_${response.refresh_token}`,
            });
        } else {
            return exits.invalid(
                castMessage(this.req, "errors", "refresh_token_expired"),
            );
        }
    },
};
