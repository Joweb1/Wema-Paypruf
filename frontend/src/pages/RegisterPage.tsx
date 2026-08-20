import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { PageLoader } from "../components/AsyncState";
import { PasswordField, TextField } from "../components/FormField";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../services/api";
import type { RegistrationMethod } from "../types/api";
import {
  validateIdentifier,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
} from "../utils/auth-validation";

const methods: { value: RegistrationMethod; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "wema", label: "Wema Account" },
];

export function RegisterPage() {
  const [method, setMethod] = useState<RegistrationMethod>("email");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Loading PayPruf" />;
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from || "/dashboard";
    return <Navigate to={from} replace />;
  }

  function validateAll() {
    const next: Record<string, string> = {};
    const nameErr = validateFullName(fullName);
    if (nameErr) next.fullName = nameErr;

    const idErr = validateIdentifier(method, identifier);
    if (idErr) next.identifier = idErr;

    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;

    const matchErr = validatePasswordMatch(password, confirmPassword);
    if (matchErr) next.confirmPassword = matchErr;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validateAll()) return;
    setIsSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        method,
        identifier: identifier.trim(),
        password,
        confirmPassword,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      if (error instanceof Error && (error as { code?: string }).code === "DUPLICATE_IDENTIFIER") {
        setErrors((prev) => ({ ...prev, identifier: message }));
      } else if (
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

  const identifierLabel =
    method === "email" ? "Email address" : method === "phone" ? "Phone number" : "Wema Bank account number";
  const identifierPlaceholder =
    method === "email" ? "you@example.com" : method === "phone" ? "08012345678" : "0123456789";
  const identifierAutoComplete = method === "email" ? "email" : method === "phone" ? "tel" : undefined;
  const identifierInputMode = method === "email" ? "email" : method === "phone" ? "tel" : "numeric";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-icon">
          <ShieldCheck size={24} />
        </span>
        <h1>Create your PayPruf account</h1>
        <p className="auth-subtitle">Start verifying payments with confidence.</p>

        {serverError && (
          <div className="inline-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>Register with</label>
            <div className="toggle-group" role="tablist" aria-label="Registration method">
              {methods.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`toggle-pill ${method === item.value ? "is-active" : ""}`}
                  role="tab"
                  aria-selected={method === item.value}
                  onClick={() => {
                    setMethod(item.value);
                    setIdentifier("");
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.identifier;
                      return next;
                    });
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Full name"
            name="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            autoComplete="name"
          />

          <TextField
            label={identifierLabel}
            name="identifier"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            placeholder={identifierPlaceholder}
            autoComplete={identifierAutoComplete}
            inputMode={identifierInputMode}
            maxLength={method === "wema" ? 10 : 254}
          />

          <PasswordField
            label="Password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <button
            type="submit"
            className="button button-primary button-large auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
