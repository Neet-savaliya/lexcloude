import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setResult(res);
    } catch (err) {
      setError(err.message || "Something went wrong");
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
        <h3>Reset your password</h3>
        <div>
          <label>Email</label>
          <input className="modal-input" type="email" placeholder="you@lawfirm.com"
            value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
        </div>
        {error && <div className="auth-error">{error}</div>}
        {result && (
          <div className="auth-success">
            {result.message}
            {result.resetLink && (
              <>
                <br /><br />
                Dev mode — no email sending is configured yet, so here's the link directly:
                <br />
                <Link to={`/reset-password?token=${result.resetToken}`}>{result.resetLink}</Link>
              </>
            )}
          </div>
        )}
        <button type="submit" className="btn-create" disabled={loading}>
          {loading ? <span className="spinner" /> : "Send reset link"}
        </button>
        <div className="auth-switch">
          Remembered your password? <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  );
}
