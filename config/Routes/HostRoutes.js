const API_BASE_URL = "api";
const API_VERSION = "v1";

module.exports = {
    createEvent: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/host/event`,
        controller: "host/event-create",
    },
    listEvent: {
        method: "GET",
        url: `/${API_BASE_URL}/${API_VERSION}/host/event`,
        controller: "host/event-list",
    },
    getEvent: {
        method: "GET",
        url: `/${API_BASE_URL}/${API_VERSION}/host/event/:id_evento`,
        controller: "host/event-get",
    },
    deleteEvent: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/host/event/:delete_id`,
        controller: "host/event-delete",
    },
    updateEvent: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/host/updateEvent/:id_evento`,
        controller: "host/event-update",
    },
};
