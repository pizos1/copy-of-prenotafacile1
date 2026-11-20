/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {
    /***************************************************************************
     *                                                                          *
     * Default policy for all controllers and actions, unless overridden.       *
     * (`true` allows public access)                                            *
     *                                                                          *
     ***************************************************************************/

    // '*': true,

    authController: {
        "sign-in": true,
        "sign-up": true,
        "sign-in-verify": true,
        "is-authenticated": true,
        "refresh-access-token": true,
        "verify-email": true,
        "send-reset-password-mail": true,
        "reset-forgotten-password": true,
        "*": ["accessTokenCheck"],
    },

    adminController: {
        "tenant-list": true,
        "tenant-switch": true,
        "*": ["accessTokenCheck", "isAdmin"],
        "day-add": ["accessTokenCheck"],
        "eventi-date-list": ["accessTokenCheck"],
        "day-delete": ["accessTokenCheck"],
        "delete-allegato": ["accessTokenCheck"],
    },
    userController: {
        "get-images": ["accessTokenCheck"],
        "list-all-events": ["accessTokenCheck"],
        "comuni-list": true,
        "list-subscribed-events": ["accessTokenCheck"],
        "event-prenota": ["accessTokenCheck"],
        "subcriptions-delete": ["accessTokenCheck"],
        upload: ["accessTokenCheck"],
    },

    hostController: {
        "event-get": ["accessTokenCheck"],
        "*": ["accessTokenCheck"],
        "event-list": ["accessTokenCheck", "isHost"],
        "event-create": ["accessTokenCheck", "isHost"],
        "event-update": ["accessTokenCheck", "isHost"],
        "event-delete": ["accessTokenCheck", "isHost"],
    },

    testController: {
        "*": true,
    },
};
