const pdfkit = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

module.exports = {
    generatePDF: async function (data) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new pdfkit({ size: "A4", margin: 50 });

                const dirPath = path.resolve(__dirname, "../../.tmp");
                const fileName = `prenotazione_${data.qrString}.pdf`;
                const filePath = path.join(dirPath, fileName);

                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                const stream = fs.createWriteStream(filePath);

                // Gestione errori dello stream
                stream.on("error", (err) => {
                    reject(err);
                });

                doc.pipe(stream);

                doc.fontSize(20).text("CONFERMA PRENOTAZIONE", {
                    align: "center",
                });
                doc.moveDown();

                doc.fontSize(12)
                    .fillColor("#333333")
                    .text(`Codice Unico: ${data.qrString}`)
                    .moveDown(2);

                const qrValue = `${data.id_evento}_${data.qrString}`;
                const qrBuffer = await QRCode.toBuffer(qrValue, {
                    errorCorrectionLevel: "M",
                    margin: 2,
                });

                doc.image(qrBuffer, (doc.page.width - 150) / 2, doc.y, {
                    width: 150,
                });
                doc.moveDown(10);
                doc.fontSize(8)
                    .fillColor("grey")
                    .text("Presenta questo QR code all'ingresso dell'evento.", {
                        align: "center",
                    });

                doc.end();

                stream.on("finish", () => resolve(filePath));
            } catch (err) {
                reject(err);
            }
        });
    },
};
