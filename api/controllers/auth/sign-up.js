const { create } = require("../../utils/CRUDs/create");
const { getDB, query } = require("../../utils/db");
const { hashPassword } = require("../../utils/localAuth");
const { castMessage } = require("../../utils/utils");
const { randomStr } = require("../../utils/utils");
const moment = require("moment");

module.exports = {
    inputs: {
        name: { type: "string", required: true },
        surname: { type: "string", required: true },
        email: { type: "string", required: true },
        password: { type: "string", required: true },
        phone: { type: "string", required: true },
        privacyAccepted: { type: "boolean", required: true },
        id_profilo: { type: "number", required: true },
        id_tenant: { type: "number", required: true, private: true },
    },

    exits: {
        success: {},
        alreadyRegisteredInTenant: { statusCode: 409 },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            const db = await getDB();
            let id_tenant = inputs.id_tenant;
            let password = inputs.password;

            // Cerco utente nel master per email
            const existingUsers = await db.query(
                "SELECT * FROM utenti u WHERE u.email = ?",
                [inputs.email],
            );

            let id_master;

            if (existingUsers.length > 0) {
                // Utente esiste nel master
                const existingUser = existingUsers[0];
                id_master = Number(existingUser.id_utente);

                // Verifico se ha gia' accesso a questo tenant
                const existingTenantUser = await query(
                    { id_tenant },
                    "SELECT * FROM utenti u WHERE u.id_master = ? AND u.id_tenant = ?",
                    [id_master, id_tenant],
                );

                if (existingTenantUser.length > 0) {
                    return exits.alreadyRegisteredInTenant(
                        castMessage(
                            this.req,
                            "errors",
                            "user_already_in_tenant",
                        ),
                    );
                }
            } else {
                // Nuovo utente: creo record master
                const resMaster = await create({
                    inputs: {
                        email: inputs.email,
                        tenant: inputs.id_tenant,
                    },
                    tenant: null,
                    table: "utenti",
                    id_utente: this.req.id_utente,
                    allowedFields: ["email", "tenant"],
                });

                id_master = resMaster.id
                    ? Number(resMaster.id)
                    : Number(resMaster);
            }

            // Verifico tenant esista
            const tenantData = await db.query(
                "SELECT * FROM tenants WHERE id_tenant = ?",
                [id_tenant],
            );
            if (tenantData.length === 0) {
                return exits.genericError(
                    castMessage(this.req, "errors", "tenant_not_found"),
                );
            }

            // Verifico profilo esista
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

            const token = randomStr(10);
            const expiresAt = moment()
                .add(24, "hours")
                .format("YYYY-MM-DD HH:mm:ss");

            // Creo record nel tenant specifico
            const commonInputs = {
                nome: inputs.name,
                cognome: inputs.surname,
                email: inputs.email,
                telefono: inputs.phone,
                privacy_accepted: inputs.privacyAccepted,
                id_profilo: inputs.id_profilo,
                tenant: inputs.id_tenant,
                attivo: true,
                id_master,
                email_status: "unconfirmed",
                email_proof_token: token,
                email_proof_token_expires_at: expiresAt,
            };

            const hashed_password = hashPassword(password);
            await create({
                inputs: { ...commonInputs, password: hashed_password },
                table: "utenti",
                tenant: id_tenant,
                id_richiedente: this.req.id_utente,
            });

            const confirmLink = `${sails.config.custom.baseUrl}/verify-email?token=${token}&id_tenant=${id_tenant}`;
            await sails.helpers.sendEmail(
                inputs.email,
                "Conferma la tua email",
                `Ciao ${inputs.name} ${inputs.surname},\nConferma il tuo account cliccando il link:\n${confirmLink}\n\nIl link scade tra 24 ore.`,
            );
            return exits.success({ status: true });
        } catch (err) {
            console.log("Errore: ", err);
            return exits.genericError({
                message: "An error occurred during registration",
            });
        }
    },
};
