const _ = require("lodash");
const AuthRoutes = require("./Routes/AuthRoutes.js");
const AdminRoutes = require("./Routes/AdminRoutes.js");
const HostRoutes = require("./Routes/HostRoutes.js");
const UserRoutes = require("./Routes/UserRoutes.js");

const routes = {
    ...AuthRoutes,
    ...AdminRoutes,
    ...HostRoutes,
    ...UserRoutes,
};

const routesToExport = {};

for (const i in routes) {
    const route = routes[i];
    if (route.controller.match(/(^\/?[a-z\-]+)(\/[a-z\-]+)+$/)) {
        routesToExport[`${route.method} ${route.url}`] = {
            action: route.controller,
            // force csrf in development to false
            csrf: false,
        };
    } else {
        routesToExport[`${route.method} ${route.url}`] = route.controller;
    }
}

// generic route configuration
module.exports.referenceRoutes = routes;

module.exports.routes = _.merge(routesToExport);
