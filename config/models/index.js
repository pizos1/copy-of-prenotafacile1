const _ = require("lodash");
const User = require("./User");
const Event = require("./Event");
const EventDate = require("./EventDate");
const EventFasce = require("./EventFasce");
const EventUser = require("./EventUser");
const Allegati = require("./Attachement");
const SentMails = require("./SentMails");

module.exports = {
    utenti: _.cloneDeep(User),
    eventi: _.cloneDeep(Event),
    "eventi-date": _.cloneDeep(EventDate),
    "eventi-fasce": _.cloneDeep(EventFasce),
    "eventi-utenti": _.cloneDeep(EventUser),
    allegati: _.cloneDeep(Allegati),
    mail_inviate: _.cloneDeep(SentMails),
};
