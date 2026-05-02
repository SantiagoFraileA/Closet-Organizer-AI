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

// Always same-origin — Expo Router API routes live on the same server as the app
function apiPath(path: string): string {
  return `/api/auth${path}`;
}

async function post<T>(path: string, body: object, token?: string): Promise<T> {
  const url = apiPath(path);
  console.log("[api] POST", url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (networkErr: any) {
    console.error("[api] network error:", networkErr);
    throw { error: "network_error", message: networkErr?.message ?? String(networkErr) };
  }

  const json = await res.json();
  console.log("[api] response", res.status, JSON.stringify(json));
  if (!res.ok) throw { status: res.status, error: json.error ?? "unknown_error" };
  return json as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const url = apiPath(path);
  console.log("[api] GET", url);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkErr: any) {
    console.error("[api] network error:", networkErr);
    throw { error: "network_error", message: networkErr?.message ?? String(networkErr) };
  }

  const json = await res.json();
  if (!res.ok) throw { status: res.status, error: json.error ?? "unknown_error" };
  return json as T;
}

export interface ClothingItemPayload {
  id: string;
  name: string;
  category: string;
  color: string;
  colorHex: string;
  tags: string[];
  imageThumb?: string | null;
}

async function postItems<T>(path: string, body: object): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
  }) => post<AuthResult>("/register", data),

  login: (email: string, password: string) =>
    post<AuthResult>("/login", { email, password }),

  me: (token: string) => get<{ user: AuthUser }>("/me", token),

  saveItems: (items: ClothingItemPayload[]) =>
    postItems<{ saved: number }>("/api/items", { items }),
};
