const { formatDb } = require("../../api/utils/formatDb");

module.exports = {
    table: "utenti",
    primaryKey: "id",
    tableAbbreviation: "u",

    attributes: {
        id: {
            type: "number",
            required: true,
            columnName: "id_utente",
        },
        nome: {
            type: "string",
            required: true,
            columnName: "nome",
        },
        cognome: {
            type: "string",
            required: true,
            columnName: "cognome",
        },
        email: {
            type: "string",
            required: true,
            columnName: "email",
            validate: (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const valid = emailRegex.test(value);
                if (!valid) {
                    sails.log.warn(`Validation failed for email: ${value}`);
                }
                return valid;
            },
        },
        password: {
            type: "string",
            required: true,
            private: true,
            columnName: "password",

            validate: (value) => {
                if (value === "1") return true;

                if (value.length > 100) return true;

                const passwordRegex =
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                const valid = passwordRegex.test(value);
                if (!valid) {
                    sails.log.warn(`Validation failed for password: ${value}`);
                }
                return valid;
            },
        },
        telefono: {
            type: "string",
            required: true,
            columnName: "telefono",
            validate: (value) => {
                if (value === "1") return true;
                const phoneRegex = /^\+?[1-9]\d{10,14}$/;
                const valid = phoneRegex.test(value);
                if (!valid) {
                    sails.log.warn(`Validation failed for telefono: ${value}`);
                }
                return valid;
            },
        },
        attivo: {
            type: "boolean",
            required: true,
            columnName: "attivo",
        },
        tenant: {
            type: "number",
            required: true,
            columnName: "id_tenant",
        },
        id_master: {
            type: "number",
            required: true,
            columnName: "id_master",
        },
        id_profilo: {
            type: "number",
            required: true,
            columnName: "id_profilo",
        },
        privacy_accepted: {
            type: "boolean",
            required: true,
            columnName: "privacy_accepted",
        },
        email_status: {
            type: "string",
            required: true,
            columnName: "email_status",
        },
        email_proof_token: {
            type: "string",
            required: true,
            columnName: "email_proof_token",
        },
        email_proof_token_expires_at: {
            type: "ref",
            columnType: "datetime",
            required: true,
            columnName: "email_proof_token_expires_at",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
        password_reset_token: {
            type: "string",
            required: true,
            columnName: "password_reset_token",
        },
        password_reset_token_expires_at: {
            type: "ref",
            columnType: "datetime",
            required: true,
            columnName: "password_reset_token_expires_at",
            formatDb: (value) => formatDb(value, "DateTime"),
        },
    },
};
