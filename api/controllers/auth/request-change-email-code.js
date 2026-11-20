const { sendEmail } = require("../../utils/email");
const { randomStr, castMessage } = require("../../utils/utils");
const moment = require("moment");
const { query } = require("../../utils/db");

module.exports = {
    friendlyName: "Cambio mail - Richiedi nuovo codice",

    inputs: {
        email: {
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
        const id_utente = this.req.id_utente;
        const id_tenant = this.req.id_tenant;

        const utente = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE id_utente = ?",
            [id_utente],
        );
        if (utente.length === 0)
            return exits.genericError(
                castMessage(this.req, "errors", "user_not_found"),
            );

        const sameUser = await query(
            { id_tenant },
            "SELECT * FROM utenti WHERE email = ?",
            [inputs.email],
        );
        if (sameUser.length > 0)
            return exits.genericError(
                castMessage(this.req, "errors", "email_already_exists"),
            );

        let code = randomStr(6, { only_numbers: true });

        //TODO: change
        code = "000000";

        const change_email_code_expiration = moment()
            .add(120, "seconds")
            .toDate();
        await query(
            { id_tenant },
            "UPDATE utenti SET change_email_code = ?, change_email_code_expiration = ? WHERE id_utente = ?",
            [code, change_email_code_expiration, id_utente],
        );

        sendEmail(
            utente[0].email,
            castMessage(this.req, "changeEmail", "title"),
            castMessage(this.req, "changeEmail", "body").replace(
                "<<CODE>>",
                code,
            ),
        );

        return exits.success({ status: true });
    },
};
