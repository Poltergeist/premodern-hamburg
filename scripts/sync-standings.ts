import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STANDINGS_JSON_PATH = resolve(__dirname, "../src/data/standings.json");

interface StandingsEntry {
  rank: number;
  player: string;
  points: number;
  owp: string;
  gwp: string;
  ogwp: string;
}

interface RawRow {
  timestamp: string;
  eventId: string;
  rank: number;
  player: string;
  points: number;
  owp: string;
  gwp: string;
  ogwp: string;
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

export function parseCsv(csv: string): RawRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const firstField = parseCsvLine(lines[0])[0].toLowerCase();
  const hasHeader = firstField === "timestamp";
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const [timestamp, eventId, rankStr, player, ptsStr, owp, gwp, ogwp] = parseCsvLine(line);
      const rank = parseInt(rankStr, 10);
      const points = parseInt(ptsStr, 10);
      if (!eventId || !player || isNaN(rank)) return null;
      return {
        timestamp,
        eventId,
        rank,
        player,
        points: isNaN(points) ? 0 : points,
        owp: owp || "",
        gwp: gwp || "",
        ogwp: ogwp || "",
      };
    })
    .filter((row): row is RawRow => row !== null);
}

export function groupByEvent(rows: RawRow[]): Record<string, StandingsEntry[]> {
  // Group by eventId, then keep only the latest upload (by timestamp)
  const byEvent: Record<string, RawRow[]> = {};
  for (const row of rows) {
    if (!byEvent[row.eventId]) {
      byEvent[row.eventId] = [];
    }
    byEvent[row.eventId].push(row);
  }

  const result: Record<string, StandingsEntry[]> = {};
  for (const [eventId, eventRows] of Object.entries(byEvent)) {
    // Find latest timestamp for this event
    const latestTimestamp = eventRows.reduce(
      (latest, row) => (row.timestamp > latest ? row.timestamp : latest),
      "",
    );

    // Keep only rows with the latest timestamp
    const latestRows = eventRows.filter((row) => row.timestamp === latestTimestamp);

    // Sort by rank and strip metadata
    latestRows.sort((a, b) => a.rank - b.rank);
    result[eventId] = latestRows.map(({ rank, player, points, owp, gwp, ogwp }) => ({
      rank,
      player,
      points,
      owp,
      gwp,
      ogwp,
    }));
  }

  return result;
}

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.error("GOOGLE_SHEET_ID environment variable is required");
    process.exit(1);
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=standings&headers=1`;
  console.log("Fetching standings from Google Sheets...");

  const res = await fetch(csvUrl, { redirect: "follow" });
  if (!res.ok) {
    console.error(`Failed to fetch sheet: ${res.status}`);
    process.exit(1);
  }

  const csv = await res.text();
  const rows = parseCsv(csv);
  console.log(`Found ${rows.length} standings entries`);

  const standings = groupByEvent(rows);

  const existingJson = readFileSync(STANDINGS_JSON_PATH, "utf-8");
  const existing: Record<string, StandingsEntry[]> = JSON.parse(existingJson);

  const newJson = JSON.stringify(standings, null, 2) + "\n";
  const oldJson = JSON.stringify(existing, null, 2) + "\n";

  if (newJson === oldJson) {
    console.log("No changes");
    return;
  }

  writeFileSync(STANDINGS_JSON_PATH, newJson);

  const totalEvents = Object.keys(standings).length;
  const totalEntries = Object.values(standings).reduce((sum, entries) => sum + entries.length, 0);
  console.log(`Updated: ${totalEntries} standings across ${totalEvents} events`);
}

const isDirectRun = process.argv[1]?.includes("sync-standings");
if (isDirectRun) {
  main().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
}
