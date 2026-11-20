//const { getDB, getRichiedente } = require('../../utils/db');

module.exports = {
    friendlyName: "isUserAuthenticated",

    description: "Get informations if the user is authenticated or not",

    inputs: {},

    exits: {
        success: {},
        genericError: {
            description: "Query parameters are not valid",
            statusCode: "500",
        },
    },

    fn: async function (inputs, exits) {
        //    const db = await getDB({ req: this.req })
        //    const richiedente = await getRichiedente(db, this.req)
        console.log("aaa");
        return exits.success({ status: true });
    },
};
