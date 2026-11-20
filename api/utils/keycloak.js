const axios = require("axios");
//const sails = require('sails')
const fs = require("fs");
const path = require("path");
const { getDB } = require("./db");

const tenants = {};

const getTenant = async (tenant_id) => {
    let client = tenants[tenant_id];
    const dbName = sails.config.custom.dbName;

    if (!client) {
        const db = await getDB();
        const tenants_db = await db.query(
            "SELECT * FROM tenants WHERE id_tenant = ?",
            [tenant_id],
        );

        if (tenants_db.length === 0) {
            throw new Error("Tenant non trovato");
        }
        client = tenants_db[0];
        client.realm = dbName + "_" + client.tenant;
        tenants[tenant_id] = client;
    }
    return client;
};

// verifica che l'access token fornito da keycloak sia ancora valido
const verifyAccessToken = async (req) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { error: "Token mancante o formato errato." };
    }

    // il bearer token può essere nel formato tenantId_token
    let token = authHeader.split(" ")[1];
    let tenant_id = null;
    if (token.indexOf("_") > -1) {
        const index = token.indexOf("_");
        const parts = [token.substring(0, index), token.substring(index + 1)];
        tenant_id = parts[0];
        token = parts[1];
    }

    if (!tenant_id) {
        return { error: "Tenant ID mancante nel token." };
    }

    const client = await getTenant(tenant_id);

    const { KEYCLOAK_BASE_URL } = sails.config.custom.keycloak;
    const introspectUrl = `${KEYCLOAK_BASE_URL}/realms/${client.realm}/protocol/openid-connect/token/introspect`;

    const params = new URLSearchParams();
    params.append("token", token);
    params.append("client_id", client.realm);
    params.append("client_secret", client.keycloak_secret); // opzionale se non richiesto

    const response = await axios.post(introspectUrl, params.toString(), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const data = response.data;
    data.id_tenant = tenant_id;
    return data; // contiene `active: true/false` + claims
};

async function loginToKeycloak(tenant_id, { username, password }) {
    let client = await getTenant(tenant_id);

    const { KEYCLOAK_BASE_URL, ACTIVE } = sails.config.custom.keycloak;
    try {
        const params = new URLSearchParams();
        params.append("grant_type", "password");
        params.append("client_id", client.realm);
        params.append("username", username);
        params.append("password", password);

        // Aggiungi solo se il client è confidential
        if (client.keycloak_secret) {
            params.append("client_secret", client.keycloak_secret);
        }

        const response = await axios.post(
            `${KEYCLOAK_BASE_URL}/realms/${client.realm}/protocol/openid-connect/token`,
            params,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        return response.data; // contiene access_token, refresh_token, ecc.
    } catch (error) {
        console.error(
            "Errore login Keycloak:",
            error.response?.data || error.message,
        );
        throw error;
    }
}

// Logout da Keycloak
async function logoutToKeycloak(tenant_id, { refresh_token }) {
    let client = await getTenant(tenant_id);

    const { KEYCLOAK_BASE_URL, ACTIVE } = sails.config.custom.keycloak;
    try {
        const params = new URLSearchParams();
        params.append("client_id", client.realm);
        params.append("refresh_token", refresh_token);

        // Aggiungi solo se il client è confidential
        if (client.keycloak_secret) {
            params.append("client_secret", client.keycloak_secret);
        }

        const response = await axios.post(
            `${KEYCLOAK_BASE_URL}/realms/${client.realm}/protocol/openid-connect/logout`,
            params,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        return response;
    } catch (error) {
        console.error(
            "Errore logout Keycloak:",
            error.response?.data || error.message,
        );
        throw error;
    }
}

// token per l'admin di keycloak
const getAdminToken = async (tenant_id) => {
    let client = await getTenant(tenant_id);

    const params = new URLSearchParams();
    const { KEYCLOAK_BASE_URL } = sails.config.custom.keycloak;
    params.append("grant_type", "client_credentials");
    params.append("client_id", client.realm);
    if (client.keycloak_secret) {
        params.append("client_secret", client.keycloak_secret);
    }

    const response = await axios.post(
        `${KEYCLOAK_BASE_URL}/realms/${client.realm}/protocol/openid-connect/token`,
        params,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    return response.data.access_token;
};

const getUserId = async (tenant_id, { accessToken, username }) => {
    let client = await getTenant(tenant_id);

    const { KEYCLOAK_BASE_URL } = sails.config.custom.keycloak;
    const response = await axios.get(
        `${KEYCLOAK_BASE_URL}/admin/realms/${client.realm}/users?username=${username}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );

    if (response.data.length > 0) {
        return response.data[0].id;
    }

    throw new Error("Utente non trovato");
};

const setUserPassword = async (
    tenant_id,
    { accessToken, userId, password },
) => {
    let client = await getTenant(tenant_id);

    const { KEYCLOAK_BASE_URL } = sails.config.custom.keycloak;
    try {
        const response = await axios.put(
            `${KEYCLOAK_BASE_URL}/admin/realms/${client.realm}/users/${userId}/reset-password`,
            {
                type: "password",
                value: password,
                temporary: false, // <-- molto importante
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return true;
    } catch (error) {
        console.error(
            "Errore aggiornamento password:",
            error.response?.data || error.message,
        );
        throw error;
    }
};

// creazione utente in keycloak
const createKeycloakUser = async (tenant_id, user, password) => {
    let client = await getTenant(tenant_id);

    const { KEYCLOAK_BASE_URL, ACTIVE } = sails.config.custom.keycloak;

    // se keycloak non è attivo lo skippo
    if (!ACTIVE) return true;

    const token = await getAdminToken(tenant_id);

    // devo mettere questi campi l'altrimenti in fase di login mi da errore perchè l'utente non è completamente settato
    user.firstName = "-";
    user.lastName = "-";

    const response = await axios.post(
        `${KEYCLOAK_BASE_URL}/admin/realms/${client.realm}/users`,
        user,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        },
    );

    if (response.status === 201) {
        // setto la password
        const accessToken = token;
        const userId = await getUserId(tenant_id, {
            accessToken,
            username: user.username,
        });
        await setUserPassword(tenant_id, {
            accessToken,
            userId,
            password: password,
        });
        return true;
    } else {
        return false;
    }
};

const updateUserInKeycloak = async (id_tenant, username, updatedFields) => {
    const client = await getTenant(id_tenant);
    const { KEYCLOAK_BASE_URL, ACTIVE } = sails.config.custom.keycloak;
    // se keycloak non è attivo lo skippo
    if (!ACTIVE) return true;

    try {
        const accessToken = await getAdminToken(id_tenant);
        const userId = await getUserId(id_tenant, { accessToken, username });

        if (!userId) {
            console.error("Utente non trovato.");
            return;
        }

        // Recupera i dati utente attuali per non sovrascrivere altri campi
        const { data: currentData } = await axios.get(
            `${KEYCLOAK_BASE_URL}/admin/realms/${client.realm}/users/${userId}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        // Costruisci l'oggetto aggiornato
        const updatedUser = { ...currentData, ...updatedFields };

        const response = await axios.put(
            `${KEYCLOAK_BASE_URL}/admin/realms/${client.realm}/users/${userId}`,
            updatedUser,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return response.status === 204;
    } catch (error) {
        console.error(
            "Errore durante l'aggiornamento:",
            error.response?.data || error.message,
        );
    }
};

// cambio password utente in keycloak
const updateKeycloakUserPassword = async (id_tenant, username, password) => {
    const { ACTIVE } = sails.config.custom.keycloak;

    // se keycloak non è attivo lo skippo
    if (!ACTIVE) return true;

    try {
        const accessToken = await getAdminToken(id_tenant);
        const userId = await getUserId(id_tenant, { accessToken, username });
        await setUserPassword(id_tenant, { accessToken, userId, password });
        return true;
    } catch (error) {
        console.error(
            "Errore durante il reset della password dell'utente:",
            error.response?.data || error.message,
        );
        throw error;
    }
};

const deleteUserFromKeycloak = async (id_tenant, username) => {
    const client = await getTenant(_.cloneDeep(id_tenant));
    const { KEYCLOAK_BASE_URL, ACTIVE } = sails.config.custom.keycloak;

    // se keycloak non è attivo lo skippo
    if (!ACTIVE) return true;

    const accessToken = await getAdminToken(id_tenant);

    try {
        const userId = await getUserId(id_tenant, { accessToken, username });
        const url = `${KEYCLOAK_BASE_URL}/admin/realms/${client.realm}/users/${userId}`;

        const response = await axios.delete(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        return true;
    } catch (error) {
        console.error(
            "Errore durante l'eliminazione dell'utente:",
            error.response?.data || error.message,
        );
    }
};

const refreshAccessToken = async (refreshToken) => {
    const id_tenant = refreshToken.split("_")[0];
    refreshToken = refreshToken.substring(id_tenant.length + 1);

    if (!id_tenant || !refreshToken) {
        return { error: "Token mancante o formato errato." };
    }
    const client = await getTenant(id_tenant);

    const { KEYCLOAK_BASE_URL } = sails.config.custom.keycloak;

    const url = `${KEYCLOAK_BASE_URL}/realms/${client.realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", client.realm);
    params.append("client_secret", client.keycloak_secret); // rimuovi se non necessario
    params.append("refresh_token", refreshToken);

    try {
        const response = await axios.post(url, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        return response.data; // contiene access_token, refresh_token, ecc.
    } catch (error) {
        return { error: true };
    }
};

module.exports = {
    verifyAccessToken,
    loginToKeycloak,
    createKeycloakUser,
    deleteUserFromKeycloak,
    updateKeycloakUserPassword,
    refreshAccessToken,
    updateUserInKeycloak,
};
