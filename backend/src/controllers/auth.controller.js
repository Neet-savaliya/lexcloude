const authService = require("../services/auth");

async function signup(req, res) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: "email, password and name are required" });
    if (password.length < 8)
      return res.status(400).json({ error: "password must be at least 8 characters" });
    const result = await authService.signup(email.trim().toLowerCase(), password, name.trim());
    res.status(201).json(result);
  } catch (err) {
    console.error("[POST /auth/signup]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });
    const result = await authService.login(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err) {
    console.error("[POST /auth/login]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ error: "email is required" });
    const result = await authService.forgotPassword(email.trim().toLowerCase());
    res.json(result);
  } catch (err) {
    console.error("[POST /auth/forgot-password]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "token and password are required" });
    if (password.length < 8)
      return res.status(400).json({ error: "password must be at least 8 characters" });
    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (err) {
    console.error("[POST /auth/reset-password]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { signup, login, forgotPassword, resetPassword };
