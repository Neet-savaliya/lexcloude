import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api";
import PasswordInput from "../components/PasswordInput";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword]  = useState("");
  const [error, setError]                      = useState("");
  const [done, setDone]                        = useState(false);
  const [loading, setLoading]                  = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!token) return setError("Missing or invalid reset link");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo" style={{ marginBottom: 20 }}>
          <div className="logo-icon">⚖️</div>
          <div>
            <div className="logo-text">LexCloud</div>
            <div className="logo-sub">Legal AI · India</div>
          </div>
        </div>
        <h3>Choose a new password</h3>

        {!token && <div className="auth-error">This reset link is missing its token. Request a new one.</div>}

        {done ? (
          <>
            <div className="auth-success">Password has been reset. You can now log in with your new password.</div>
            <button type="button" className="btn-create" onClick={() => navigate("/login")}>
              Go to login
            </button>
          </>
        ) : (
          <>
            <div>
              <label>New password</label>
              <PasswordInput placeholder="At least 8 characters"
                value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
            </div>
            <div>
              <label>Confirm new password</label>
              <PasswordInput placeholder="At least 8 characters"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} required />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn-create" disabled={loading || !token}>
              {loading ? <span className="spinner" /> : "Reset password"}
            </button>
            <div className="auth-switch">
              Remembered your password? <Link to="/login">Log in</Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
