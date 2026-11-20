const _ = require("lodash");
const { query } = require("../utils/db");
module.exports = async (req, res, proceed) => {
    const utente = await query(
        { id_tenant: req.id_tenant },
        "SELECT * FROM utenti u WHERE u.email = ?",
        [req.email_richiedente],
    );
    if (!utente || utente.length === 0) {
        return res.status(401).json({
            data: null,
            fault: {
                code: 401,
                message: "Utente non trovato",
            },
        });
    }
    const profilo = await query(
        { id_tenant: req.id_tenant },
        "SELECT * FROM profili p WHERE p.id_profilo = ?",
        [utente[0].id_profilo],
    );
    if (
        !profilo ||
        profilo.length === 0 ||
        (profilo[0].profilo !== "organizzatore" &&
            profilo[0].profilo !== "amministratore")
    ) {
        return res.status(403).json({
            data: null,
            fault: {
                code: 403,
                message: "Non hai i permessi per accedere a questa risorsa",
            },
        });
    } else {
        return proceed();
    }
};
