const jwt = require("jsonwebtoken");

/** Verifies the Authorization: Bearer <token> header and attaches req.lawyerId / req.lawyerEmail */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.lawyerId    = payload.sub;
    req.lawyerEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
