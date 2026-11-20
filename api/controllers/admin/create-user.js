const sails = require("sails");
const { getDB, query } = require("../../utils/db");
const { createKeycloakUser } = require("../../utils/keycloak");
const { hashPassword } = require("../../utils/localAuth");
const { castMessage } = require("../../utils/utils");
const { create } = require("../../utils/CRUDs/create");

module.exports = {
    friendlyName: "Crea utente",

    inputs: {
        email: {
            type: "string",
            required: true,
        },
        password: {
            type: "string",
        },
        id_profilo: {
            type: "number",
            required: true,
        },
        id_tenant: {
            type: "number",
        },
        nome: {
            type: "string",
        },
        cognome: {
            type: "string",
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
        let id_tenant = inputs.id_tenant || this.req.id_tenant;
        let password = inputs.password || "1";

        const utenti = await db.query(
            "SELECT * FROM utenti u WHERE u.email = ?",
            [inputs.email],
        );
        if (utenti.length > 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "user_already_exists"),
            );
        }

        const tenantData = await db.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [id_tenant],
        );
        if (tenantData.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "missing_tenant"),
            );
        }

        const profili = await query(
            { id_tenant },
            "SELECT * FROM profili p WHERE p.id_profilo = ?",
            [inputs.id_profilo],
        );
        if (profili.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "profile_not_found"),
            );
        }

        const resMaster = await create({
            inputs: {
                email: inputs.email,
                tenant: id_tenant,
            },
            tenant: null,
            table: "utenti",
            allowedFields: ["email", "tenant"],
        });

        const id_master = Number(resMaster);

        const keyclockUser = {
            username: tenantData[0].tenant + "_" + Date.now().toString(),
            enabled: true,
            email: inputs.email,
            emailVerified: true,
        };

        const commonInputs = {
            ...inputs,
            id_master,
            subscriptionDate: new Date(),
        };

        if (!sails.config.custom.keycloak.ACTIVE) {
            const password_hashed = hashPassword(password);
            await create({
                inputs: { ...commonInputs, password: password_hashed },
                table: "utenti",
                tenant: id_tenant,
                excludes: ["id_tenant"],
                id_richiedente: this.req.id_utente,
            });
        } else {
            await create({
                inputs: commonInputs,
                table: "utenti",
                tenant: id_tenant,
                id_richiedente: this.req.id_utente,
            });
            await createKeycloakUser(id_tenant, keyclockUser, password);
        }

        return exits.success({ status: true });
    },
};
