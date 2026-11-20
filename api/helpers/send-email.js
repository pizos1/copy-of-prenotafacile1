const nodemailer = require("nodemailer");
const { create } = require("../utils/CRUDs/index");
const { getDB, query } = require("../utils/db");
const { formatDb } = require("../utils/formatDb");

module.exports = {
    inputs: {
        to: { type: "string", required: true },
        subject: { type: "string", required: true },
        text: { type: "string", required: true },
    },

    exits: {
        success: { description: "Email inviata" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        const { to, subject, text } = inputs;
        try {
            const db = await getDB();
            const userTenant = await db.query(
                "SELECT * FROM utenti WHERE email = ?",
                [to],
            );
            let id_tenant = parseInt(userTenant[0].id_tenant, 10);

            const transporter = nodemailer.createTransport({
                host: sails.config.custom.smtp.host,
                port: sails.config.custom.smtp.port,
                secure: sails.config.custom.smtp.secure,
                auth: {
                    user: sails.config.custom.smtp.user,
                    pass: sails.config.custom.smtp.pass,
                },
            });
            await transporter.sendMail({
                from: `"${sails.config.custom.smtp.fromName}" <${sails.config.custom.smtp.user}>`,
                to,
                subject,
                text,
            });

            const formattedText = formatDb(text, "DBText");

            await create({
                inputs: {
                    timestamp: new Date(),
                    mail_ricevitore: to,
                    oggetto: subject,
                    testo: formattedText,
                },
                table: "mail_inviate",
                tenant: id_tenant,
            });

            return exits.success({
                message: "Email inviata con successo",
                ricevitore: to,
            });
        } catch (err) {
            console.log("Errore: ", err);
            return exits.genericError({ error: err.message });
        }
    },
};
