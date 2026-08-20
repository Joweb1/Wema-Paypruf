import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { PageLoader } from "../components/AsyncState";
import { PasswordField, TextField } from "../components/FormField";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../services/api";
import { validatePassword } from "../utils/auth-validation";

export function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Loading PayPruf" />;
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from || "/dashboard";
    return <Navigate to={from} replace />;
  }

  function validateAll() {
    const next: Record<string, string> = {};
    if (!identifier.trim()) next.identifier = "Enter your email, phone, or Wema account number.";
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validateAll()) return;
    setIsSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password });
    } catch (error) {
      const message = getErrorMessage(error);
      if (
        error instanceof Error &&
        (error as { code?: string }).code === "INVALID_CREDENTIALS"
      ) {
        setServerError("Invalid login details.");
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
        <h1>Sign in to PayPruf</h1>
        <p className="auth-subtitle">Access your merchant dashboard and payments.</p>

        {serverError && (
          <div className="inline-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email, phone or Wema account number"
            name="identifier"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            placeholder="you@example.com, +2348012345678, or 0123456789"
            autoComplete="username"
          />

          <PasswordField
            label="Password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
          />

          <button
            type="submit"
            className="button button-primary button-large auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
