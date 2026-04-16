import { fuzzyMatch } from "./levenshtein";
import { appendToSheet, appendStandingsToSheet } from "./google-sheets";
import { verifyGoogleIdToken } from "./google-auth";

export interface Env {
  CAPTCHA_KV: KVNamespace;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  ALLOWED_ORIGIN: string;
  GITHUB_REPO?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  ALLOWED_UPLOADER_EMAILS?: string;
}

interface SubmitBody {
  challengeId: string;
  cardName: string;
  eventId: string;
  player: string;
  deckUrl: string;
  rank?: number;
}

const SCRYFALL_RANDOM = "https://api.scryfall.com/cards/random?q=legal%3Apremodern+year%3C%3D2003+year%3E%3D1995";
const DECK_URL_PATTERN = /^https:\/\/(www\.)?(moxfield\.com\/decks\/|archidekt\.com\/decks\/|mtggoldfish\.com\/deck\/)/;

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function handleChallenge(env: Env, origin: string): Promise<Response> {
  const res = await fetch(SCRYFALL_RANDOM, {
    headers: { "User-Agent": "PreModernHamburg/1.0", Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Scryfall error:", res.status, body);
    return json({ error: "Failed to fetch card" }, 502, origin);
  }

  const card: { name: string; image_uris?: { normal: string } } = await res.json();
  if (!card.image_uris?.normal) {
    return json({ error: "Card has no image" }, 502, origin);
  }

  const challengeId = crypto.randomUUID();
  await env.CAPTCHA_KV.put(challengeId, card.name, { expirationTtl: 600 });

  return json({ challengeId, imageUrl: card.image_uris.normal }, 200, origin);
}

async function handleSubmit(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  const body: SubmitBody = await request.json();
  const { challengeId, cardName, eventId, player, deckUrl, rank } = body;

  // Validate required fields
  if (!challengeId || !cardName || !eventId || !player || !deckUrl) {
    return json({ error: "Missing required fields" }, 400, origin);
  }

  // Validate deck URL
  if (!DECK_URL_PATTERN.test(deckUrl)) {
    return json(
      { error: "Deck URL must be from moxfield.com, archidekt.com, or mtggoldfish.com" },
      400,
      origin,
    );
  }

  // Validate event has started
  const eventDatetime = await getEventDatetime(eventId, env);
  if (eventDatetime && new Date(eventDatetime) > new Date()) {
    return json({ error: "Event has not started yet" }, 400, origin);
  }

  // Validate captcha
  const expectedName = await env.CAPTCHA_KV.get(challengeId);
  if (!expectedName) {
    return json({ error: "Challenge expired or invalid" }, 400, origin);
  }

  // Delete challenge (one-time use)
  await env.CAPTCHA_KV.delete(challengeId);

  if (!fuzzyMatch(cardName, expectedName)) {
    return json({ error: "Incorrect card name, please try again" }, 400, origin);
  }

  // Persist decklist to Google Sheets
  const timestamp = new Date().toISOString();
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SHEET_ID) {
    try {
      const result = await appendToSheet(
        env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        env.GOOGLE_PRIVATE_KEY,
        env.GOOGLE_SHEET_ID,
        [timestamp, eventId, player, deckUrl, rank ? String(rank) : ""],
      );
      if (!result.ok) {
        return json({ error: "Failed to save decklist" }, 500, origin);
      }
    } catch (err) {
      console.error("Google Sheets error:", err);
      return json({ error: "Failed to save decklist" }, 500, origin);
    }
  } else {
    console.log("Google Sheets not configured, skipping persistence:", {
      timestamp,
      eventId,
      player,
      deckUrl,
      rank,
    });
  }

  return json({ success: true }, 200, origin);
}

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    return values;
  });
}

async function handleStandingsUpload(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  // Verify auth configuration
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.ALLOWED_UPLOADER_EMAILS) {
    return json({ error: "Standings upload not configured" }, 500, origin);
  }

  // Extract and verify token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization token" }, 401, origin);
  }

  let email: string;
  try {
    const result = await verifyGoogleIdToken(
      authHeader.slice(7),
      env.GOOGLE_OAUTH_CLIENT_ID,
    );
    email = result.email.toLowerCase();
  } catch (err) {
    console.error("Token verification failed:", err);
    return json({ error: "Invalid authorization token" }, 401, origin);
  }

  // Check allowlist
  const allowed = env.ALLOWED_UPLOADER_EMAILS.split(",").map((e) => e.trim().toLowerCase());
  if (!allowed.includes(email)) {
    return json({ error: "Nicht autorisiert" }, 403, origin);
  }

  // Parse form data
  const formData = await request.formData();
  const eventId = formData.get("eventId") as string | null;
  const file = formData.get("file") as File | null;

  if (!eventId || !file) {
    return json({ error: "Missing eventId or file" }, 400, origin);
  }

  // Validate event exists
  const eventDatetime = await getEventDatetime(eventId, env);
  if (!eventDatetime) {
    return json({ error: "Event not found" }, 400, origin);
  }

  // Parse CSV
  const csvText = await file.text();
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return json({ error: "CSV must have a header row and at least one data row" }, 400, origin);
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const requiredColumns = ["rank", "player", "pts"];
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      return json({ error: `Missing required CSV column: ${col}` }, 400, origin);
    }
  }

  const colIndex = Object.fromEntries(header.map((h, i) => [h, i]));
  const timestamp = new Date().toISOString();
  const sheetRows: string[][] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < header.length) continue;
    sheetRows.push([
      timestamp,
      eventId,
      row[colIndex["rank"]] ?? "",
      row[colIndex["player"]] ?? "",
      row[colIndex["pts"]] ?? "",
      row[colIndex["ow%"]] ?? "",
      row[colIndex["gw%"]] ?? "",
      row[colIndex["ogw%"]] ?? "",
    ]);
  }

  if (sheetRows.length === 0) {
    return json({ error: "No valid data rows in CSV" }, 400, origin);
  }

  // Write to Google Sheets
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SHEET_ID) {
    try {
      const result = await appendStandingsToSheet(
        env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        env.GOOGLE_PRIVATE_KEY,
        env.GOOGLE_SHEET_ID,
        sheetRows,
      );
      if (!result.ok) {
        return json({ error: "Failed to save standings" }, 500, origin);
      }
    } catch (err) {
      console.error("Google Sheets error:", err);
      return json({ error: "Failed to save standings" }, 500, origin);
    }
  } else {
    console.log("Google Sheets not configured, skipping persistence:", { eventId, rowCount: sheetRows.length });
  }

  return json({ success: true, rowCount: sheetRows.length }, 200, origin);
}

async function getEventDatetime(eventId: string, env: Env): Promise<string | null> {
  const repo = env.GITHUB_REPO || "Poltergeist/premodern-hamburg";
  const url = `https://raw.githubusercontent.com/${repo}/main/src/data/events.json`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PreModernHamburg/1.0" },
    });
    if (!res.ok) return null;

    const events: { id: string; datetime: string }[] = await res.json();
    const event = events.find((e) => e.id === eventId);
    return event?.datetime ?? null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigins = [env.ALLOWED_ORIGIN, "http://localhost:4321"];
    const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : env.ALLOWED_ORIGIN;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/challenge" && request.method === "GET") {
      return handleChallenge(env, origin);
    }

    if (url.pathname === "/submit" && request.method === "POST") {
      return handleSubmit(request, env, origin);
    }

    if (url.pathname === "/standings" && request.method === "POST") {
      return handleStandingsUpload(request, env, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
