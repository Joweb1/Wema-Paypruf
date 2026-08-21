import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { TextField } from "../components/FormField";
import { Brand } from "../components/Brand";
import { api, getErrorMessage } from "../services/api";
import { validateAccountName, validateWema } from "../utils/auth-validation";

export function MerchantOnboardingPage() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const [wemaAccountNumber, setWemaAccountNumber] = useState(user?.wemaAccountNumber || "");
  const [accountName, setAccountName] = useState(user?.accountName || user?.fullName || "");
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const nextErrors = {};
    const wemaErr = validateWema(wemaAccountNumber);
    if (wemaErr) nextErrors.wemaAccountNumber = wemaErr;

    const nameErr = validateAccountName(accountName);
    if (nameErr) nextErrors.accountName = nameErr;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsPending(true);
    try {
      await completeOnboarding({
        wemaAccountNumber: wemaAccountNumber.trim(),
        accountName: accountName.trim(),
        businessName: (businessName || accountName).trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand publicHome />
        <div style={{ margin: "20px 0 10px" }}>
          <h1>Link Settlement Account</h1>
          <p className="auth-subtitle">
            Connect your Wema Bank account to verify incoming customer payments.
          </p>
        </div>

        {serverError && (
          <div className="inline-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Wema Account Number"
            name="wemaAccountNumber"
            value={wemaAccountNumber}
            onChange={(e) => setWemaAccountNumber(e.target.value.replace(/\D/g, ""))}
            error={errors.wemaAccountNumber}
            placeholder="0123456789"
            maxLength={10}
            required
          />

          <div style={{ marginTop: "14px" }}>
            <TextField
              label="Account Name (as on Wema bank record)"
              name="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              error={errors.accountName}
              placeholder="e.g. Tola Fashion Enterprise"
              required
            />
          </div>

          <div style={{ marginTop: "14px" }}>
            <TextField
              label="Business or Brand Name"
              name="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Tola Fashion (shown to customers)"
            />
          </div>

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={isPending}
            style={{ marginTop: "20px" }}
          >
            <CheckCircle2 size={17} />
            {isPending ? "Connecting Account..." : "Complete Setup & Open Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MerchantOnboardingPage;
