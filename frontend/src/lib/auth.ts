const SESSION_MARKER = "nejat_e_ghaza_authenticated";
const CSRF_KEY = "nejat_e_ghaza_csrf";

export function getToken(): string | null {
  return sessionStorage.getItem(SESSION_MARKER) ? "cookie-session" : null;
}

export function setToken(_token: string | null): void {
  sessionStorage.setItem(SESSION_MARKER, "1");
}

export function clearToken(): void {
  sessionStorage.removeItem(SESSION_MARKER);
  sessionStorage.removeItem(CSRF_KEY);
}

export function getCsrfToken(): string | null {
  return sessionStorage.getItem(CSRF_KEY);
}

export function setCsrfToken(token: string): void {
  sessionStorage.setItem(CSRF_KEY, token);
}
