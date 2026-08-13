import { describe, it, expect } from "vitest";
import { LMSR_B, lmsrCost, lmsrPrice } from "../src/lmsr.js";

describe("lmsrPrice", () => {
  it("prices 50/50 when inventories are equal", () => {
    expect(lmsrPrice(100, 100, "yes")).toBeCloseTo(0.5, 10);
    expect(lmsrPrice(100, 100, "no")).toBeCloseTo(0.5, 10);
  });

  it("yes and no prices always sum to 1", () => {
    for (const [qYes, qNo] of [[0, 0], [120, 60], [40, 90], [500, 3], [0, 250]]) {
      expect(lmsrPrice(qYes, qNo, "yes") + lmsrPrice(qYes, qNo, "no")).toBeCloseTo(1, 10);
    }
  });

  it("stays strictly between 0 and 1", () => {
    expect(lmsrPrice(1000, 0, "yes")).toBeLessThan(1);
    expect(lmsrPrice(0, 1000, "yes")).toBeGreaterThan(0);
  });

  it("buying yes shares raises the yes price", () => {
    const before = lmsrPrice(120, 60, "yes");
    const after = lmsrPrice(130, 60, "yes");
    expect(after).toBeGreaterThan(before);
  });
});

describe("lmsrCost", () => {
  it("is b·ln(2) at market creation (zero inventory)", () => {
    expect(lmsrCost(0, 0)).toBeCloseTo(LMSR_B * Math.log(2), 10);
  });

  it("cost of a trade equals cost delta and is positive", () => {
    const cost = lmsrCost(130, 60) - lmsrCost(120, 60);
    expect(cost).toBeGreaterThan(0);
    // 10 shares can never cost more than 10 (price per share < 1)
    expect(cost).toBeLessThan(10);
  });

  it("marginal cost approximates the instantaneous price", () => {
    const delta = 0.001;
    const marginal = (lmsrCost(120 + delta, 60) - lmsrCost(120, 60)) / delta;
    expect(marginal).toBeCloseTo(lmsrPrice(120, 60, "yes"), 4);
  });

  it("is monotonically increasing in either inventory", () => {
    expect(lmsrCost(121, 60)).toBeGreaterThan(lmsrCost(120, 60));
    expect(lmsrCost(120, 61)).toBeGreaterThan(lmsrCost(120, 60));
  });
});
