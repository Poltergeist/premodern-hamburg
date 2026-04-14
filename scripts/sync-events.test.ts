import { describe, it, expect } from "vitest";
import type { Event } from "../src/data/events.ts";
import {
  topdeckIdFromLink,
  stripHtml,
  formatGermanDate,
  formatEventName,
  formatEventId,
  formatDatetime,
  formatEntryFee,
  buildEventFromApi,
  mergeEvents,
} from "./sync-events.ts";

// ---------------------------------------------------------------------------
// topdeckIdFromLink
// ---------------------------------------------------------------------------

describe("topdeckIdFromLink", () => {
  it("extracts ID from a valid topdeck link", () => {
    expect(
      topdeckIdFromLink("https://topdeck.gg/event/untap-altona-premodern-weekly-1504"),
    ).toBe("untap-altona-premodern-weekly-1504");
  });

  it("returns undefined for undefined input", () => {
    expect(topdeckIdFromLink(undefined)).toBeUndefined();
  });

  it("returns undefined for a non-topdeck link", () => {
    expect(topdeckIdFromLink("https://example.com/event/123")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

describe("stripHtml", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("converts <br> to newlines", () => {
    expect(stripHtml("Line 1<br>Line 2")).toBe("Line 1\nLine 2");
  });

  it("converts paragraph breaks to double newlines", () => {
    expect(stripHtml("<p>Para 1</p>\n<p>Para 2</p>")).toBe("Para 1\n\nPara 2");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &#39;")).toBe('& < > " \'');
  });
});

// ---------------------------------------------------------------------------
// Date formatting (using a known timestamp: Apr 15, 2026 18:30 CEST)
// ---------------------------------------------------------------------------

const APR15_UNIX = 1776270600;
const APR15_DATE = new Date(APR15_UNIX * 1000);

describe("formatGermanDate", () => {
  it("formats a date in German with weekday", () => {
    expect(formatGermanDate(APR15_DATE)).toBe("Mittwoch, 15.04.2026");
  });
});

describe("formatEventName", () => {
  it("formats a human-readable German event name", () => {
    expect(formatEventName(APR15_DATE)).toBe("PreModern Hamburg - 15. April 2026");
  });
});

describe("formatEventId", () => {
  it("generates a date-city based ID", () => {
    expect(formatEventId(APR15_DATE, "Hamburg")).toBe("2026-04-15-hamburg");
  });
});

describe("formatDatetime", () => {
  it("formats an ISO-like datetime string", () => {
    expect(formatDatetime(APR15_DATE)).toBe("2026-04-15T18:30:00");
  });
});

// ---------------------------------------------------------------------------
// formatEntryFee
// ---------------------------------------------------------------------------

describe("formatEntryFee", () => {
  it("formats EUR price", () => {
    expect(formatEntryFee(5, "eur")).toBe("5€");
  });

  it("returns undefined for zero price", () => {
    expect(formatEntryFee(0, "eur")).toBeUndefined();
  });

  it("uses uppercase currency code for non-EUR", () => {
    expect(formatEntryFee(10, "usd")).toBe("10USD");
  });
});

// ---------------------------------------------------------------------------
// buildEventFromApi
// ---------------------------------------------------------------------------

describe("buildEventFromApi", () => {
  const detail = {
    id: "untap-altona-premodern-weekly-1504",
    name: "Untap Altona Premodern Weekly 15.04",
    startUnix: APR15_UNIX,
    location: "Spritzenpl. 5, 22765 Hamburg, Germany",
    city: "Hamburg",
    details: "<p>Hello world</p>",
    price: 5,
    currency: "eur",
    format: null,
    playerCap: 24,
    allowReg: true,
  };

  const listEvent = {
    id: "untap-altona-premodern-weekly-1504",
    game: "Magic: The Gathering",
    format: "Premodern",
    name: "Untap Altona Premodern Weekly 15.04",
    start: "Apr 15, 2026",
    city: "Hamburg",
    location: "Spritzenpl. 5, 22765 Hamburg, Germany",
    players: "0",
  };

  it("transforms API data into an Event", () => {
    const event = buildEventFromApi(detail, listEvent);
    expect(event.id).toBe("2026-04-15-hamburg");
    expect(event.date).toBe("Mittwoch, 15.04.2026");
    expect(event.datetime).toBe("2026-04-15T18:30:00");
    expect(event.name).toBe("PreModern Hamburg - 15. April 2026");
    expect(event.category).toBe("Untap Altona PreModern");
    expect(event.location.name).toBe("Weidenkantine");
    expect(event.location.address).toBe("Spritzenpl. 5, 22765 Hamburg, Germany");
    expect(event.description).toBe("Hello world");
    expect(event.format).toBe("Premodern");
    expect(event.entryFee).toBe("5€");
    expect(event.prizes).toBe("Premodern Staples");
    expect(event.registrationLink).toBe(
      "https://topdeck.gg/event/untap-altona-premodern-weekly-1504",
    );
    expect(event.status).toBe("upcoming");
  });
});

// ---------------------------------------------------------------------------
// mergeEvents
// ---------------------------------------------------------------------------

describe("mergeEvents", () => {
  const now = new Date("2026-04-14T12:00:00");

  const existingCompleted: Event = {
    id: "2026-04-01-hamburg",
    date: "Mittwoch, 01.04.2026",
    datetime: "2026-04-01T18:30:00",
    name: "PreModern Hamburg - 1. April 2026",
    category: "Untap Altona PreModern",
    location: { name: "Weidenkantine", address: "Addr" },
    description: "Desc",
    format: "PreModern",
    registrationLink: "https://topdeck.gg/event/old-event-0104",
    status: "completed",
  };

  const existingUpcoming: Event = {
    id: "2026-04-15-hamburg",
    date: "Mittwoch, 15.04.2026",
    datetime: "2026-04-15T18:30:00",
    name: "PreModern Hamburg - 15. April 2026",
    category: "Untap Altona PreModern",
    location: { name: "Weidenkantine", address: "Addr" },
    description: "Desc",
    format: "PreModern",
    registrationLink: "https://topdeck.gg/event/event-1504",
    status: "upcoming",
  };

  const existingCancelled: Event = {
    id: "2026-04-08-hamburg",
    date: "Mittwoch, 08.04.2026",
    datetime: "2026-04-08T18:30:00",
    name: "PreModern Hamburg - 8. April 2026",
    category: "Untap Altona PreModern",
    location: { name: "Weidenkantine", address: "Addr" },
    description: "Desc",
    format: "PreModern",
    registrationLink: "https://topdeck.gg/event/event-0804",
    status: "cancelled",
  };

  const incomingNew: Event = {
    id: "2026-04-22-hamburg",
    date: "Mittwoch, 22.04.2026",
    datetime: "2026-04-22T18:30:00",
    name: "PreModern Hamburg - 22. April 2026",
    category: "Untap Altona PreModern",
    location: { name: "Weidenkantine", address: "Addr" },
    description: "Desc",
    format: "PreModern",
    registrationLink: "https://topdeck.gg/event/event-2204",
    status: "upcoming",
  };

  const incomingExisting: Event = {
    id: "2026-04-15-hamburg",
    date: "Mittwoch, 15.04.2026",
    datetime: "2026-04-15T18:30:00",
    name: "PreModern Hamburg - 15. April 2026",
    category: "Untap Altona PreModern",
    location: { name: "Weidenkantine", address: "Addr" },
    description: "Different desc from API",
    format: "PreModern",
    registrationLink: "https://topdeck.gg/event/event-1504",
    status: "upcoming",
  };

  it("adds new events not in existing", () => {
    const result = mergeEvents([existingUpcoming], [incomingNew], now);
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.id === "2026-04-22-hamburg")).toBeDefined();
  });

  it("preserves existing events matched by topdeck ID", () => {
    const result = mergeEvents([existingUpcoming], [incomingExisting], now);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Desc"); // keeps original, not API version
  });

  it("marks past upcoming events as completed", () => {
    const pastUpcoming: Event = {
      ...existingUpcoming,
      id: "2026-04-10-hamburg",
      datetime: "2026-04-10T18:30:00",
      registrationLink: "https://topdeck.gg/event/event-1004",
    };
    const result = mergeEvents([pastUpcoming], [], now);
    expect(result[0].status).toBe("completed");
  });

  it("never overwrites cancelled status", () => {
    const result = mergeEvents([existingCancelled], [], now);
    expect(result[0].status).toBe("cancelled");
  });

  it("does not delete existing events missing from incoming", () => {
    const result = mergeEvents(
      [existingCompleted, existingUpcoming],
      [],
      now,
    );
    expect(result).toHaveLength(2);
  });

  it("sorts output by datetime ascending", () => {
    const result = mergeEvents(
      [existingUpcoming, existingCompleted],
      [incomingNew],
      now,
    );
    expect(result.map((e) => e.id)).toEqual([
      "2026-04-01-hamburg",
      "2026-04-15-hamburg",
      "2026-04-22-hamburg",
    ]);
  });

  it("handles empty existing array", () => {
    const result = mergeEvents([], [incomingNew], now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2026-04-22-hamburg");
  });

  it("handles empty incoming array", () => {
    const result = mergeEvents([existingCompleted], [], now);
    expect(result).toHaveLength(1);
  });
});
