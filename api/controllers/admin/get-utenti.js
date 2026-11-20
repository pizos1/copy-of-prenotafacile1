const { castMessage } = require("../../utils/utils");
const { find } = require("../../utils/CRUDs/find");

module.exports = {
    friendlyName: "Elimina utente",

    inputs: {
        page: { type: "number" },
        limit: { type: "number" },
        sortingField: { type: "string" },
        sortingDirection: { type: "number" },
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
        const id_utente =
            this.req.id_utente || (this.req.user && this.req.user.id);

        try {
            const utenti = await find({
                tenant: id_tenant,
                table: "utenti",
                excludes: ["tenant", "id_tenant"],
                id_utente: this.req.id_utente,
                where: {
                    id_tenant: id_tenant,
                },
                limit: inputs.limit,
                offset:
                    inputs.page !== undefined && inputs.limit
                        ? inputs.page * inputs.limit
                        : undefined,
                sortingField: inputs.sortingField,
                sortingDirection: inputs.sortingDirection,
            });

            return exits.success({ data: utenti.data, count: utenti.count });
        } catch (err) {
            return exits.genericError({ message: err.message });
        }
    },
};
