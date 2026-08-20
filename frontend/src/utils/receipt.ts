export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
export const RECEIPT_ACCEPT = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";

const allowedTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
const allowedExtensions = new Set(["png", "jpg", "jpeg", "pdf"]);

export function validateReceipt(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!allowedTypes.has(file.type) || !allowedExtensions.has(extension)) {
    return "Choose a PNG, JPG, JPEG, or PDF receipt.";
  }
  if (file.size <= 0) return "This file is empty. Choose a valid receipt.";
  if (file.size > MAX_RECEIPT_BYTES) return "Receipt files must be 8 MB or smaller.";
  return null;
}
