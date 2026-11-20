const API_BASE_URL = "api";
const API_VERSION = "v1";

module.exports = {
    createUser: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/createUser`,
        controller: "admin/create-user",
    },
    updateUser: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/updateUser`,
        controller: "admin/update-user",
    },
    deleteUser: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/deleteUser`,
        controller: "admin/delete-user",
    },
    resetPassword: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/resetPassword`,
        controller: "admin/reset-password",
    },
    getProfili: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/getProfili`,
        controller: "admin/get-profili",
    },
    getUtenti: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/getUtenti`,
        controller: "admin/get-utenti",
    },
    getTenants: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/getTenants`,
        controller: "admin/tenant-list",
    },
    switchTenant: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/switchTenant`,
        controller: "admin/tenant-switch",
    },
    adminListEvents: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/admin/event`,
        controller: "admin/eventi-list",
    },
    listEventDates: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/admin/event-dates`,
        controller: "admin/eventi-date-list",
    },
    updateEventOrder: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/admin/event/:id`,
        controller: "admin/event-date-order-update",
    },
    addDay: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/admin/event/add-day`,
        controller: "admin/day-add",
    },
    deleteDay: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/admin/event/delete-day/:delete_id`,
        controller: "admin/day-delete",
    },
    deleteAllegato: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/admin/delete-allegato/:id_allegato`,
        controller: "admin/allegati-delete",
    },
};
