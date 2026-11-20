const fs = require("fs");
const path = require("path");
const os = require("os");
const { find } = require("../../utils/CRUDs/find");

module.exports = {
    friendlyName: "Get Images",
    inputs: {},
    exits: {
        success: { responseType: "ok" },
        notFound: { responseType: "notFound" },
        forbidden: { responseType: "forbidden" },
    },

    fn: async function (inputs, exits) {
        const imgRelativePath = this.req.path
            .replace("api/v1/immagini/", "")
            .replace(/^\//, "");

        const imgNameFinder = await find({
            tenant: this.req.id_tenant,
            table: "allegati",
            id_utente: this.req.id_utente,
            where: {
                allegato: imgRelativePath,
            },
            joins: [
                {
                    table: "eventi",
                    tableAbbreviation: "e",
                    on: "e.id_evento = a.id_evento",
                    select: ["id_host"],
                },
            ],
        });

        if (!imgNameFinder.data || imgNameFinder.data.length === 0) {
            return exits.notFound();
        }

        const idHost = imgNameFinder.data[0].id_host;

        const BASE_DIR = path.join(os.homedir(), "Desktop", "userPhotos");
        const filePath = path.join(
            BASE_DIR,
            `Cartella_${idHost}`,
            imgRelativePath,
        );

        if (!filePath.startsWith(BASE_DIR)) {
            return exits.forbidden();
        }

        if (!fs.existsSync(filePath)) {
            return exits.notFound();
        }

        const MIME_TYPES = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
        };

        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || "application/octet-stream";

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const base64Image = fileBuffer.toString("base64");

            return exits.success({
                data: base64Image,
                mimeType: mimeType,
            });
        } catch (err) {
            sails.log.error("Errore durante la lettura del file:", err);
            throw err;
        }
    },
};
