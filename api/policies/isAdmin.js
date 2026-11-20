const _ = require("lodash");
const { query } = require("../utils/db");
module.exports = async (req, res, proceed) => {
    // Use req.id_utente already set by accessTokenCheck
    if (!req.id_utente) {
        return res.status(401).json({
            data: null,
            fault: {
                code: 401,
                message: "Utente non identificato",
            },
        });
    }

    // recupero il profilo using id_utente
    const profilo = await query(
        { id_tenant: req.id_tenant },
        "SELECT * FROM profili p WHERE p.id_profilo = (SELECT id_profilo FROM utenti WHERE id_utente = ?)",
        [req.id_utente],
    );
    // verifico che sia admin
    if (
        !profilo ||
        profilo.length === 0 ||
        profilo[0].profilo !== "amministratore"
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
