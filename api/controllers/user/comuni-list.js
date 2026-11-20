const { query } = require("../../utils/db");

module.exports = {
    inputs: {
        nome: {
            type: "string",
        },
    },

    exits: {
        success: { description: "Comuni recuperati con successo" },
        genericError: { statusCode: 500 },
    },

    fn: async function (inputs, exits) {
        try {
            const searchPattern = `%${inputs.nome || ""}%`;
            const comuni = await query(
                { id_tenant: this.req.id_tenant },
                "SELECT id_comune, comune, provincia FROM comuni WHERE attivo = 1 AND comune like ? ORDER BY comune ASC",
                [searchPattern],
                (id_utente = this.req.id_utente),
            );
            return exits.success({ comuni });
        } catch (error) {
            return exits.genericError({ error: error.message || "Error" });
        }
    },
};
