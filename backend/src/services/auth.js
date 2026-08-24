require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamo } = require("../lib/aws");

const TABLE      = process.env.LAWYERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const RESET_TOKEN_EXPIRY = "30m";

function issueToken(lawyerId, email) {
  return jwt.sign({ sub: lawyerId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Create a new lawyer account */
async function signup(email, password, name) {
  const existing = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  if (existing.Item) {
    const err = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const lawyerId     = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: { email, lawyerId, passwordHash, name, createdAt: new Date().toISOString() },
      ConditionExpression: "attribute_not_exists(email)",
    }));
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      const err = new Error("An account with this email already exists");
      err.status = 409;
      throw err;
    }
    throw e;
  }

  console.log(`[auth] Signed up lawyer: ${lawyerId} — ${email}`);
  return { token: issueToken(lawyerId, email), lawyer: { lawyerId, email, name } };
}

/** Authenticate an existing lawyer */
async function login(email, password) {
  const res = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  const invalid = () => { const err = new Error("Invalid email or password"); err.status = 401; return err; };
  if (!res.Item) throw invalid();

  const match = await bcrypt.compare(password, res.Item.passwordHash);
  if (!match) throw invalid();

  const { lawyerId, name } = res.Item;
  console.log(`[auth] Logged in lawyer: ${lawyerId} — ${email}`);
  return { token: issueToken(lawyerId, email), lawyer: { lawyerId, email, name } };
}

/**
 * Start a password reset. Always resolves to a generic result — never reveals
 * whether the email exists — but logs (and, outside production, returns) the
 * raw reset token so it can be used without a real email-sending setup.
 */
async function forgotPassword(email) {
  const generic = { message: "If an account exists for that email, a reset link has been sent." };

  const res = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  if (!res.Item) return generic;

  const { lawyerId } = res.Item;
  const resetToken = jwt.sign(
    { sub: lawyerId, email, purpose: "password_reset" },
    JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY }
  );

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { email },
    UpdateExpression: "SET resetTokenHash = :h, resetTokenExpiresAt = :e",
    ExpressionAttributeValues: {
      ":h": hashToken(resetToken),
      ":e": Date.now() + 30 * 60 * 1000,
    },
  }));

  const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
  console.log(`[auth] Password reset requested for ${email}. Reset link: ${resetLink}`);

  if (process.env.NODE_ENV !== "production") {
    return { ...generic, resetToken, resetLink };
  }
  return generic;
}

/** Complete a password reset using the token issued by forgotPassword() */
async function resetPassword(token, newPassword) {
  const invalid = () => { const err = new Error("Invalid or expired reset token"); err.status = 400; return err; };

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw invalid();
  }
  if (payload.purpose !== "password_reset") throw invalid();

  const { email } = payload;
  const res = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  if (!res.Item) throw invalid();

  const { resetTokenHash, resetTokenExpiresAt } = res.Item;
  if (!resetTokenHash || resetTokenHash !== hashToken(token)) throw invalid();
  if (!resetTokenExpiresAt || Date.now() > resetTokenExpiresAt) throw invalid();

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { email },
    UpdateExpression: "SET passwordHash = :p REMOVE resetTokenHash, resetTokenExpiresAt",
    ExpressionAttributeValues: { ":p": passwordHash },
  }));

  console.log(`[auth] Password reset completed for ${email}`);
  return { message: "Password has been reset. You can now log in with your new password." };
}

module.exports = { signup, login, forgotPassword, resetPassword };
