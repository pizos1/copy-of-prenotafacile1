// Script di utilità per hashing password e JWT (HS256) con supporto multi-tenant

// 1) IMPORT/REQUIRE DI MODULI -------------------------------------------------
// Importa il modulo built‑in di Node per la crittografia (HMAC, scrypt, random, ecc.)
const crypto = require("crypto");
// Importa Sails (framework MVC per Node). Usato qui solo per leggere la config.
const sails = require("sails");

// 2) IMPLEMENTAZIONE MINIMA DI BASE64URL E JSON -> BASE64URL -------------------
// base64url: converte una stringa/Buffer in Base64 URL-safe (RFC 7515)
// - Buffer.from(input) crea un buffer dai dati (stringa UTF‑8 di default)
// - toString('base64') codifica in Base64
// - replace(...): rimuove padding "=", sostituisce "+" con "-" e "/" con "_" per renderlo URL-safe
const base64url = (input) =>
    Buffer.from(input)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
// base64urlJSON: serializza un oggetto in JSON e poi lo codifica in base64url
const base64urlJSON = (obj) => base64url(JSON.stringify(obj));

// 3) LETTURA CONFIGURAZIONE JWT DA SAILS O VARIABILI D'AMBIENTE ----------------
// getJwtConfig: ricava secret e TTL con fallback sicuri di base (ma vedi nota)
const getJwtConfig = () => {
    // Estrae sails.config.custom se disponibile, altrimenti oggetto vuoto
    const custom =
        sails && sails.config && sails.config.custom ? sails.config.custom : {};
    // Sezione custom.jwt oppure oggetto vuoto
    const jwtCfg = custom.jwt || {};
    // Ritorna un oggetto di configurazione con fallback:
    // - secret: preferisce custom, poi env JWT_SECRET, infine 'dev-secret' (non usare in produzione)
    // - accessTtlSeconds: default 15 min
    // - refreshTtlSeconds: default 7 giorni
    return {
        secret: jwtCfg.secret || process.env.JWT_SECRET || "dev-secret",
        accessTtlSeconds: jwtCfg.accessTtlSeconds || 15 * 60, // 15 min
        refreshTtlSeconds: jwtCfg.refreshTtlSeconds || 7 * 24 * 60 * 60, // 7 days
    };
};

// 4) HASH DELLA PASSWORD CON SCRYPT -------------------------------------------
// hashPassword: genera un salt casuale e calcola scryptSync, restituisce 'salt:hash'
const hashPassword = (password) => {
    // Salt casuale di 16 byte, reso esadecimale (32 caratteri)
    const salt = crypto.randomBytes(16).toString("hex");
    // scryptSync(password, salt, keylen=64) -> Buffer, convertito in esadecimale
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    // Concatena salt e hash separati da ':' per lo storage
    return `${salt}:${hash}`;
};

// verifyPassword: verifica una password contro il formato 'salt:hash' salvato
const verifyPassword = (password, stored) => {
    // Controlli veloci su input: deve essere una stringa con ':'
    if (!stored || typeof stored !== "string" || stored.indexOf(":") === -1)
        return false;
    // Destruttura salt e hash originale
    const [salt, originalHash] = stored.split(":");
    // Ricalcola l'hash con lo stesso salt e parametri
    const hashVerify = crypto.scryptSync(password, salt, 64).toString("hex");
    try {
        // Confronto a tempo costante per evitare timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(originalHash, "hex"),
            Buffer.from(hashVerify, "hex"),
        );
    } catch (e) {
        // timingSafeEqual può lanciare se le lunghezze differiscono
        return false;
    }
};

// 5) JWT: FIRMA (HS256) -------------------------------------------------------
// signJwt: crea un JWT con header HS256, aggiunge iat/exp e firma con HMAC SHA-256
const signJwt = (payload, ttlSeconds) => {
    // Legge il secret dalla config
    const { secret } = getJwtConfig();
    // Header standard per JWT HMAC-SHA256
    const header = { alg: "HS256", typ: "JWT" };
    // Timestamp attuale in secondi (Unix epoch)
    const now = Math.floor(Date.now() / 1000);
    // Costruisce il payload finale con iat (issued at) ed exp (scadenza)
    const fullPayload = { iat: now, exp: now + ttlSeconds, ...payload };
    // Codifica header e payload in base64url
    const encodedHeader = base64urlJSON(header);
    const encodedPayload = base64urlJSON(fullPayload);
    // Parte da firmare: header.payload
    const data = `${encodedHeader}.${encodedPayload}`;
    // Firma HMAC-SHA256, quindi codifica in base64 e trasforma in base64url
    const signature = crypto
        .createHmac("sha256", secret)
        .update(data)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    // Token finale: header.payload.signature
    return `${data}.${signature}`;
};

// 6) DECODIFICA DI UN SEGMENTO BASE64URL --------------------------------------
// decodeSegment: converte un segmento base64url in oggetto JS
const decodeSegment = (seg) => {
    // Trasforma base64url -> base64
    seg = seg.replace(/-/g, "+").replace(/_/g, "/");
    // Padding con '=' fino a multiplo di 4
    while (seg.length % 4) seg += "=";
    // Decodifica base64 in stringa UTF-8 quindi parse JSON
    return JSON.parse(Buffer.from(seg, "base64").toString("utf8"));
};

// 7) JWT: VERIFICA -------------------------------------------------------------
// verifyJwt: controlla struttura, firma e scadenza; ritorna il payload se valido
const verifyJwt = (token) => {
    const { secret } = getJwtConfig();
    // Un JWT deve avere 3 parti separate da '.'
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    // Estrae header, payload e firma (stringhe base64url)
    const [headerSeg, payloadSeg, signature] = parts;
    // Ricostruisce i dati firmati
    const data = `${headerSeg}.${payloadSeg}`;
    // Calcola la firma attesa con lo stesso segreto
    const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(data)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    // Confronto costante tra firme (come stringhe/byte identici)
    if (
        !crypto.timingSafeEqual(
            Buffer.from(expectedSig),
            Buffer.from(signature),
        )
    ) {
        throw new Error("Invalid signature");
    }
    // Decodifica il payload
    const payload = decodeSegment(payloadSeg);
    // Verifica la scadenza exp (se presente)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now >= payload.exp) throw new Error("Token expired");
    // Restituisce il payload validato
    return payload;
};

// 8) GESTIONE PREFISSO TENANT SUI TOKEN ---------------------------------------
// prefixToken: aggiunge un prefisso '<id_tenant>_' al token
const prefixToken = (id_tenant, token) => `${id_tenant}_${token}`;
// parsePrefixedToken: separa prefisso tenant dal token grezzo
const parsePrefixedToken = (prefixed) => {
    // Cerca il primo underscore come separatore
    const idx = prefixed.indexOf("_");
    if (idx === -1) return { id_tenant: null, token: prefixed };
    // Ritorna id_tenant (prima di '_') e token (dopo '_')
    return {
        id_tenant: prefixed.substring(0, idx),
        token: prefixed.substring(idx + 1),
    };
};

// 9) GENERAZIONE DI ACCESS E REFRESH TOKEN ------------------------------------
// generateTokens: crea due JWT (access/refresh) con lo stesso soggetto
const generateTokens = ({ id_tenant, email, id_utente }) => {
    // Legge i TTL da config
    const { accessTtlSeconds, refreshTtlSeconds } = getJwtConfig();
    // Crea access token con claim personalizzati (tokenType, id_tenant, email, sub)
    const access_token_raw = signJwt(
        { tokenType: "access", id_tenant, email, sub: String(id_utente || "") },
        accessTtlSeconds,
    );
    // Crea refresh token con durata maggiore e stesso soggetto
    const refresh_token_raw = signJwt(
        {
            tokenType: "refresh",
            id_tenant,
            email,
            sub: String(id_utente || ""),
        },
        refreshTtlSeconds,
    );
    return {
        access_token: access_token_raw,
        refresh_token: refresh_token_raw,
    };
};

// 10) ESTRAZIONE E VERIFICA DELL'ACCESS TOKEN DA UNA REQUEST ------------------
// verifyAccessToken: legge l'header Authorization, verifica JWT e ritorna info
const verifyAccessToken = async (req) => {
    // Legge l'header 'Authorization'
    const authHeader = req.headers["authorization"];
    // Deve iniziare con 'Bearer '
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { active: false };
    }
    // Estrae il token dopo 'Bearer '
    let bearer = authHeader.split(" ")[1];
    // Gestisce l'eventuale prefisso tenant
    const { id_tenant, token } = parsePrefixedToken(bearer);
    try {
        // Verifica la firma e scadenza del token
        const payload = verifyJwt(token);
        // L'access token deve avere tokenType 'access'
        if (payload.tokenType !== "access") return { active: false };
        // Considera il tenant dell'header (se presente) o quello nel payload
        return {
            active: true,
            email: payload.email,
            id_tenant: id_tenant || payload.id_tenant,
            sub: payload.sub,
        };
    } catch (e) {
        // Qualsiasi errore (firma, scadenza, formato) -> token inattivo
        return { active: false };
    }
};

// 11) REFRESH: DA UN REFRESH TOKEN OTTIENI NUOVI TOKEN ------------------------
// refreshAccessToken: accetta un refresh token (eventualmente prefissato) e genera nuove credenziali
const refreshAccessToken = async (prefixedRefreshToken) => {
    // Se non c'è token, ritorna errore generico
    if (!prefixedRefreshToken) return { error: true };
    // Separa eventuale prefisso tenant
    const { id_tenant, token } = parsePrefixedToken(prefixedRefreshToken);
    try {
        // Verifica il JWT del refresh
        const payload = verifyJwt(token);
        // Deve essere di tipo 'refresh'
        if (payload.tokenType !== "refresh") return { error: true };
        // Rigenera una nuova coppia di token. Usa id_tenant dell'header o del payload
        const tokens = generateTokens({
            id_tenant: id_tenant || payload.id_tenant,
            email: payload.email,
            id_utente: payload.sub,
        });
        return tokens;
    } catch (e) {
        // Errori di verifica -> errore generico
        return { error: true };
    }
};

// 12) ESPORTAZIONI DEL MODULO -------------------------------------------------
module.exports = {
    hashPassword,
    verifyPassword,
    generateTokens,
    verifyAccessToken,
    refreshAccessToken,
    prefixToken,
    parsePrefixedToken,
};
