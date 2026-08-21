import { FileCheck2, FileImage, FileText, RefreshCw, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatFileSize } from "../utils/format";
import { RECEIPT_ACCEPT, validateReceipt } from "../utils/receipt";

export function ReceiptUploader({
  file,
  onFile,
  onError,
  disabled = false,
  existingReceipt,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const nextPreview = URL.createObjectURL(file);
    setPreview(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [file]);

  const selectFile = (candidate) => {
    if (!candidate) return;
    const validationError = validateReceipt(candidate);
    setError(validationError);
    onError?.(validationError);
    if (validationError) {
      onFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onFile(candidate);
  };

  const handleChange = (event) => selectFile(event.target.files?.[0]);
  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) selectFile(event.dataTransfer.files?.[0]);
  };
  const clear = () => {
    onFile(null);
    setError(null);
    onError?.(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="receipt-field">
      <input
        className="sr-only"
        id={inputId}
        ref={inputRef}
        type="file"
        accept={RECEIPT_ACCEPT}
        onChange={handleChange}
        disabled={disabled}
      />
      {file ? (
        <div className="selected-receipt">
          <div className="receipt-preview">
            {preview ? (
              <img src={preview} alt="Selected receipt preview" />
            ) : (
              <FileText size={34} aria-hidden="true" />
            )}
          </div>
          <div className="selected-file-copy">
            <span className="valid-file">
              <FileCheck2 size={16} /> Ready to upload
            </span>
            <strong>{file.name}</strong>
            <small>
              {formatFileSize(file.size)} ·{" "}
              {file.type === "application/pdf" ? "PDF document" : "Receipt image"}
            </small>
          </div>
          <div className="selected-file-actions">
            <label className="icon-label" htmlFor={inputId}>
              <RefreshCw size={17} /> Replace
            </label>
            <button
              type="button"
              className="icon-button"
              onClick={clear}
              aria-label="Remove selected receipt"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`receipt-dropzone${dragging ? " is-dragging" : ""}${
            error ? " has-error" : ""
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span className="upload-icon">
            <UploadCloud size={28} aria-hidden="true" />
          </span>
          <strong>
            {existingReceipt
              ? "Replace the current receipt"
              : "Upload your payment receipt"}
          </strong>
          <p>Drag and drop here, or choose a file from your device.</p>
          <label className="button button-secondary" htmlFor={inputId}>
            <FileImage size={17} /> Choose receipt
          </label>
          <small>PNG, JPG, JPEG, or single-page PDF · Maximum 8 MB</small>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
