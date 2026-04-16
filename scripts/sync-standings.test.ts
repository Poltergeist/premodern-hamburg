import { describe, it, expect } from "vitest";
import { parseCsv, groupByEvent } from "./sync-standings";

describe("parseCsv", () => {
  it("parses CSV with header row", () => {
    const csv = `timestamp,eventId,rank,player,pts,ow%,gw%,ogw%
2026-04-16T10:00:00Z,weekly-15,1,Michel,9,52.08%,77.78%,50%
2026-04-16T10:00:00Z,weekly-15,2,Jan,9,52%,66.67%,53.03%`;

    const rows = parseCsv(csv);
    expect(rows).toEqual([
      { timestamp: "2026-04-16T10:00:00Z", eventId: "weekly-15", rank: 1, player: "Michel", points: 9, owp: "52.08%", gwp: "77.78%", ogwp: "50%" },
      { timestamp: "2026-04-16T10:00:00Z", eventId: "weekly-15", rank: 2, player: "Jan", points: 9, owp: "52%", gwp: "66.67%", ogwp: "53.03%" },
    ]);
  });

  it("handles quoted fields", () => {
    const csv = `timestamp,eventId,rank,player,pts,ow%,gw%,ogw%
2026-04-16T10:00:00Z,weekly-15,1,"Player, Jr.",9,52%,77%,50%`;

    const rows = parseCsv(csv);
    expect(rows[0].player).toBe("Player, Jr.");
  });

  it("skips rows with missing rank", () => {
    const csv = `timestamp,eventId,rank,player,pts,ow%,gw%,ogw%
2026-04-16T10:00:00Z,weekly-15,,Michel,9,52%,77%,50%`;

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for header-only CSV", () => {
    expect(parseCsv("timestamp,eventId,rank,player,pts,ow%,gw%,ogw%")).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("handles missing percentage columns", () => {
    const csv = `timestamp,eventId,rank,player,pts,ow%,gw%,ogw%
2026-04-16T10:00:00Z,weekly-15,1,Michel,9,,,`;

    const rows = parseCsv(csv);
    expect(rows[0].owp).toBe("");
    expect(rows[0].gwp).toBe("");
    expect(rows[0].ogwp).toBe("");
  });
});

describe("groupByEvent", () => {
  it("groups entries by eventId and sorts by rank", () => {
    const rows = [
      { timestamp: "2026-04-16T10:00:00Z", eventId: "event-a", rank: 2, player: "Max", points: 6, owp: "50%", gwp: "50%", ogwp: "50%" },
      { timestamp: "2026-04-16T10:00:00Z", eventId: "event-b", rank: 1, player: "Anna", points: 9, owp: "60%", gwp: "70%", ogwp: "55%" },
      { timestamp: "2026-04-16T10:00:00Z", eventId: "event-a", rank: 1, player: "Tom", points: 9, owp: "55%", gwp: "65%", ogwp: "52%" },
    ];

    const grouped = groupByEvent(rows);
    expect(grouped["event-a"]).toEqual([
      { rank: 1, player: "Tom", points: 9, owp: "55%", gwp: "65%", ogwp: "52%" },
      { rank: 2, player: "Max", points: 6, owp: "50%", gwp: "50%", ogwp: "50%" },
    ]);
    expect(grouped["event-b"]).toEqual([
      { rank: 1, player: "Anna", points: 9, owp: "60%", gwp: "70%", ogwp: "55%" },
    ]);
  });

  it("keeps only the latest upload per event", () => {
    const rows = [
      { timestamp: "2026-04-16T10:00:00Z", eventId: "event-a", rank: 1, player: "Old", points: 3, owp: "50%", gwp: "50%", ogwp: "50%" },
      { timestamp: "2026-04-16T12:00:00Z", eventId: "event-a", rank: 1, player: "New", points: 9, owp: "60%", gwp: "70%", ogwp: "55%" },
    ];

    const grouped = groupByEvent(rows);
    expect(grouped["event-a"]).toHaveLength(1);
    expect(grouped["event-a"][0].player).toBe("New");
  });

  it("returns empty object for empty input", () => {
    expect(groupByEvent([])).toEqual({});
  });
});
