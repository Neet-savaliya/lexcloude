import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup as apiSignup } from "../api";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Signup() {
  const [name, setName]         = useState("");
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
      const { token, lawyer } = await apiSignup(email.trim(), password, name.trim());
      auth.login(token, lawyer);
      navigate("/");
    } catch (err) {
      setError(err.message || "Signup failed");
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
        <h3>Create your account</h3>
        <div>
          <label>Name</label>
          <input className="modal-input" placeholder="e.g. Priya Nair"
            value={name} onChange={e => setName(e.target.value)} autoFocus required />
        </div>
        <div>
          <label>Email</label>
          <input className="modal-input" type="email" placeholder="you@lawfirm.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <PasswordInput placeholder="At least 8 characters"
            value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-create" disabled={loading}>
          {loading ? <span className="spinner" /> : "Create account"}
        </button>
        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  );
}
