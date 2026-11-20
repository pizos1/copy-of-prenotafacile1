const { parsePrefixedToken, generateTokens } = require("../../utils/localAuth");
const { find } = require("../../utils/CRUDs/find");
const { getDB } = require("../../utils/db");

module.exports = {
    friendlyName: "Switch Tenant",

    inputs: {
        new_id_tenant: {
            type: "number",
            required: true,
        },
        refresh_token: {
            type: "string",
            required: false,
        },
    },

    exits: {
        success: {
            description: "Token aggiornato con nuovo prefisso tenant.",
        },
        unauthorized: {
            statusCode: 401,
            description: "Non hai i permessi per fare lo switch.",
        },
        error: {
            statusCode: 500,
        },
    },

    fn: async function (inputs, exits) {
        try {
            const newTenantId = inputs.new_id_tenant || 1;

            const authHeader = this.req.headers["authorization"];
            let currentEmail = this.req.email_richiedente;
            let currentIdUtente = this.req.id_utente;
            let currentTenantId = this.req.id_tenant || 1;

            if (!currentEmail && authHeader) {
                try {
                    const { id_tenant: tokenTenant, token: rawToken } =
                        parsePrefixedToken(authHeader.split(" ")[1]);
                    currentTenantId = Number(tokenTenant);
                    const jwtParts = rawToken.split(".");
                    if (jwtParts.length === 3) {
                        const payload = JSON.parse(
                            Buffer.from(jwtParts[1], "base64").toString(),
                        );
                        currentEmail = payload.email;
                        currentIdUtente = payload.sub;
                    }
                } catch (e) {}
            }

            if (!currentEmail) {
                const tempTokens = generateTokens({
                    id_tenant: newTenantId || 1,
                    email: null,
                    id_utente: null,
                });
                return exits.success({
                    access_token: `${newTenantId || 1}_${tempTokens.access_token}`,
                    refresh_token: `${newTenantId || 1}_${tempTokens.refresh_token}`,
                });
            } else {
                const currentUser = await find({
                    tenant: currentTenantId,
                    table: "utenti",
                    where: { email: currentEmail },
                    excludes: ["tenant", "id_tenant"],
                });

                if (
                    !currentUser ||
                    !currentUser.data ||
                    currentUser.data.length === 0
                ) {
                    return exits.unauthorized("User not found in tenant");
                }

                const id_master = currentUser.data[0].id_master;

                if (!id_master) {
                    return exits.unauthorized("No id_master");
                }

                const userRequest = await find({
                    tenant: newTenantId,
                    table: "utenti",
                    where: { id_master },
                    excludes: ["tenant", "id_tenant"],
                });

                if (
                    !userRequest ||
                    !userRequest.data ||
                    userRequest.data.length === 0
                ) {
                    return exits.unauthorized("User not found in new tenant");
                }

                const userEmail = userRequest.data[0].email;
                const userId = userRequest.data[0].id_master;

                if (!userEmail || !userId) {
                    return exits.unauthorized("Missing user data");
                }

                const authHeader = this.req.headers["authorization"];
                const currentPrefixed = authHeader.split(" ")[1];
                const { token: rawAccessJwt } =
                    parsePrefixedToken(currentPrefixed);
                const newAccessToken = `${newTenantId}_${rawAccessJwt}`;

                let newRefreshToken = undefined;
                if (inputs.refresh_token) {
                    const { token: rawRefreshJwt } = parsePrefixedToken(
                        inputs.refresh_token,
                    );
                    newRefreshToken = `${newTenantId}_${rawRefreshJwt}`;
                }

                return exits.success({
                    access_token: newAccessToken,
                    ...(newRefreshToken
                        ? { refresh_token: newRefreshToken }
                        : {}),
                });
            }
        } catch (error) {
            return exits.error(error);
        }
    },
};
