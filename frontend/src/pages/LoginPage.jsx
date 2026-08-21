import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { TextField, PasswordField } from "../components/FormField";
import { PayPrufLogoIcon } from "../components/common/PayPrufLogoIcon";
import { getErrorMessage } from "../services/api";
import { validateIdentifier, validatePassword } from "../utils/auth-validation";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsDemo } = useAuth();

  const [method, setMethod] = useState("wema");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  // Long-press detection on logo & app name for 3-second demo sign in
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const triggeredRef = useRef(false);
  const startTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleDemoSignIn = async () => {
    setServerError(null);
    setErrors({});
    setIsPending(true);
    try {
      await loginAsDemo();
      const from = location.state?.from || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsPending(false);
    }
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handlePointerDown = (e) => {
    // Only primary button / touch
    if (e.button !== undefined && e.button !== 0) return;

    cancelHold();
    triggeredRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);
    startTimeRef.current = Date.now();

    const HOLD_DURATION = 3000; // 3 seconds

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setHoldProgress(pct);
    }, 30);

    holdTimerRef.current = setTimeout(async () => {
      triggeredRef.current = true;
      setIsHolding(false);
      setHoldProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      await handleDemoSignIn();
    }, HOLD_DURATION);
  };

  const handlePointerUp = (e) => {
    if (triggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    cancelHold();
  };

  const handlePointerLeave = () => {
    cancelHold();
  };

  const handlePointerCancel = () => {
    cancelHold();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const nextErrors = {};
    const idError = validateIdentifier(method, identifier);
    if (idError) nextErrors.identifier = idError;
    const passError = validatePassword(password);
    if (passError) nextErrors.password = passError;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsPending(true);
    try {
      await login({ identifier, password });
      const from = location.state?.from || "/dashboard";
      navigate(from, { replace: true });
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

          {/* Long pressable logo & brand lockup */}
          <div
            className={`brand ${isHolding ? "brand-is-holding" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(e) => {
              if (isHolding || triggeredRef.current) e.preventDefault();
            }}
            style={{
              cursor: "pointer",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
              position: "relative",
              padding: "4px 8px",
              borderRadius: "12px",
              transition: "background 150ms ease, transform 150ms ease",
              backgroundColor: isHolding ? "var(--brand-soft)" : "transparent",
              transform: isHolding ? "scale(0.98)" : "none",
            }}
            title="PayPruf"
          >
            <span
              className="brand-mark"
              aria-hidden="true"
              style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <PayPrufLogoIcon size={44} />
              {isHolding && (
                <svg
                  viewBox="0 0 52 52"
                  style={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    width: 52,
                    height: 52,
                    pointerEvents: "none",
                    transform: "rotate(-90deg)",
                  }}
                  aria-hidden="true"
                >
                  <circle
                    cx="26"
                    cy="26"
                    r="24"
                    fill="none"
                    stroke="rgba(123, 37, 131, 0.15)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r="24"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="3"
                    strokeDasharray={150.8}
                    strokeDashoffset={150.8 - (150.8 * holdProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            <span className="brand-lockup">
              <strong>PayPruf</strong>
              <small style={{ color: isHolding ? "var(--brand)" : "var(--muted)", fontWeight: isHolding ? 700 : 500 }}>
                {isHolding
                  ? `Hold for demo access (${Math.max(1, Math.ceil(3 - (holdProgress / 100) * 3))}s)...`
                  : "Proof beyond the receipt"}
              </small>
            </span>
          </div>

          <div className="auth-header-spacer" aria-hidden="true" />
        </div>

        <div style={{ margin: "20px 0 10px" }}>
          <h1>Merchant Sign In</h1>
          <p className="auth-subtitle">
            Sign in to manage and verify your customer payments.
          </p>
        </div>

        {serverError && (
          <div className="inline-alert" role="alert">
            {serverError}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.8rem", fontWeight: 600 }}>
            Sign-in method
          </label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-pill ${method === "wema" ? "is-active" : ""}`}
              onClick={() => {
                setMethod("wema");
                setIdentifier("");
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
                setIdentifier("");
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
                setIdentifier("");
                setErrors({});
              }}
            >
              Phone
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label={
              method === "wema"
                ? "Wema Account Number"
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
                ? "e.g. 0123456789"
                : method === "email"
                ? "e.g. merchant@example.com"
                : "e.g. 08012345678"
            }
            maxLength={method === "wema" ? 10 : undefined}
            required
          />

          <div style={{ marginTop: "14px" }}>
            <PasswordField
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />
          </div>

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={isPending}
            style={{ marginTop: "20px" }}
          >
            <LogIn size={17} />
            {isPending ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have a PayPruf merchant account?{" "}
          <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
