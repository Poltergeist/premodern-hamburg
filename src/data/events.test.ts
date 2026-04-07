import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  events,
  getEventById,
  getUpcomingEvents,
  getEventsByCategory,
  getHomepageEvents,
  type Event,
} from "./events";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const upcoming1: Event = {
  id: "test-upcoming-1",
  date: "Monday, 01.06.2026",
  datetime: "2026-06-01T18:00:00",
  name: "Test Upcoming 1",
  category: "Category A",
  location: { name: "Venue A", address: "Street 1" },
  description: "Description A",
  format: "PreModern",
  status: "upcoming",
};

const upcoming2: Event = {
  id: "test-upcoming-2",
  date: "Tuesday, 02.06.2026",
  datetime: "2026-06-02T18:00:00",
  name: "Test Upcoming 2",
  category: "Category B",
  location: { name: "Venue B", address: "Street 2" },
  description: "Description B",
  format: "PreModern",
  status: "upcoming",
};

const completed: Event = {
  id: "test-completed",
  date: "Monday, 01.01.2026",
  datetime: "2026-01-01T18:00:00",
  name: "Test Completed",
  category: "Category A",
  location: { name: "Venue A", address: "Street 1" },
  description: "Description C",
  format: "PreModern",
  status: "completed",
};

const cancelled: Event = {
  id: "test-cancelled",
  date: "Monday, 01.02.2026",
  datetime: "2026-02-01T18:00:00",
  name: "Test Cancelled",
  category: "Category A",
  location: { name: "Venue A", address: "Street 1" },
  description: "Description D",
  format: "PreModern",
  status: "cancelled",
};

// ---------------------------------------------------------------------------
// Helpers to temporarily replace the events array contents
// ---------------------------------------------------------------------------

function seedEvents(...fixtures: Event[]) {
  events.length = 0;
  events.push(...fixtures);
}

let originalEvents: Event[];

beforeEach(() => {
  originalEvents = [...events];
});

afterEach(() => {
  events.length = 0;
  events.push(...originalEvents);
});

// ---------------------------------------------------------------------------
// getEventById
// ---------------------------------------------------------------------------

describe("getEventById", () => {
  it("returns the matching event", () => {
    seedEvents(upcoming1, upcoming2);
    expect(getEventById("test-upcoming-1")).toEqual(upcoming1);
  });

  it("returns undefined for an unknown id", () => {
    seedEvents(upcoming1);
    expect(getEventById("does-not-exist")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getUpcomingEvents
// ---------------------------------------------------------------------------

describe("getUpcomingEvents", () => {
  it("returns only upcoming events", () => {
    seedEvents(upcoming1, completed, cancelled);
    const result = getUpcomingEvents();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test-upcoming-1");
  });

  it("returns events sorted ascending by datetime", () => {
    // Insert in reverse order to prove sorting works
    seedEvents(upcoming2, upcoming1);
    const result = getUpcomingEvents();
    expect(result[0].id).toBe("test-upcoming-1");
    expect(result[1].id).toBe("test-upcoming-2");
  });

  it("returns an empty array when there are no upcoming events", () => {
    seedEvents(completed, cancelled);
    expect(getUpcomingEvents()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getEventsByCategory
// ---------------------------------------------------------------------------

describe("getEventsByCategory", () => {
  it("groups events by their category", () => {
    seedEvents(upcoming1, upcoming2, completed);
    const result = getEventsByCategory();
    expect(Object.keys(result)).toEqual(
      expect.arrayContaining(["Category A", "Category B"]),
    );
    expect(result["Category A"]).toHaveLength(2);
    expect(result["Category B"]).toHaveLength(1);
  });

  it("returns an empty object when there are no events", () => {
    seedEvents();
    expect(getEventsByCategory()).toEqual({});
  });

  it("preserves event data within categories", () => {
    seedEvents(upcoming1);
    const result = getEventsByCategory();
    expect(result["Category A"][0]).toEqual(upcoming1);
  });
});

// ---------------------------------------------------------------------------
// getHomepageEvents
// ---------------------------------------------------------------------------

describe("getHomepageEvents", () => {
  it("splits events into upcoming and passed or cancelled sections", () => {
    seedEvents(upcoming1, completed, cancelled);
    const result = getHomepageEvents();

    expect(Object.keys(result.upcoming)).toEqual(["Category A"]);
    expect(result.upcoming["Category A"][0].id).toBe("test-upcoming-1");
    expect(Object.keys(result.passedOrCancelled)).toEqual(["Category A"]);
    expect(result.passedOrCancelled["Category A"].map((event) => event.id)).toEqual([
      "test-completed",
      "test-cancelled",
    ]);
  });

  it("sorts upcoming and passed/cancelled events by datetime ascending", () => {
    seedEvents(cancelled, upcoming2, completed, upcoming1);
    const result = getHomepageEvents();

    expect(result.upcoming["Category A"][0].id).toBe("test-upcoming-1");
    expect(result.upcoming["Category B"][0].id).toBe("test-upcoming-2");
    expect(result.passedOrCancelled["Category A"].map((event) => event.id)).toEqual([
      "test-completed",
      "test-cancelled",
    ]);
  });

  it("preserves category grouping inside each section", () => {
    seedEvents(upcoming2, upcoming1, completed);
    const result = getHomepageEvents();

    expect(Object.keys(result.upcoming)).toEqual(
      expect.arrayContaining(["Category A", "Category B"]),
    );
    expect(result.upcoming["Category A"][0]).toEqual(upcoming1);
    expect(result.upcoming["Category B"][0]).toEqual(upcoming2);
    expect(result.passedOrCancelled["Category A"][0]).toEqual(completed);
  });

  it("returns empty sections when there are no events", () => {
    seedEvents();
    expect(getHomepageEvents()).toEqual({
      upcoming: {},
      passedOrCancelled: {},
    });
  });

  it("returns an empty upcoming section when only past or cancelled events exist", () => {
    seedEvents(completed, cancelled);
    expect(getHomepageEvents()).toEqual({
      upcoming: {},
      passedOrCancelled: {
        "Category A": [completed, cancelled],
      },
    });
  });
});
