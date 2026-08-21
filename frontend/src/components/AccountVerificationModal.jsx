import { useState, useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";
import { api, getErrorMessage } from "../services/api";

export function AccountVerificationModal({
  isOpen,
  onClose,
  onNavigateToUpload,
  onNavigateToCheckRisk,
}) {
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (accountName) {
          setAccountName(null);
          setAccountNumber("");
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, accountName]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (accountName) {
        setAccountName(null);
        setAccountNumber("");
      } else {
        onClose();
      }
    }
  };

  const formatAccountNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    return digits;
  };

  const handleAccountNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAccountNumber(formatAccountNumber(raw));
    setError(null);
  };

  const validateAccountNumber = async () => {
    const cleanNumber = accountNumber.replace(/\s/g, "");

    if (cleanNumber.length < 10) {
      setError("Please enter a valid 10-digit account number.");
      return null;
    }

    setIsLoading(true);
    try {
      const data = await api.lookupAccount(cleanNumber);
      setIsLoading(false);
      return data;
    } catch (err) {
      setIsLoading(false);
      setError(getErrorMessage(err));
      return null;
    }
  };

  const handleVerify = async () => {
    setError(null);
    const result = await validateAccountNumber();
    if (result) {
      setAccountName(result.accountName || result.businessName || "Registered Merchant");
    }
  };

  const handleNext = () => {
    if (accountName) {
      onNavigateToUpload(accountName);
    }
  };

  const handleCheckRisk = () => {
    if (onNavigateToCheckRisk) {
      onNavigateToCheckRisk(accountNumber || accountName);
    }
  };

  const handleClose = () => {
    if (accountName) {
      setAccountName(null);
      setAccountNumber("");
    } else {
      setAccountNumber("");
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div className="modal-card" ref={modalRef} style={{ maxWidth: "480px" }}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Account Search</span>
            <h2 id="verification-modal-title">
              {accountName ? "Account Verified" : "Verify Payment Account"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {!accountName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
            >
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
                Enter the merchant or receiver Wema account number to verify payments.
              </p>

              <div className="field" style={{ margin: "18px 0" }}>
                <label htmlFor="account-number-input">
                  Merchant/Receiver Account No <b aria-hidden="true">*</b>
                </label>
                <input
                  type="text"
                  id="account-number-input"
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={handleAccountNumberChange}
                  maxLength={10}
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="inline-alert" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="button button-primary"
                style={{ width: "100%" }}
                disabled={isLoading || accountNumber.replace(/\s/g, "").length < 10}
              >
                {isLoading ? "Verifying..." : "Verify Account"}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  margin: "0 auto 16px",
                  borderRadius: "50%",
                  background: "var(--confirmed-soft)",
                  color: "var(--confirmed)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: "0 0 6px" }}>{accountName}</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 20px" }}>
                Account verified. Ready to upload payment receipt.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  className="button button-primary"
                  onClick={handleNext}
                  style={{ width: "100%" }}
                >
                  Upload Receipt
                </button>
                {onNavigateToCheckRisk && (
                  <button
                    className="button button-risk"
                    onClick={handleCheckRisk}
                    style={{ width: "100%" }}
                  >
                    <ShieldAlert size={16} />
                    <span>Check Account Risk</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountVerificationModal;
