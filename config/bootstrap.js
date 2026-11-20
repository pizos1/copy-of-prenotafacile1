/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async function () {
    const url = sails.config.datastores.default.url;
    const myUrl = new URL(url);

    if (url) {
        const extractedName = myUrl.pathname.replace("/", "");
        sails.config.custom.dbName = extractedName;

        const extractedUser = myUrl.username;
        sails.config.custom.dbUser = extractedUser;

        const extractedPassword = myUrl.password;
        sails.config.custom.dbPassword = extractedPassword;
    } else {
        throw new Error("Database URL not found in configuration");
    }

    return;
};
