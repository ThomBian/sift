import { describe, it, expect } from "vitest";
import {
  EMOJI_POOL,
  ALL_EMOJIS,
  getRandomEmoji,
  searchEmojis,
} from "../emojiPool";

describe("emojiPool", () => {
  it("EMOJI_POOL has at least 6 categories", () => {
    expect(EMOJI_POOL.length).toBeGreaterThanOrEqual(6);
  });

  it("every category has a name and at least 3 emojis", () => {
    for (const cat of EMOJI_POOL) {
      expect(cat.category).toBeTruthy();
      expect(cat.emojis.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("ALL_EMOJIS is a flat array of every emoji", () => {
    const total = EMOJI_POOL.reduce((sum, c) => sum + c.emojis.length, 0);
    expect(ALL_EMOJIS).toHaveLength(total);
  });

  it("getRandomEmoji returns a string from the pool", () => {
    const emoji = getRandomEmoji();
    expect(typeof emoji).toBe("string");
    expect(ALL_EMOJIS).toContain(emoji);
  });

  it("searchEmojis filters by keyword", () => {
    const results = searchEmojis("rocket");
    expect(results).toContain("🚀");
  });

  it("searchEmojis returns all emojis for empty query", () => {
    const results = searchEmojis("");
    expect(results).toEqual(ALL_EMOJIS);
  });

  it("searchEmojis returns empty array for no match", () => {
    const results = searchEmojis("xyznonexistent");
    expect(results).toEqual([]);
  });
});
