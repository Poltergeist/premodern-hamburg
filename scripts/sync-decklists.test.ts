import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseCsv, groupByEvent, parseMoxfieldId, parseArchidektId, fetchArchidektDeck, fetchMoxfieldDeck, fetchDeckCards, fetchPremodernImageUrl, enrichCardsWithImages } from "./sync-decklists";

describe("parseCsv", () => {
  it("parses CSV with header row", () => {
    const csv = `timestamp,eventId,player,url,rank
2026-04-14T10:00:00Z,2026-04-01-hamburg,Max,https://www.moxfield.com/decks/abc,1
2026-04-14T11:00:00Z,2026-04-01-hamburg,Anna,https://archidekt.com/decks/123,2`;

    const rows = parseCsv(csv);
    expect(rows).toEqual([
      { eventId: "2026-04-01-hamburg", player: "Max", url: "https://www.moxfield.com/decks/abc", rank: 1 },
      { eventId: "2026-04-01-hamburg", player: "Anna", url: "https://archidekt.com/decks/123", rank: 2 },
    ]);
  });

  it("handles missing rank", () => {
    const csv = `timestamp,eventId,player,url,rank
2026-04-14T10:00:00Z,2026-04-01-hamburg,Max,https://www.moxfield.com/decks/abc,`;

    const rows = parseCsv(csv);
    expect(rows[0].rank).toBeUndefined();
  });

  it("handles quoted fields", () => {
    const csv = `timestamp,eventId,player,url,rank
2026-04-14T10:00:00Z,2026-04-01-hamburg,"Player, Jr.",https://www.moxfield.com/decks/abc,1`;

    const rows = parseCsv(csv);
    expect(rows[0].player).toBe("Player, Jr.");
  });

  it("skips rows with missing fields", () => {
    const csv = `timestamp,eventId,player,url,rank
2026-04-14T10:00:00Z,2026-04-01-hamburg,,https://www.moxfield.com/decks/abc,1
2026-04-14T11:00:00Z,2026-04-01-hamburg,Max,https://www.moxfield.com/decks/abc,`;

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("Max");
  });

  it("parses CSV without header row", () => {
    const csv = `2026-04-14T10:00:00Z,2026-04-01-hamburg,Max,https://www.moxfield.com/decks/abc,1`;

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      eventId: "2026-04-01-hamburg", player: "Max", url: "https://www.moxfield.com/decks/abc", rank: 1,
    });
  });

  it("returns empty array for header-only CSV", () => {
    expect(parseCsv("timestamp,eventId,player,url,rank")).toEqual([]);
  });
});

describe("groupByEvent", () => {
  it("groups entries by eventId and sorts by rank", () => {
    const rows = [
      { eventId: "event-a", player: "Max", url: "https://moxfield.com/decks/1", rank: 2 },
      { eventId: "event-b", player: "Anna", url: "https://moxfield.com/decks/2", rank: 1 },
      { eventId: "event-a", player: "Tom", url: "https://archidekt.com/decks/3", rank: 1 },
    ];

    const grouped = groupByEvent(rows);
    expect(grouped["event-a"]).toEqual([
      { player: "Tom", url: "https://archidekt.com/decks/3", rank: 1 },
      { player: "Max", url: "https://moxfield.com/decks/1", rank: 2 },
    ]);
    expect(grouped["event-b"]).toEqual([
      { player: "Anna", url: "https://moxfield.com/decks/2", rank: 1 },
    ]);
  });

  it("sorts unranked entries last", () => {
    const rows = [
      { eventId: "event-a", player: "Max", url: "https://moxfield.com/decks/1" },
      { eventId: "event-a", player: "Tom", url: "https://moxfield.com/decks/2", rank: 1 },
    ];

    const grouped = groupByEvent(rows);
    expect(grouped["event-a"][0].player).toBe("Tom");
    expect(grouped["event-a"][1].player).toBe("Max");
  });

  it("returns empty object for empty input", () => {
    expect(groupByEvent([])).toEqual({});
  });
});

describe("parseMoxfieldId", () => {
  it("extracts ID from moxfield URL", () => {
    expect(parseMoxfieldId("https://www.moxfield.com/decks/_V8rk5MshESVG6iAf0Jnlw")).toBe("_V8rk5MshESVG6iAf0Jnlw");
  });

  it("extracts ID without www", () => {
    expect(parseMoxfieldId("https://moxfield.com/decks/abc-123_XY")).toBe("abc-123_XY");
  });

  it("returns null for non-moxfield URL", () => {
    expect(parseMoxfieldId("https://archidekt.com/decks/123")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(parseMoxfieldId("not-a-url")).toBeNull();
  });
});

describe("parseArchidektId", () => {
  it("extracts numeric ID from archidekt URL", () => {
    expect(parseArchidektId("https://archidekt.com/decks/21697041")).toBe("21697041");
  });

  it("extracts ID with trailing path", () => {
    expect(parseArchidektId("https://archidekt.com/decks/21697041/italien_rock")).toBe("21697041");
  });

  it("returns null for non-archidekt URL", () => {
    expect(parseArchidektId("https://www.moxfield.com/decks/abc")).toBeNull();
  });
});

describe("fetchArchidektDeck", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => { globalThis.fetch = mockFetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("parses Archidekt API response into DecklistCard array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        cards: [
          { quantity: 4, categories: ["Sorcery"], card: { oracleCard: { name: "Cabal Therapy" } } },
          { quantity: 1, categories: ["SIDEBOARD"], card: { oracleCard: { name: "Masticore" } } },
          { quantity: 2, categories: ["Creature", "SIDEBOARD"], card: { oracleCard: { name: "Spike Feeder" } } },
        ],
      }),
    });

    const cards = await fetchArchidektDeck("21697041");
    expect(cards).toEqual([
      { name: "Cabal Therapy", quantity: 4, board: "main" },
      { name: "Masticore", quantity: 1, board: "side" },
      { name: "Spike Feeder", quantity: 2, board: "side" },
    ]);
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchArchidektDeck("99999")).rejects.toThrow("Archidekt API returned 404");
  });
});

describe("fetchMoxfieldDeck", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => { globalThis.fetch = mockFetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("parses Moxfield API response into DecklistCard array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        mainboard: {
          "Lightning Bolt": { quantity: 4, card: { name: "Lightning Bolt" } },
          "Birds of Paradise": { quantity: 2, card: { name: "Birds of Paradise" } },
        },
        sideboard: {
          "Tormod's Crypt": { quantity: 3, card: { name: "Tormod's Crypt" } },
        },
      }),
    });

    const cards = await fetchMoxfieldDeck("abc123");
    expect(cards).toHaveLength(3);
    expect(cards.find((c) => c.name === "Lightning Bolt")).toEqual({ name: "Lightning Bolt", quantity: 4, board: "main" });
    expect(cards.find((c) => c.name === "Tormod's Crypt")).toEqual({ name: "Tormod's Crypt", quantity: 3, board: "side" });
  });
});

describe("fetchDeckCards", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => { globalThis.fetch = mockFetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("returns undefined for unknown URL", async () => {
    const result = await fetchDeckCards("https://example.com/deck/123");
    expect(result).toBeUndefined();
  });

  it("returns undefined on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const result = await fetchDeckCards("https://archidekt.com/decks/123");
    expect(result).toBeUndefined();
  });

  it("dispatches to archidekt fetcher", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        cards: [{ quantity: 4, categories: ["Creature"], card: { oracleCard: { name: "Tarmogoyf" } } }],
      }),
    });

    const result = await fetchDeckCards("https://archidekt.com/decks/123");
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe("Tarmogoyf");
  });
});

describe("fetchPremodernImageUrl", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => { globalThis.fetch = mockFetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("returns image URL from oldest Premodern printing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ image_uris: { normal: "https://cards.scryfall.io/normal/front/a/b/ab.jpg" } }],
      }),
    });

    const url = await fetchPremodernImageUrl("Lightning Bolt");
    expect(url).toBe("https://cards.scryfall.io/normal/front/a/b/ab.jpg");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("scryfall.com/cards/search"),
      expect.any(Object),
    );
  });

  it("handles double-faced cards via card_faces", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ card_faces: [{ image_uris: { normal: "https://cards.scryfall.io/front.jpg" } }] }],
      }),
    });

    const url = await fetchPremodernImageUrl("Some DFC");
    expect(url).toBe("https://cards.scryfall.io/front.jpg");
  });

  it("returns undefined on API error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const url = await fetchPremodernImageUrl("Nonexistent Card");
    expect(url).toBeUndefined();
  });
});

describe("enrichCardsWithImages", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => { globalThis.fetch = mockFetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("adds imageUrl to cards, deduplicating by name", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ image_uris: { normal: "https://cards.scryfall.io/img.jpg" } }],
      }),
    });

    const cards = [
      { name: "Lightning Bolt", quantity: 4, board: "main" as const },
      { name: "Lightning Bolt", quantity: 2, board: "side" as const },
      { name: "Counterspell", quantity: 4, board: "main" as const },
    ];

    await enrichCardsWithImages(cards);

    // Only 2 unique names, so only 2 fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(cards[0].imageUrl).toBe("https://cards.scryfall.io/img.jpg");
    expect(cards[1].imageUrl).toBe("https://cards.scryfall.io/img.jpg");
    expect(cards[2].imageUrl).toBe("https://cards.scryfall.io/img.jpg");
  });
});
