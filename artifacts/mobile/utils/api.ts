function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname;
    // Expo web: "abc.expo.kirk.replit.dev" → "abc.kirk.replit.dev"
    const apiHostname = hostname.replace(/^([^.]+)\.expo\./, "$1.");
    return `https://${apiHostname}/api`;
  }
  return (process.env.EXPO_PUBLIC_API_BASE_URL as string) ?? "http://localhost:8080/api";
}

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
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
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
      credentials: "include", // send Replit auth cookies cross-origin
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
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  console.log("[api] GET", url);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
  } catch (networkErr: any) {
    console.error("[api] network error:", networkErr);
    throw { error: "network_error", message: networkErr?.message ?? String(networkErr) };
  }

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
