import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, lawyer } = await apiLogin(email.trim(), password);
      auth.login(token, lawyer);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
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
        <h3>Log in</h3>
        <div>
          <label>Email</label>
          <input className="modal-input" type="email" placeholder="you@lawfirm.com"
            value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
        </div>
        <div>
          <label>Password</label>
          <PasswordInput placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div className="auth-forgot">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-create" disabled={loading}>
          {loading ? <span className="spinner" /> : "Log in"}
        </button>
        <div className="auth-switch">
          No account? <Link to="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  );
}
