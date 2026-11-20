/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

module.exports.custom = {
    /***************************************************************************
     *                                                                          *
     * Any other custom config this Sails app should use during development.    *
     *                                                                          *
     ***************************************************************************/
    // sendgridSecret: 'SG.fake.3e0Bn0qSQVnwb1E4qNPz9JZP5vLZYqjh7sn8S93oSHU',
    // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
    // …
    keycloak: {
        ACTIVE: false,
        KEYCLOAK_BASE_URL: "http://10.10.85.51:8080",
    },
    // JWT settings used when Keycloak is disabled
    jwt: {
        // Use env var JWT_SECRET in production; this is a fallback default
        secret: process.env.JWT_SECRET || "dev-secret",
        accessTtlSeconds: 15 * 60, // 15 minutes
        refreshTtlSeconds: 7 * 24 * 60 * 60, // 7 days
    },
    sendEmail: false,
    imgs_path: "/home/sysadmin/app_base/images/",
    dbName: "",
    dbUser: "",
    dbPassword: "",
    baseUrl: "http://localhost:3000",
    smtp: {
        // Inserire varabili smtp
    },
    uploadPath: process.env.UPLOAD_PATH,
};
