import { describe, it, expect } from "vitest";
import { calcBrierScore, brierLabel } from "../src/brier.js";

describe("calcBrierScore", () => {
  it("returns null with no predictions", () => {
    expect(calcBrierScore([])).toBeNull();
  });

  it("scores a perfect forecast as 0.000", () => {
    expect(calcBrierScore([{ probability: 1, resolved: true }])).toBe("0.000");
    expect(calcBrierScore([{ probability: 0, resolved: false }])).toBe("0.000");
  });

  it("scores a maximally wrong forecast as 1.000", () => {
    expect(calcBrierScore([{ probability: 0, resolved: true }])).toBe("1.000");
  });

  it("averages across predictions", () => {
    const score = calcBrierScore([
      { probability: 0.7, resolved: true },  // (0.7 - 1)² = 0.09
      { probability: 0.7, resolved: false }, // (0.7 - 0)² = 0.49
    ]);
    expect(score).toBe("0.290");
  });
});

describe("brierLabel", () => {
  it("handles the no-data case", () => {
    expect(brierLabel(null).label).toBe("No data");
  });

  it("maps scores to tiers with correct boundaries", () => {
    expect(brierLabel("0.089").label).toBe("Oracle");
    expect(brierLabel("0.1").label).toBe("Expert");   // boundary: 0.1 is not < 0.1
    expect(brierLabel("0.149").label).toBe("Expert");
    expect(brierLabel("0.15").label).toBe("Analyst");
    expect(brierLabel("0.2").label).toBe("Novice");
    expect(brierLabel("0.9").label).toBe("Novice");
  });
});
