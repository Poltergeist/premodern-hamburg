var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/levenshtein.ts
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
__name(levenshtein, "levenshtein");
function normalize(s) {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
__name(normalize, "normalize");
function fuzzyMatch(input, expected, maxDistance = 3) {
  const a = normalize(input);
  const b = normalize(expected);
  if (a === b) return true;
  if (b.includes(a) && a.length >= 3) return true;
  return levenshtein(a, b) <= maxDistance;
}
__name(fuzzyMatch, "fuzzyMatch");

// src/google-sheets.ts
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
function base64url(data) {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64url, "base64url");
function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
__name(pemToArrayBuffer, "pemToArrayBuffer");
async function createSignedJwt(email, privateKeyPem) {
  const now = Math.floor(Date.now() / 1e3);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: SHEETS_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600
    })
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const sig = base64url(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${payload}.${sig}`;
}
__name(createSignedJwt, "createSignedJwt");
async function getAccessToken(email, privateKeyPem) {
  const jwt = await createSignedJwt(email, privateKeyPem);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}
__name(getAccessToken, "getAccessToken");
async function appendToSheet(email, privateKeyPem, sheetId, row) {
  const token = await getAccessToken(email, privateKeyPem);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [row] })
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Sheets API error:", res.status, text);
  }
  return { ok: res.ok };
}
__name(appendToSheet, "appendToSheet");

// src/index.ts
var SCRYFALL_RANDOM = "https://api.scryfall.com/cards/random?q=legal%3Apremodern+year%3C%3D2003+year%3E%3D1995";
var DECK_URL_PATTERN = /^https:\/\/(www\.)?(moxfield\.com\/decks\/|archidekt\.com\/decks\/)/;
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
__name(json, "json");
async function handleChallenge(env, origin) {
  const res = await fetch(SCRYFALL_RANDOM, {
    headers: { "User-Agent": "PreModernHamburg/1.0", Accept: "application/json" }
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Scryfall error:", res.status, body);
    return json({ error: "Failed to fetch card" }, 502, origin);
  }
  const card = await res.json();
  if (!card.image_uris?.normal) {
    return json({ error: "Card has no image" }, 502, origin);
  }
  const challengeId = crypto.randomUUID();
  await env.CAPTCHA_KV.put(challengeId, card.name, { expirationTtl: 600 });
  return json({ challengeId, imageUrl: card.image_uris.normal }, 200, origin);
}
__name(handleChallenge, "handleChallenge");
async function handleSubmit(request, env, origin) {
  const body = await request.json();
  const { challengeId, cardName, eventId, player, deckUrl, rank } = body;
  if (!challengeId || !cardName || !eventId || !player || !deckUrl) {
    return json({ error: "Missing required fields" }, 400, origin);
  }
  if (!DECK_URL_PATTERN.test(deckUrl)) {
    return json(
      { error: "Deck URL must be from moxfield.com or archidekt.com" },
      400,
      origin
    );
  }
  const expectedName = await env.CAPTCHA_KV.get(challengeId);
  if (!expectedName) {
    return json({ error: "Challenge expired or invalid" }, 400, origin);
  }
  await env.CAPTCHA_KV.delete(challengeId);
  if (!fuzzyMatch(cardName, expectedName)) {
    return json({ error: "Incorrect card name, please try again" }, 400, origin);
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SHEET_ID) {
    const result = await appendToSheet(
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      env.GOOGLE_PRIVATE_KEY,
      env.GOOGLE_SHEET_ID,
      [timestamp, eventId, player, deckUrl, rank ? String(rank) : ""]
    );
    if (!result.ok) {
      return json({ error: "Failed to save decklist" }, 500, origin);
    }
  } else {
    console.log("Google Sheets not configured, skipping persistence:", {
      timestamp,
      eventId,
      player,
      deckUrl,
      rank
    });
  }
  return json({ success: true }, 200, origin);
}
__name(handleSubmit, "handleSubmit");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigins = [env.ALLOWED_ORIGIN, "http://localhost:4321"];
    const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : env.ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === "/challenge" && request.method === "GET") {
      return handleChallenge(env, origin);
    }
    if (url.pathname === "/submit" && request.method === "POST") {
      return handleSubmit(request, env, origin);
    }
    return json({ error: "Not found" }, 404, origin);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-YbZYmW/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-YbZYmW/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
