const {
    generateTokens,
    verifyPassword,
    prefixToken,
} = require("../../utils/localAuth");
const { find } = require("../../utils/CRUDs/find");
const { getDB } = require("../../utils/db");

module.exports = {
    inputs: {
        email: {
            type: "string",
            required: true,
        },
        password: {
            type: "string",
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
        try {
            let id_tenant = null;
            const masterDb = await getDB();
            // Controllo se la mail esiste nel master DB
            const masterUser = await masterDb.query(
                "SELECT * FROM utenti u WHERE u.email = ?",
                [inputs.email],
            );
            if (!masterUser || masterUser.length === 0) {
                return exits.success({
                    success: false,
                    message: "Invalid email or password",
                });
            }

            // Trova il primo tenant dove lo user e' presente
            id_tenant = masterUser[0].id_tenant;
            const id_utente = this.req.id_utente;

            // Esegue la funzione custom find per trovare all'interno del tenant lo user con la mail specificate
            const { data: rows } = await find({
                tenant: id_tenant,
                table: "utenti",
                id_utente: this.req.id_utente,
                where: { email: inputs.email },
                id_utente: id_utente,
                includePrivates: true,
            });
            if (!rows || rows.length === 0) {
                return exits.success({
                    success: false,
                    message: "Invalid email or password",
                });
            }

            // Controllo la password
            const user = rows[0];

            if (user.email_status !== "confirmed") {
                return exits.success({
                    success: false,
                    message: "Email non confermata",
                });
            }

            const passwordMatch = await verifyPassword(
                inputs.password,
                user.password,
            );
            if (!passwordMatch) {
                return exits.success({
                    success: false,
                    message: "Invalid email or password",
                });
            }

            // Generazione token con relativi prefissi
            const tokens = generateTokens({
                id_utente: user.id_utente,
                id_tenant: user.tenant,
                email: user.email,
            });
            const prefixedAccessToken = prefixToken(
                user.tenant,
                tokens.access_token,
            );
            const prefixedRefreshToken = prefixToken(
                user.tenant,
                tokens.refresh_token,
            );
            return exits.success({
                success: true,
                access_token: prefixedAccessToken,
                refresh_token: prefixedRefreshToken,
                role: user.id_profilo,
            });
        } catch (err) {
            return exits.genericError({
                success: false,
                message: "An error occurred during login",
            });
        }
    },
};
