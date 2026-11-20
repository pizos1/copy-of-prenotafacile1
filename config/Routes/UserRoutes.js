const API_BASE_URL = "api";
const API_VERSION = "v1";

module.exports = {
    listComuni: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/comuni`,
        controller: "user/comuni-list",
    },
    upload: {
        method: "POST",
        url: `/${API_BASE_URL}/upload`,
        controller: "user/upload",
    },
    getImages: {
        method: "GET",
        url: `/${API_BASE_URL}/${API_VERSION}/immagini/*`,
        controller: "user/get-images",
    },
    listEvents: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/ordinamentoEventi`,
        controller: "user/list-all-events",
    },
    eventPrenota: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/prenotaEvento`,
        controller: "user/event-prenota",
    },
    listEventiPrenotati: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/listaEventiPrenotati`,
        controller: "user/list-subscribed-events",
    },
    deleteSubscription: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/deleteSubscription/:prenotazione_id`,
        controller: "user/subcriptions-delete",
    },
};
