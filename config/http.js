/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * (for additional recommended settings, see `config/env/production.js`)
 *
 * For more information on configuration, check out:
 * https://sailsjs.com/config/http
 */

module.exports.http = {
    /****************************************************************************
     *                                                                           *
     * Sails/Express middleware to run for every HTTP request.                   *
     * (Only applies to HTTP requests -- not virtual WebSocket requests.)        *
     *                                                                           *
     * https://sailsjs.com/documentation/concepts/middleware                     *
     *                                                                           *
     ****************************************************************************/

    middleware: {
        /***************************************************************************
         *                                                                          *
         * The order in which middleware should be run for HTTP requests.           *
         * (This Sails app's routes are handled by the "router" middleware below.)  *
         *                                                                          *
         ***************************************************************************/
        order: [
            "cookieParser",
            "session",
            "bodyParser",
            "compress",
            "poweredBy",
            "staticUploads",
            "staticUploads",
            "router",
            "www",
            "favicon",
        ],
        /***************************************************************************
         *                                                                          *
         * The body parser that will handle incoming multipart HTTP requests.       *
         *                                                                          *
         * https://sailsjs.com/config/http#?customizing-the-body-parser             *
         *                                                                          *
         ***************************************************************************/
        // bodyParser: (function _configureBodyParser(){
        //   var skipper = require('skipper');
        //   var middlewareFn = skipper({ strict: true });
        //   return middlewareFn;
        // })(),

        staticUploads: (function () {
            const express = require("express");
            const path = require("path");
            // Usa .tmp/public se vuoi che i file siano visibili immediatamente senza riavvio
            const staticPath = path.resolve(
                __dirname,
                "../../assets/images/uploads",
            );
            const serveStatic = express.static(staticPath);

            return function (req, res, next) {
                if (
                    req.method === "GET" &&
                    req.path.startsWith("/images/uploads/")
                ) {
                    const originalUrl = req.url;
                    req.url = req.path.replace("/images/uploads/", "");

                    // Applichiamo manualmente gli header CORS qui per sicurezza
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader(
                        "Access-Control-Allow-Methods",
                        "GET, OPTIONS",
                    );

                    return serveStatic(req, res, (err) => {
                        req.url = originalUrl;
                        next(err);
                    });
                }
                return next();
            };
        })(),
    },
};
