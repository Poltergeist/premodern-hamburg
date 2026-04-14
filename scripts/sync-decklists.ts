import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DECKLISTS_JSON_PATH = resolve(__dirname, "../src/data/decklists.json");

interface DecklistEntry {
  player: string;
  url: string;
  rank?: number;
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

  // Read existing decklists to compare
  const existingJson = readFileSync(DECKLISTS_JSON_PATH, "utf-8");
  const existing: Record<string, DecklistEntry[]> = JSON.parse(existingJson);

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
