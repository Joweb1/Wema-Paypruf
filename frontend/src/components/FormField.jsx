import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function TextField({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  disabled = false,
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label} {required && <b aria-hidden="true">*</b>}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <small className="field-error" id={`${name}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}

export function PasswordField({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  autoComplete,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="field">
      <label htmlFor={name}>
        {label} {required && <b aria-hidden="true">*</b>}
      </label>
      <div className="password-field">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <small className="field-error" id={`${name}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
