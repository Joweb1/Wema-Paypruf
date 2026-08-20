import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { PageLoader } from "../components/AsyncState";
import { TextField } from "../components/FormField";
import { useAuth } from "../auth/AuthContext";
import { api, getErrorMessage } from "../services/api";
import { validateAccountName, validateWema } from "../utils/auth-validation";

export function MerchantOnboardingPage() {
  const { user, merchantOnboardingCompleted, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ wemaAccountNumber?: string } | null>(null);
  const [accountName, setAccountName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();

  const isWemaRegistered = !!user?.wemaAccountNumber;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (merchantOnboardingCompleted) {
      navigate("/dashboard", { replace: true });
      return;
    }
    api
      .getMerchant()
      .then((data) => {
        setProfile(data.profile);
        if (data.profile?.accountName) setAccountName(data.profile.accountName);
        if (data.profile?.businessName) setBusinessName(data.profile.businessName);
      })
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [user, merchantOnboardingCompleted, authLoading, navigate]);

  if (authLoading || pageLoading) return <PageLoader label="Preparing your merchant setup" />;

  function validateAll() {
    const next: Record<string, string> = {};
    if (!isWemaRegistered) {
      const acctErr = validateWema(profile?.wemaAccountNumber || "");
      if (acctErr) next.wemaAccountNumber = acctErr;
    }
    const nameErr = validateAccountName(accountName);
    if (nameErr) next.accountName = nameErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validateAll()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        wemaAccountNumber: isWemaRegistered ? user!.wemaAccountNumber! : (profile?.wemaAccountNumber || ""),
        accountName: accountName.trim(),
        businessName: businessName.trim() || undefined,
      };
      await api.completeOnboarding(payload);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      if (
        error instanceof Error &&
        (error as { code?: string }).code === "VALIDATION_ERROR"
      ) {
        const field = (error as { details?: { field?: string } }).details?.field;
        setErrors((prev) => ({ ...prev, [field || "form"]: message }));
      } else {
        setServerError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-icon">
          <ShieldCheck size={24} />
        </span>
        <h1>Merchant setup</h1>
        <p className="auth-subtitle">
          Connect the Wema Bank account where you receive payments.
        </p>

        {serverError && (
          <div className="inline-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isWemaRegistered ? (
            <div className="field">
              <label>Wema account number</label>
              <input
                type="text"
                value={user.wemaAccountNumber ?? ""}
                readOnly
                disabled
                className="readonly-field"
              />
              <small className="field-hint">
                Using the Wema account you registered with.
              </small>
            </div>
          ) : (
            <TextField
              label="Wema account number"
              name="wemaAccountNumber"
              required
              value={profile?.wemaAccountNumber || ""}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, wemaAccountNumber: e.target.value }))
              }
              error={errors.wemaAccountNumber}
              placeholder="0123456789"
              inputMode="numeric"
              maxLength={10}
            />
          )}

          <TextField
            label="Account name"
            name="accountName"
            required
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            error={errors.accountName}
            placeholder="As it appears on your bank records"
            autoComplete="organization"
          />

          <div className="field">
            <label htmlFor="businessName">Business name (optional)</label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your store or brand name"
              maxLength={120}
            />
          </div>

          <button
            type="submit"
            className="button button-primary button-large auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Setting up..." : "Complete setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
