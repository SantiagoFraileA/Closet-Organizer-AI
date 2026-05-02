const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://91ef58e2-307e-4154-9d23-8f995ffb2193-00-k3f2p5wc6txn.kirk.replit.dev/api";

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  gender: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

async function post<T>(path: string, body: object, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, error: json.error ?? "unknown_error" };
  return json as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, error: json.error ?? "unknown_error" };
  return json as T;
}

export const api = {
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    age: string;
    gender: string;
  }) => post<AuthResult>("/auth/register", data),

  login: (email: string, password: string) =>
    post<AuthResult>("/auth/login", { email, password }),

  me: (token: string) => get<{ user: AuthUser }>("/auth/me", token),
};
