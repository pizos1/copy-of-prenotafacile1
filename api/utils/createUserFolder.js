const fs = require("fs").promises;
const path = require("path");
const os = require("os");

module.exports = {
    createUserFolder: async function (id_utente) {
        const desktopPath = path.join(os.homedir(), "Desktop");
        const folderPath = path.join(
            desktopPath,
            "userPhotos",
            `Cartella_${id_utente}`,
        );

        try {
            await fs.mkdir(folderPath, { recursive: true });
            return folderPath;
        } catch (err) {
            console.error(
                "Errore durante la creazione della cartella sul Desktop:",
                err,
            );
            throw err;
        }
    },
};
