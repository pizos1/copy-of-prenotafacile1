const { customDelete, find } = require("../utils/CRUDs/index");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

async function deleteAttachment({ tenant, id_utente, id_allegato }) {
    const result = await find({
        tenant,
        table: "allegati",
        id_utente,
        where: { id: id_allegato },
    });

    const allegato = result?.data?.[0];

    if (!allegato) {
        return { deleted: false, reason: "NOT_FOUND" };
    }

    const filename = allegato.allegato;

    if (filename) {
        try {
            const desktopPath = path.join(os.homedir(), "Desktop");
            const folderPath = path.join(
                desktopPath,
                "userPhotos",
                `Cartella_${id_utente}`,
            );
            const fullPath = path.join(folderPath, filename);
            await fs.unlink(fullPath);
        } catch (error) {
            console.log("Errore nell'eliminazione fisica del file:", error);
        }
    }

    await customDelete({
        tenant,
        table: "allegati",
        id_utente,
        where: { id: id_allegato },
    });

    return { deleted: true, allegato };
}

module.exports = deleteAttachment;
