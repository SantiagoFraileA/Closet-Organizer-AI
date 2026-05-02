import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "closetfy-dev-secret";

function makeToken(userId: number) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "90d" });
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const { firstName, lastName, email, password, age, gender } = req.body ?? {};

  if (!firstName || !email || !password) {
    return res.status(400).json({ error: "firstName, email, and password are required." });
  }

  const emailLower = String(email).toLowerCase().trim();

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, emailLower))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "email_taken" });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const [user] = await db
      .insert(usersTable)
      .values({
        firstName: String(firstName).trim(),
        lastName: String(lastName ?? "").trim(),
        email: emailLower,
        passwordHash,
        age: String(age ?? "").trim(),
        gender: String(gender ?? "").trim(),
      })
      .returning();

    const token = makeToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const emailLower = String(email).toLowerCase().trim();

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, emailLower))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "not_found" });
    }

    const match = await bcrypt.compare(String(password), user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "wrong_password" });
    }

    const token = makeToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/auth/me  (verify token)
router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "no_token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: number };
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);

    if (!user) return res.status(404).json({ error: "not_found" });

    return res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
});

export default router;
