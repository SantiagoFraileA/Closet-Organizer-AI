import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, age, gender } = body ?? {};

    if (!firstName || !lastName || !email || !password || !age || !gender) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return Response.json({ error: "email_taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, age, gender)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, age, gender`,
      [firstName, lastName, email.toLowerCase(), passwordHash, age, gender],
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

    return Response.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (err: any) {
    console.error("[register+api]", err);
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
