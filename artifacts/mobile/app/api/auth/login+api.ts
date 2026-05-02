import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT id, first_name, last_name, email, password_hash, age, gender FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return Response.json({ error: "invalid_credentials" }, { status: 401 });
    }

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
    console.error("[login+api]", err);
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
