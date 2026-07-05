const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
let googleClientIdPromise = null;

function resolveGlobal() {
  if (typeof window === "undefined") return null;
  return window.google?.accounts?.id || null;
}

function isLocalDevHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  return "";
}

export function getApiBaseUrlCandidates() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return [envBase];

  const candidates = [""];

  if (typeof window !== "undefined") {
    if (isLocalDevHost(window.location.hostname)) {
      candidates.push("http://127.0.0.1:5000", "http://localhost:5000");
    } else if (window.location.protocol === "http:") {
      candidates.push(`http://${window.location.hostname}:5000`);
    }
  }

  return [...new Set(candidates)];
}

async function fetchGoogleClientIdFromBackend() {
  const candidates = getApiBaseUrlCandidates();
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}/auth/google/config`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.msg || "No se pudo leer la configuracion de Google.");
      }
      return data?.client_id || "";
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || "No se pudo conectar con el backend.");
}

export function getGoogleClientId() {
  if (!googleClientIdPromise) {
    googleClientIdPromise = (async () => {
      const envValue = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
      if (envValue) return envValue;
      return fetchGoogleClientIdFromBackend();
    })();
  }

  return googleClientIdPromise;
}

export function loadGoogleIdentityScript() {
  if (resolveGlobal()) {
    return Promise.resolve(resolveGlobal());
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Google Sign-In solo esta disponible en el navegador."));
  }

  const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(resolveGlobal()), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("No se pudo cargar Google Sign-In.")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(resolveGlobal());
    script.onerror = () => reject(new Error("No se pudo cargar Google Sign-In."));
    document.head.appendChild(script);
  });
}
