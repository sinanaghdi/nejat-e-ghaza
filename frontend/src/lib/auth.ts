const SESSION_MARKER = "nejat_e_ghaza_authenticated";
const DEMO_ROLE_KEY = "nejat_e_ghaza_demo_role";
const CSRF_KEY = "nejat_e_ghaza_csrf";

export function getToken(): string | null {
  if (!sessionStorage.getItem(SESSION_MARKER)) return null;
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    return sessionStorage.getItem(DEMO_ROLE_KEY);
  }
  return "cookie-session";
}

export function setToken(token: string | null): void {
  sessionStorage.setItem(SESSION_MARKER, "1");
  if (import.meta.env.VITE_DEMO_MODE === "true" && token?.startsWith("demo:")) {
    sessionStorage.setItem(DEMO_ROLE_KEY, token);
  } else {
    sessionStorage.removeItem(DEMO_ROLE_KEY);
  }
}

export function clearToken(): void {
  sessionStorage.removeItem(SESSION_MARKER);
  sessionStorage.removeItem(DEMO_ROLE_KEY);
  sessionStorage.removeItem(CSRF_KEY);
}

export function getCsrfToken(): string | null {
  return sessionStorage.getItem(CSRF_KEY);
}

export function setCsrfToken(token: string): void {
  sessionStorage.setItem(CSRF_KEY, token);
}
