import { useState } from "react";

export default function PasswordInput({ value, onChange, placeholder, minLength, required, autoFocus }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        className="modal-input"
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required={required}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}
