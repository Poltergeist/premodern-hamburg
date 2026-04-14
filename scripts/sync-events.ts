import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Event } from "../src/data/events.ts";

// ---------------------------------------------------------------------------
// TopDeck API types
// ---------------------------------------------------------------------------

interface TopDeckListEvent {
  id: string;
  game: string;
  format: string;
  name: string;
  start: string;
  city: string;
  location: string;
  players: string;
}

interface TopDeckEventDetail {
  id: string;
  name: string;
  startUnix: number;
  location: string;
  city: string;
  details: string;
  price: number;
  currency: string;
  format: string | null;
  playerCap: number;
  allowReg: boolean;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ORGANIZER_ID = "7wGoFVcWoqOw6qwuC8JQxjCTZIP2";
const TOPDECK_BASE = "https://topdeck.gg";

const DEFAULTS = {
  category: "Untap Altona PreModern",
  location: {
    name: "Weidenkantine",
    url: "https://www.weidenkantine.de/",
  },
  format: "PreModern",
  prizes: "Premodern Staples",
} as const;

const GERMAN_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

async function fetchEventList(): Promise<TopDeckListEvent[]> {
  const res = await fetch(`${TOPDECK_BASE}/api/event-filter/${ORGANIZER_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Event list fetch failed: ${res.status}`);
  const data = await res.json();
  return data.currEvents;
}

async function fetchEventDetail(id: string): Promise<TopDeckEventDetail> {
  const res = await fetch(`${TOPDECK_BASE}/api/event/${id}`);
  if (!res.ok) throw new Error(`Event detail fetch failed for ${id}: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Pure transform functions
// ---------------------------------------------------------------------------

export function topdeckIdFromLink(link: string | undefined): string | undefined {
  if (!link) return undefined;
  const match = link.match(/topdeck\.gg\/event\/(.+)$/);
  return match?.[1];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function formatGermanDate(date: Date): string {
  const weekday = date.toLocaleDateString("de-DE", {
    weekday: "long",
    timeZone: "Europe/Berlin",
  });
  const day = date
    .toLocaleDateString("de-DE", { day: "2-digit", timeZone: "Europe/Berlin" });
  const month = date
    .toLocaleDateString("de-DE", { month: "2-digit", timeZone: "Europe/Berlin" });
  const year = date
    .toLocaleDateString("de-DE", { year: "numeric", timeZone: "Europe/Berlin" });
  return `${weekday}, ${day}.${month}.${year}`;
}

export function formatEventName(date: Date): string {
  const day = date.toLocaleDateString("de-DE", {
    day: "numeric",
    timeZone: "Europe/Berlin",
  });
  const monthIndex = Number(
    date.toLocaleDateString("de-DE", { month: "numeric", timeZone: "Europe/Berlin" }),
  ) - 1;
  const year = date.toLocaleDateString("de-DE", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
  return `PreModern Hamburg - ${day}. ${GERMAN_MONTHS[monthIndex]} ${year}`;
}

export function formatEventId(date: Date, city: string): string {
  const year = date.toLocaleDateString("de-DE", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
  const month = date.toLocaleDateString("de-DE", {
    month: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const day = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    timeZone: "Europe/Berlin",
  });
  return `${year}-${month}-${day}-${city.toLowerCase()}`;
}

export function formatDatetime(date: Date): string {
  const year = date.toLocaleDateString("de-DE", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
  const month = date.toLocaleDateString("de-DE", {
    month: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const day = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const time = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
  });
  return `${year}-${month}-${day}T${time}`;
}

export function formatEntryFee(price: number, currency: string): string | undefined {
  if (price <= 0) return undefined;
  const symbol = currency === "eur" ? "€" : currency.toUpperCase();
  return `${price}${symbol}`;
}

export function buildEventFromApi(
  detail: TopDeckEventDetail,
  listEvent: TopDeckListEvent,
): Event {
  const date = new Date(detail.startUnix * 1000);
  return {
    id: formatEventId(date, detail.city || "hamburg"),
    date: formatGermanDate(date),
    datetime: formatDatetime(date),
    name: formatEventName(date),
    category: DEFAULTS.category,
    location: {
      name: DEFAULTS.location.name,
      address: detail.location,
      url: DEFAULTS.location.url,
    },
    description: stripHtml(detail.details),
    format: listEvent.format || DEFAULTS.format,
    entryFee: formatEntryFee(detail.price, detail.currency),
    prizes: DEFAULTS.prizes,
    registrationLink: `${TOPDECK_BASE}/event/${detail.id}`,
    status: "upcoming",
  };
}

export function mergeEvents(
  existing: Event[],
  incoming: Event[],
  now: Date,
): Event[] {
  // Build lookup of existing events by their topdeck ID
  const existingByTopdeckId = new Map<string, Event>();
  for (const event of existing) {
    const tdId = topdeckIdFromLink(event.registrationLink);
    if (tdId) existingByTopdeckId.set(tdId, event);
  }

  // Build lookup of incoming events by topdeck ID
  const incomingTopdeckIds = new Set(
    incoming.map((e) => topdeckIdFromLink(e.registrationLink)).filter(Boolean),
  );

  const merged: Event[] = [];

  // Keep all existing events, updating status where needed
  for (const event of existing) {
    const updated = { ...event };
    if (updated.status === "upcoming" && new Date(updated.datetime) < now) {
      updated.status = "completed";
    }
    merged.push(updated);
  }

  // Add new events not already in existing
  for (const event of incoming) {
    const tdId = topdeckIdFromLink(event.registrationLink);
    if (tdId && existingByTopdeckId.has(tdId)) continue;
    merged.push(event);
  }

  // Sort by datetime ascending
  merged.sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
  );

  return merged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_JSON_PATH = resolve(__dirname, "../src/data/events.json");

async function main() {
  // 1. Fetch event list and filter by Premodern
  console.log("Fetching events from TopDeck.gg...");
  const listEvents = await fetchEventList();
  const premodern = listEvents.filter((e) => e.format === "Premodern");
  console.log(`Found ${premodern.length} Premodern events`);

  // 2. Fetch details for each event
  console.log("Fetching event details...");
  const details = await Promise.all(
    premodern.map((e) => fetchEventDetail(e.id)),
  );

  // 3. Build Event objects from API data
  const incoming = details.map((detail, i) =>
    buildEventFromApi(detail, premodern[i]),
  );

  // 4. Read existing events
  const existingJson = readFileSync(EVENTS_JSON_PATH, "utf-8");
  const existing: Event[] = JSON.parse(existingJson);

  // 5. Merge
  const now = new Date();
  const merged = mergeEvents(existing, incoming, now);

  // 6. Write back
  writeFileSync(EVENTS_JSON_PATH, JSON.stringify(merged, null, 2) + "\n");

  // 7. Summary
  const newCount = merged.length - existing.length;
  const completedCount = merged.filter(
    (e) => e.status === "completed" && existing.find((ex) => ex.id === e.id)?.status === "upcoming",
  ).length;
  console.log(
    `Done: ${newCount} new event(s) added, ${completedCount} event(s) marked as completed`,
  );
}

const isDirectRun = process.argv[1]?.includes("sync-events");
if (isDirectRun) {
  main().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
}
