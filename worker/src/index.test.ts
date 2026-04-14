import { describe, it, expect } from "vitest";
import { levenshtein, normalize, fuzzyMatch } from "./levenshtein";

// ---------------------------------------------------------------------------
// levenshtein
// ---------------------------------------------------------------------------

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("returns the length of the other string when one is empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("calculates distance for substitutions", () => {
    expect(levenshtein("cat", "car")).toBe(1);
  });

  it("calculates distance for insertions and deletions", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe("normalize", () => {
  it("lowercases and trims", () => {
    expect(normalize("  Lightning Bolt  ")).toBe("lightning bolt");
  });

  it("removes accents", () => {
    expect(normalize("Séance")).toBe("seance");
  });
});

// ---------------------------------------------------------------------------
// fuzzyMatch
// ---------------------------------------------------------------------------

describe("fuzzyMatch", () => {
  it("matches exact names", () => {
    expect(fuzzyMatch("Lightning Bolt", "Lightning Bolt")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(fuzzyMatch("lightning bolt", "Lightning Bolt")).toBe(true);
  });

  it("matches with small typos", () => {
    expect(fuzzyMatch("Ligthning Bolt", "Lightning Bolt")).toBe(true);
  });

  it("matches substrings (3+ chars)", () => {
    expect(fuzzyMatch("Psychatog", "Psychatog")).toBe(true);
    expect(fuzzyMatch("Lightning", "Lightning Bolt")).toBe(true);
  });

  it("rejects completely wrong names", () => {
    expect(fuzzyMatch("Counterspell", "Lightning Bolt")).toBe(false);
  });

  it("rejects short substrings (< 3 chars)", () => {
    expect(fuzzyMatch("Li", "Lightning Bolt")).toBe(false);
  });

  it("handles accented characters", () => {
    expect(fuzzyMatch("Seance", "Séance")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

describe("deck URL validation", () => {
  const DECK_URL_PATTERN = /^https:\/\/(www\.)?(moxfield\.com\/decks\/|archidekt\.com\/decks\/)/;

  it("accepts moxfield URLs", () => {
    expect(DECK_URL_PATTERN.test("https://www.moxfield.com/decks/abc123")).toBe(true);
    expect(DECK_URL_PATTERN.test("https://moxfield.com/decks/abc123")).toBe(true);
  });

  it("accepts archidekt URLs", () => {
    expect(DECK_URL_PATTERN.test("https://archidekt.com/decks/123456")).toBe(true);
    expect(DECK_URL_PATTERN.test("https://www.archidekt.com/decks/123456")).toBe(true);
  });

  it("rejects other URLs", () => {
    expect(DECK_URL_PATTERN.test("https://example.com/decks/123")).toBe(false);
    expect(DECK_URL_PATTERN.test("https://evil.com/moxfield.com/decks/x")).toBe(false);
  });

  it("rejects non-https URLs", () => {
    expect(DECK_URL_PATTERN.test("http://moxfield.com/decks/abc")).toBe(false);
  });
});
