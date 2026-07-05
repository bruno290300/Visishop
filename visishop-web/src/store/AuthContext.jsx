import { createContext, useContext, useMemo, useState } from "react";
import { getApiBaseUrlCandidates } from "../features/auth/services/googleIdentity";

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = "visishop.auth.session.v1";

function readSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id && parsed.name ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(user) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function normalizeCredentials(payload) {
  const normalizedName = String(payload?.name || "").trim();
  return {
    name: normalizedName,
    username: normalizedName.toLowerCase(),
    password: String(payload?.password || "").trim(),
  };
}

async function postJson(path, payload) {
  const candidates = getApiBaseUrlCandidates();
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.detail ? ` Detalle: ${data.detail}` : "";
        throw new Error(`${data?.msg || "No se pudo completar la solicitud."}${detail}`);
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || "No se pudo conectar con el backend.");
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readSession);

  async function register(payload) {
    const { name, username, password } = normalizeCredentials(payload);

    if (!name || !password) {
      throw new Error("Completa usuario y contrasena.");
    }

    await postJson("/auth/register", { username, password });

    const sessionUser = { id: `usr-${username}`, name, provider: "password" };
    writeSession(sessionUser);
    setCurrentUser(sessionUser);
    return sessionUser;
  }

  async function login(payload) {
    const { name, username, password } = normalizeCredentials(payload);

    if (!name || !password) {
      throw new Error("Completa usuario y contrasena.");
    }

    const data = await postJson("/auth/login", { username, password });
    const sessionUser = {
      id: data.user?.id ? String(data.user.id) : `usr-${username}`,
      name,
      token: data.token || "",
      provider: "password",
    };
    writeSession(sessionUser);
    setCurrentUser(sessionUser);
    return sessionUser;
  }

  async function loginWithGoogleCredential(credential) {
    if (!credential) {
      throw new Error("Google no devolvio una credencial valida.");
    }

    const data = await postJson("/auth/google", { credential });
    const sessionUser = {
      id: String(data.user?.id || ""),
      name: data.user?.name || data.user?.email || "Usuario",
      email: data.user?.email || "",
      provider: "google",
      token: data.token || "",
    };

    writeSession(sessionUser);
    setCurrentUser(sessionUser);

    return sessionUser;
  }

  function logout() {
    if (typeof window !== "undefined") {
      window.google?.accounts?.id?.disableAutoSelect?.();
    }

    clearSession();
    setCurrentUser(null);
    // Limpia cualquier estado temporal de auth que pudo quedar cacheado por el navegador.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("visishop.auth.last_error");
    }
  }

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      register,
      login,
      loginWithGoogleCredential,
      logout,
    }),
    [currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
