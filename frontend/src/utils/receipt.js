export const RECEIPT_ACCEPT = "image/png,image/jpeg,image/jpg,application/pdf";
export const RECEIPT_MAX_BYTES = 8 * 1024 * 1024;

export const validateReceipt = (file) => {
  if (!file) return "Please choose a file to upload.";
  const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return "Unsupported file type. Please upload a PNG, JPG, or PDF.";
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return "Receipt file is too large. Maximum allowed size is 8MB.";
  }
  return null;
};
