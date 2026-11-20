const path = require("path");
const fs = require("fs");
const { getDB } = require("../../utils/db");

module.exports = {
    friendlyName: "Get Logo",

    inputs: {},

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
        const id_tenant = this.req.id_tenant;
        const db = await getDB();
        const tenant = await db.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [id_tenant],
        );
        if (tenant.length === 0)
            return exits.genericError({ error: "Tenant non trovato" });
        let nome_tenant = tenant[0].tenant;
        let tenantPath = path.join(
            sails.config.custom.imgs_path,
            `/${nome_tenant}`,
        );
        let imagePath = path.join(tenantPath, `/LOGO_MENU.png`);

        if (!fs.existsSync(tenantPath) || !fs.existsSync(imagePath)) {
            imagePath = path.join(
                sails.config.appPath,
                `assets/images/default/LOGO_MENU.png`,
            );
        }
        const fileBuffer = fs.readFileSync(imagePath);
        const base64Image = fileBuffer.toString("base64");
        const mimeType = "image/png"; // oppure calcolalo dinamicamente
        return exits.success({
            mimeType,
            data: base64Image,
        });
    },
};
