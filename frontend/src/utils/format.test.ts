import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats contract decimal strings without binary floating-point conversion", () => {
    expect(formatMoney("25000.00")).toBe("₦25,000");
    expect(formatMoney("25000.50")).toBe("₦25,000.50");
    expect(formatMoney("900719925474099312345.25")).toBe("₦900,719,925,474,099,312,345.25");
  });

  it("does not misrepresent missing or malformed values as zero", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("not-money")).toBe("—");
  });
});
