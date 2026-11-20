const { randomStr } = require("./utils");

module.exports = {
    generateQRCode: async function (id_evento, stringForQr) {
        const QRCode = require("qrcode");

        if (!stringForQr) {
            var QRString = randomStr(10, { only_upper_letters: true });
        } else {
            var QRString = stringForQr;
        }

        const qrValue = `${id_evento}_${QRString}`;

        const qrBase64 = await QRCode.toDataURL(qrValue);

        return {
            qrString: QRString,
            qrBase64,
        };
    },
};
