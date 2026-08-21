import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, User, Mail, Phone, Building } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { TextField, PasswordField } from "../components/FormField";
import { Brand } from "../components/Brand";
import { getErrorMessage } from "../services/api";
import {
  validateFullName,
  validateIdentifier,
  validatePassword,
  validatePasswordMatch,
} from "../utils/auth-validation";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [method, setMethod] = useState("wema");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const nextErrors = {};
    const nameErr = validateFullName(fullName);
    if (nameErr) nextErrors.fullName = nameErr;

    const idErr = validateIdentifier(method, identifier);
    if (idErr) nextErrors.identifier = idErr;

    const passErr = validatePassword(password);
    if (passErr) nextErrors.password = passErr;

    const matchErr = validatePasswordMatch(password, confirmPassword);
    if (matchErr) nextErrors.confirmPassword = matchErr;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsPending(true);
    try {
      const user = await register({
        fullName: fullName.trim(),
        method,
        identifier: identifier.trim(),
        password,
        confirmPassword,
      });
      if (user?.merchantOnboardingCompleted) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/merchant-onboarding", { replace: true });
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header-row">
          <Link
            to="/"
            className="auth-back-btn"
            aria-label="Return to landing page"
            title="Return to landing page"
          >
            <ArrowLeft size={18} />
          </Link>
          <Brand publicHome />
          <div className="auth-header-spacer" aria-hidden="true" />
        </div>
        <div style={{ margin: "20px 0 10px" }}>
          <h1>Create Merchant Account</h1>
          <p className="auth-subtitle">
            Start verifying receipts and protecting your business revenue.
          </p>
        </div>

        {serverError && (
          <div className="inline-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Full Name or Business Name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            placeholder="e.g. Tola Fashion Enterprise"
            required
          />

          <div style={{ margin: "14px 0 8px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.8rem", fontWeight: 600 }}>
              Primary sign-up method
            </label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-pill ${method === "wema" ? "is-active" : ""}`}
                onClick={() => {
                  setMethod("wema");
                  setErrors({});
                }}
              >
                Wema Account
              </button>
              <button
                type="button"
                className={`toggle-pill ${method === "email" ? "is-active" : ""}`}
                onClick={() => {
                  setMethod("email");
                  setErrors({});
                }}
              >
                Email
              </button>
              <button
                type="button"
                className={`toggle-pill ${method === "phone" ? "is-active" : ""}`}
                onClick={() => {
                  setMethod("phone");
                  setErrors({});
                }}
              >
                Phone
              </button>
            </div>
          </div>

          <TextField
            label={
              method === "wema"
                ? "10-Digit Wema Account Number"
                : method === "email"
                ? "Email Address"
                : "Nigerian Phone Number"
            }
            name="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            placeholder={
              method === "wema"
                ? "0123456789"
                : method === "email"
                ? "merchant@example.com"
                : "08012345678"
            }
            maxLength={method === "wema" ? 10 : undefined}
            required
          />

          <div style={{ marginTop: "14px" }}>
            <PasswordField
              label="Create Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />
          </div>

          <div style={{ marginTop: "14px" }}>
            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              required
            />
          </div>

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={isPending}
            style={{ marginTop: "20px" }}
          >
            <UserPlus size={17} />
            {isPending ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
