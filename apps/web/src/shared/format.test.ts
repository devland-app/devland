import { describe, expect, it } from "vitest";

import { formatCoins } from "./format.ts";

describe("formatCoins", () => {
  it.each([
    [0, "0 moedas"],
    [1, "1 moeda"],
    [24, "24 moedas"],
    [1830, "1.830 moedas"],
  ])("%i vira %s", (coins, text) => {
    expect(formatCoins(coins)).toBe(text);
  });
});
