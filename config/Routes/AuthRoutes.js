const API_BASE_URL = "api";
const API_VERSION = "v1";

module.exports = {
    test: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/test`,
        controller: "test/test",
    },
    register: {
        method: "POST",
        url: `/${API_BASE_URL}/${API_VERSION}/signUp`,
        controller: "auth/sign-up",
    },
    isAuthenticated: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/isAuthenticated`,
        controller: "auth/is-authenticated",
    },
    signIn: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/signIn`,
        controller: "auth/sign-in",
    },
    signInVerify: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/signInVerify`,
        controller: "auth/sign-in-verify",
    },
    refreshAccessToken: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/refreshAccessToken`,
        controller: "auth/refresh-access-token",
    },
    getLogo: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/getLogo`,
        controller: "auth/get-logo",
    },
    getLogoMenu: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/getLogoMenu`,
        controller: "auth/get-logo-menu",
    },
    requestChangeEmailCode: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/requestChangeEmailCode`,
        controller: "auth/request-change-email-code",
    },
    changePassword: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/changePassword`,
        controller: "auth/change-password",
    },
    changeEmail: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/changeEmail`,
        controller: "auth/change-email",
    },
    me: {
        method: "get",
        url: `/${API_BASE_URL}/${API_VERSION}/me`,
        controller: "auth/me",
    },
    verifyEmail: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/verifyEmail`,
        controller: "auth/verify-email",
    },
    sendResetPasswordMail: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/sendResetPasswordMail`,
        controller: "auth/send-reset-password-mail",
    },
    resetForgottenPassword: {
        method: "post",
        url: `/${API_BASE_URL}/${API_VERSION}/resetForgottenPassword`,
        controller: "auth/reset-forgotten-password",
    },
};
