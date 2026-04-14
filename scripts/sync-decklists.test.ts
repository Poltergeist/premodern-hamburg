import { describe, it, expect } from "vitest";
import { parseCsv, groupByEvent } from "./sync-decklists";

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
