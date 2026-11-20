const sails = require("sails");
const mariadb = require("mariadb");
const moment = require("moment");
const { getDB, query } = require("../../utils/db");
const { deleteUserFromKeycloak } = require("../../utils/keycloak");
const { castMessage, randomStr } = require("../../utils/utils");
const { sendEmail } = require("../../utils/email");
const { customDelete, find } = require("../../utils/CRUDs/index");

module.exports = {
    friendlyName: "Elimina utente",

    inputs: {
        id_utente: {
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
        const id_tenant = this.req.id_tenant;
        const db = await getDB();

        const tenant = await db.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [id_tenant],
        );
        if (tenant.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "missing_tenant"),
            );
        }

        const result = await find({
            tenant: id_tenant,
            table: "utenti",
            where: { id_utente: inputs.id_utente },
            excludes: ["tenant"],
        });

        if (!result.data || result.data.length === 0) {
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );
        }

        const utenteDaEliminare = result.data[0];

        try {
            await customDelete({
                tenant: id_tenant,
                table: "utenti",
                delete_id: inputs.id_utente,
                id_richiedente: this.req.id_utente,
            });

            if (sails.config.custom.keycloak.ACTIVE) {
                await deleteUserFromKeycloak(
                    id_tenant,
                    `${utenteDaEliminare.id_keycloak}`,
                );
            }

            await customDelete({
                tenant: null,
                table: "utenti",
                where: {
                    email: utenteDaEliminare.email,
                    id_tenant: id_tenant,
                },
                id_richiedente: this.req.id_utente,
            });

            return exits.success({ status: true });
        } catch (err) {
            sails.log.error("Errore durante eliminazione:", err);
            return exits.genericError({ message: err.message });
        }
    },
};
