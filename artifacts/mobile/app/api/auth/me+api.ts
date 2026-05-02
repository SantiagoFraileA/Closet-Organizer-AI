import { Pool } from "pg";
import jwt from "jsonwebtoken";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return Response.json({ error: "No token" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const result = await pool.query(
      "SELECT id, first_name, last_name, email, age, gender FROM users WHERE id = $1",
      [payload.userId],
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];
    return Response.json({
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
    console.error("[me+api]", err);
    return Response.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
