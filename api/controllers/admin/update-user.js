const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { updateUserInKeycloak } = require("../../utils/keycloak");
const { hashPassword } = require("../../utils/localAuth");
const { castMessage } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");
const { update, find } = require("../../utils/CRUDs/index");

module.exports = {
    friendlyName: "Aggiorna utente",

    inputs: {
        id_utente: {
            type: "number",
            required: true,
        },
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
        let id_tenant = this.req.id_tenant;
        let password = inputs.password || "1";

        if (inputs.id_tenant) id_tenant = inputs.id_tenant;
        const utente = await find({
            tenant: id_tenant,
            table: "utenti",
            where: { id_utente: inputs.id_utente },
            excludes: ["tenant"],
        });
        if (utente.data.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );
        }
        const utente_master = await db.query(
            "SELECT * FROM utenti u WHERE id_utente = ?",
            [utente.data[0].id_master],
        );
        if (utente_master.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );
        }
        const tenant = await db.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [id_tenant],
        );
        if (tenant.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "missing_tenant"),
            );
        }

        // controllo che il profilo esista
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

        const updatedMaster = await update({
            tenant: null,
            table: "utenti",
            where: { id_utente: utente_master[0].id_utente },
            inputs: { email: inputs.email },
            id_richiedente: this.req.id_utente,
        });
        if (updatedMaster.affectedRows === 0) {
            sails.log.error("Failed to update master user for tenant", {
                id_tenant,
                id_utente: inputs.id_utente,
                id_richiedente: this.req.id_utente,
            });
            return exits.genericError(
                castMessage(this.req, "errors", "update_failed"),
            );
        }

        if (!sails.config.custom.keycloak.ACTIVE) {
            const password_hashed = hashPassword(password || "1");
            const updatedUser = await update({
                tenant: id_tenant,
                table: "utenti",
                where: { id_utente: inputs.id_utente },
                inputs: { ...inputs, password: password_hashed, id_profilo: 1 },
                id_richiedente: this.req.id_utente,
            });
            if (updatedUser.affectedRows === 0) {
                return exits.genericError(
                    castMessage(this.req, "errors", "update_failed"),
                );
            }
            return exits.success({ status: true });
        } else {
            const updatedUser = await update({
                tenant: id_tenant,
                table: "utenti",
                where: { id_utente: inputs.id_utente },
                inputs: { ...inputs, id_profilo: 1 },
                id_richiedente: this.req.id_utente,
            });
            await updateUserInKeycloak(id_tenant, utente.data[0].id_keycloak, {
                email: inputs.email,
            });
            if (updatedUser.affectedRows === 0) {
                return exits.genericError(
                    castMessage(this.req, "errors", "update_failed"),
                );
            }
            return exits.success({ status: true });
        }
    },
};
