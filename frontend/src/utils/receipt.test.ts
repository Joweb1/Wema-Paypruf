import { describe, expect, it } from "vitest";
import { MAX_RECEIPT_BYTES, validateReceipt } from "./receipt";

describe("validateReceipt", () => {
  it("accepts supported images and PDFs", () => {
    expect(validateReceipt(new File(["image"], "receipt.png", { type: "image/png" }))).toBeNull();
    expect(validateReceipt(new File(["pdf"], "receipt.pdf", { type: "application/pdf" }))).toBeNull();
  });

  it("rejects a mismatched or unsupported type", () => {
    expect(validateReceipt(new File(["text"], "receipt.exe", { type: "text/plain" }))).toMatch(/PNG, JPG, JPEG, or PDF/);
    expect(validateReceipt(new File(["image"], "receipt.png", { type: "text/plain" }))).toMatch(/PNG, JPG, JPEG, or PDF/);
  });

  it("rejects empty and oversized files", () => {
    expect(validateReceipt(new File([], "receipt.jpg", { type: "image/jpeg" }))).toMatch(/empty/);
    const tooLarge = new File(["large"], "receipt.jpg", { type: "image/jpeg" });
    Object.defineProperty(tooLarge, "size", { value: MAX_RECEIPT_BYTES + 1 });
    expect(validateReceipt(tooLarge)).toMatch(/8 MB/);
  });
});
