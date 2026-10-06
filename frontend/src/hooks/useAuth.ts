import { useEffect, useState, type FormEvent } from "react";
import type { User } from "../lib/api";
import {
  ApiError,
  getCurrentUser,
  loginDemoUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/auth";

export type AuthMode = "login" | "register";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    getCurrentUser(getToken())
      .then((currentUser) => {
        setUser(currentUser);
        setToken(null);
      })
      .catch(() => clearToken());
  }, []);

  async function loginDemo(role: User["role"]) {
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const token = await loginDemoUser(role);
      setToken(token.access_token);
      const currentUser = await getCurrentUser(token.access_token);
      setUser(currentUser);
      setAuthOpen(false);
      setAuthSuccess("");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : "ورود دمو انجام نشد.");
    } finally {
      setAuthLoading(false);
    }
  }

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
    setAuthError("");
    setAuthSuccess("");
  }

  function closeAuth() {
    if (!authLoading) setAuthOpen(false);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      if (authMode === "register") {
        await registerUser({ name, email, password });
        setAuthMode("login");
        setPassword("");
        setAuthSuccess("حساب شما ساخته شد. حالا با ایمیل و رمز عبور وارد شوید.");
      } else {
        const token = await loginUser({ email, password });
        setToken(token.access_token);
        const currentUser = await getCurrentUser(token.access_token);
        setUser(currentUser);
        setAuthOpen(false);
        setName("");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      setAuthError(
        err instanceof ApiError
          ? err.message
          : "عملیات انجام نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // Clear local state even when the server session is already invalid.
    }
    clearToken();
    setUser(null);
  }

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setAuthError("");
    setAuthSuccess("");
  }

  return {
    user,
    authMode,
    authOpen,
    authLoading,
    authError,
    authSuccess,
    name,
    email,
    password,
    setName,
    setEmail,
    setPassword,
    openAuth,
    closeAuth,
    handleAuthSubmit,
    handleLogout,
    switchAuthMode,
    loginDemo,
  };
}
