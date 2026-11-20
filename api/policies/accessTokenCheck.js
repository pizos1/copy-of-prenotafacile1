const _ = require("lodash");
const {
    verifyAccessToken: verifyKeycloakAccessToken,
} = require("../utils/keycloak");
const {
    verifyAccessToken: verifyLocalAccessToken,
} = require("../utils/localAuth");
const { query } = require("../utils/db");
const sails = require("sails");

module.exports = async (req, res, proceed) => {
    let check;
    if (!sails.config.custom.keycloak.ACTIVE) {
        check = await verifyLocalAccessToken(req);
    } else {
        check = await verifyKeycloakAccessToken(req);
    }

    if (check && check.id_tenant) {
        req.id_tenant = Number(check.id_tenant);
    }
    req.email_richiedente = check && check.email;

    if (!check || !check.active || check.error) {
        if (check && check.error) {
            return res.status(401).json({
                data: null,
                fault: {
                    code: 401,
                    message: check.error,
                },
            });
        }
        if (check && _.has(check, "active") && !check.active) {
            return res.status(401).json({
                data: null,
                fault: {
                    code: 401,
                    message: "Sessione scaduta",
                },
            });
        }
        return proceed();
    }

    if (!check.email) {
        return proceed();
    }

    let utente = await query(
        { id_tenant: check.id_tenant },
        "SELECT * FROM utenti WHERE email = ?",
        [check.email],
    );

    if (utente.length === 0 && check.sub) {
        utente = await query(
            { id_tenant: check.id_tenant },
            "SELECT * FROM utenti WHERE id_master = ?",
            [check.sub],
        );
    }

    if (utente.length === 0) {
        return res.status(401).json({
            data: null,
            fault: {
                code: 401,
                message: "Utente non trovato",
            },
        });
    } else {
        req.id_utente = utente[0].id_utente;
    }

    return proceed();
};
