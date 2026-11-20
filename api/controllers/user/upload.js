const path = require("path");
const fs = require("fs");
const { createUserFolder } = require("../../utils/createUserFolder");

module.exports = {
    inputs: {},
    exits: {
        success: { description: "File uploaded successfully" },
        badRequest: { responseType: "badRequest" },
        error: { description: "Error uploading file" },
    },
    fn: async function (inputs, exits) {
        const req = this.req;

        const id_utente = req.id_utente;

        if (!id_utente) {
            return exits.badRequest("Utente non trovato");
        }

        try {
            const absoluteFolderPath = await createUserFolder(id_utente);

            req.file("demo[]").upload(
                {
                    dirname: absoluteFolderPath,
                    maxBytes: 50000000,
                },
                async (err, uploadedFiles) => {
                    if (err) return exits.error(err);
                    if (uploadedFiles.length === 0)
                        return exits.error(new Error("No file was uploaded"));

                    const uploadedFile = uploadedFiles[0];
                    const tempPath = uploadedFile.fd;

                    const originalName = uploadedFile.filename;
                    const ext = path.extname(originalName);
                    const baseName = path
                        .basename(originalName, ext)
                        .replace(/\s+/g, "_");
                    const uniqueName = `${baseName}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;

                    const finalPath = path.join(absoluteFolderPath, uniqueName);

                    fs.rename(tempPath, finalPath, (renameErr) => {
                        if (renameErr) return exits.error(renameErr);

                        return exits.success({
                            message: "File salvato nella cartella utente",
                            fileName: uniqueName,
                            fullPath: finalPath,
                        });
                    });
                },
            );
        } catch (error) {
            return exits.error(
                error instanceof Error ? error : new Error(error),
            );
        }
    },
};
