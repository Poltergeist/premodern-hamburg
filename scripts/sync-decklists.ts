import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DECKLISTS_JSON_PATH = resolve(__dirname, "../src/data/decklists.json");

interface DecklistCard {
  name: string;
  quantity: number;
  board: "main" | "side";
  imageUrl?: string;
}

interface DecklistEntry {
  player: string;
  url: string;
  rank?: number;
  cards?: DecklistCard[];
}

export function parseCsv(csv: string): { eventId: string; player: string; url: string; rank?: number }[] {
  const lines = csv.trim().split("\n");
  // Skip header row if present
  const firstField = parseCsvLine(lines[0])[0];
  const hasHeader = firstField === "timestamp";
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const [, eventId, player, url, rankStr] = parseCsvLine(line);
    const rank = rankStr ? parseInt(rankStr, 10) : undefined;
    return { eventId, player, url, rank: rank && !isNaN(rank) ? rank : undefined };
  }).filter((row) => row.eventId && row.player && row.url);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function groupByEvent(
  rows: { eventId: string; player: string; url: string; rank?: number }[],
): Record<string, DecklistEntry[]> {
  const grouped: Record<string, DecklistEntry[]> = {};
  for (const row of rows) {
    if (!grouped[row.eventId]) {
      grouped[row.eventId] = [];
    }
    const entry: DecklistEntry = { player: row.player, url: row.url };
    if (row.rank) entry.rank = row.rank;
    grouped[row.eventId].push(entry);
  }
  // Sort by rank within each event (unranked last)
  for (const entries of Object.values(grouped)) {
    entries.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  }
  return grouped;
}

// --- Deck content fetching ---

const FETCH_HEADERS = {
  "User-Agent": "PreModernHamburg/1.0",
  "Accept": "application/json",
};

export function parseMoxfieldId(url: string): string | null {
  const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function parseArchidektId(url: string): string | null {
  const match = url.match(/archidekt\.com\/decks\/(\d+)/);
  return match?.[1] ?? null;
}

export async function fetchArchidektDeck(deckId: string): Promise<DecklistCard[]> {
  const res = await fetch(`https://archidekt.com/api/decks/${deckId}/`, {
    headers: FETCH_HEADERS,
  });
  if (!res.ok) throw new Error(`Archidekt API returned ${res.status}`);

  const data = await res.json() as {
    cards: {
      quantity: number;
      categories: string[];
      card: { oracleCard: { name: string } };
    }[];
  };

  return data.cards.map((c) => ({
    name: c.card.oracleCard.name,
    quantity: c.quantity,
    board: c.categories.some((cat) => cat.toUpperCase() === "SIDEBOARD") ? "side" as const : "main" as const,
  }));
}

export async function fetchMoxfieldDeck(deckId: string): Promise<DecklistCard[]> {
  const res = await fetch(`https://api2.moxfield.com/v3/decks/all/${deckId}`, {
    headers: FETCH_HEADERS,
  });
  if (!res.ok) throw new Error(`Moxfield API returned ${res.status}`);

  const data = await res.json() as {
    mainboard: Record<string, { quantity: number; card: { name: string } }>;
    sideboard: Record<string, { quantity: number; card: { name: string } }>;
  };

  const cards: DecklistCard[] = [];
  for (const entry of Object.values(data.mainboard ?? {})) {
    cards.push({ name: entry.card.name, quantity: entry.quantity, board: "main" });
  }
  for (const entry of Object.values(data.sideboard ?? {})) {
    cards.push({ name: entry.card.name, quantity: entry.quantity, board: "side" });
  }
  return cards;
}

export async function fetchDeckCards(url: string): Promise<DecklistCard[] | undefined> {
  try {
    const archidektId = parseArchidektId(url);
    if (archidektId) return await fetchArchidektDeck(archidektId);

    const moxfieldId = parseMoxfieldId(url);
    if (moxfieldId) return await fetchMoxfieldDeck(moxfieldId);

    return undefined;
  } catch (err) {
    console.warn(`Failed to fetch deck from ${url}:`, (err as Error).message);
    return undefined;
  }
}

export async function fetchPremodernImageUrl(cardName: string): Promise<string | undefined> {
  try {
    const query = `!"${cardName}" legal:premodern year<=2003 year>=1995`;
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=released&dir=asc&unique=prints`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) return undefined;

    const data = await res.json() as {
      data: { image_uris?: { normal: string }; card_faces?: { image_uris?: { normal: string } }[] }[];
    };

    const card = data.data?.[0];
    if (!card) return undefined;
    return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  } catch {
    return undefined;
  }
}

export async function enrichCardsWithImages(cards: DecklistCard[]): Promise<void> {
  // Deduplicate card names to minimize API calls
  const uniqueNames = [...new Set(cards.map((c) => c.name))];
  const imageMap = new Map<string, string>();

  for (const name of uniqueNames) {
    if (imageMap.size > 0) await sleep(100); // Scryfall asks for 50-100ms between requests
    const imageUrl = await fetchPremodernImageUrl(name);
    if (imageUrl) imageMap.set(name, imageUrl);
  }

  for (const card of cards) {
    const url = imageMap.get(card.name);
    if (url) card.imageUrl = url;
  }

  console.log(`  Fetched ${imageMap.size}/${uniqueNames.length} Premodern card images from Scryfall`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.error("GOOGLE_SHEET_ID environment variable is required");
    process.exit(1);
  }

  // Fetch sheet as CSV (sheet must be "anyone with link can view")
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  console.log("Fetching decklists from Google Sheets...");

  const res = await fetch(csvUrl, { redirect: "follow" });
  if (!res.ok) {
    console.error(`Failed to fetch sheet: ${res.status}`);
    process.exit(1);
  }

  const csv = await res.text();
  const rows = parseCsv(csv);
  console.log(`Found ${rows.length} decklist entries`);

  const decklists = groupByEvent(rows);

  // Read existing decklists for fallback cards
  const existingJson = readFileSync(DECKLISTS_JSON_PATH, "utf-8");
  const existing: Record<string, DecklistEntry[]> = JSON.parse(existingJson);

  // Fetch deck contents for each entry
  let fetchCount = 0;
  let failCount = 0;
  for (const [eventId, entries] of Object.entries(decklists)) {
    const existingEntries = existing[eventId] ?? [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      // Find matching existing entry for fallback
      const existingMatch = existingEntries.find((e) => e.url === entry.url);

      if (fetchCount > 0) await sleep(300);
      const cards = await fetchDeckCards(entry.url);
      fetchCount++;

      if (cards) {
        await enrichCardsWithImages(cards);
        entry.cards = cards;
      } else if (existingMatch?.cards) {
        // Fallback to previously fetched cards
        entry.cards = existingMatch.cards;
        failCount++;
      } else {
        failCount++;
      }
    }
  }

  console.log(`Fetched ${fetchCount - failCount}/${fetchCount} deck contents (${failCount} failed/cached)`);

  const newJson = JSON.stringify(decklists, null, 2) + "\n";
  const oldJson = JSON.stringify(existing, null, 2) + "\n";

  if (newJson === oldJson) {
    console.log("No changes");
    return;
  }

  writeFileSync(DECKLISTS_JSON_PATH, newJson);

  const totalEvents = Object.keys(decklists).length;
  const totalEntries = Object.values(decklists).reduce((sum, entries) => sum + entries.length, 0);
  console.log(`Updated: ${totalEntries} decklists across ${totalEvents} events`);
}

const isDirectRun = process.argv[1]?.includes("sync-decklists");
if (isDirectRun) {
  main().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
}
