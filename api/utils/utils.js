const fs = require("fs");
const path = require("path");
const _ = require("lodash");

// casto i messaggi nella lingua richiesta
const castMessage = (req, type, key, replaceOpt) => {
    // ricavo il linguaggio dall'header
    const language = req.get("language");

    // se non trovo il linguaggio setto il default (italiano)
    const lang = (language || "it").split("-")[0];
    let traduzione = null;
    if (lang) {
        try {
            const file = fs
                .readFileSync(
                    path.join(__dirname, `../../assets/i18n/${lang}.json`),
                )
                .toString();
            traduzione = JSON.parse(file);
        } catch (e) {
            console.error("Errore caricamento dizionario", e);
        }
    }
    let msg = "Missing translation";
    if (traduzione) {
        try {
            msg = traduzione.translation[type][key];
        } catch (e) {
            console.error(`Traduzione assente: ${language} - ${type} - ${key}`);
        }
    }

    if (replaceOpt) {
        _.each(_.keys(replaceOpt), (key) => {
            msg = msg.replace(`${key}`, replaceOpt[key]);
        });
    }

    if (type === "errors") {
        // torno direttamente il messaggio di errore
        return {
            code: 500,
            message: msg,
        };
    }
    return msg;
};

const randomStr = (length, opt = {}) => {
    let result = "";
    let characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    if (opt.only_upper) characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    if (opt.only_numbers) characters = "0123456789";
    if (opt.only_upper_letters) characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        );
        counter += 1;
    }
    return result;
};

module.exports = {
    castMessage,
    randomStr,
};
