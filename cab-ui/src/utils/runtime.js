const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function trimTrailingSlash(value = "") {
  return String(value).replace(/\/$/, "");
}

export function isLoopbackHost(hostname = "") {
  return LOOPBACK_HOSTS.has(hostname);
}

export function resolveApiBaseUrl() {
  const rawEnvUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || "");
  if (rawEnvUrl) {
    try {
      const parsed = new URL(rawEnvUrl);
      if (
        typeof window !== "undefined" &&
        isLoopbackHost(parsed.hostname) &&
        !isLoopbackHost(window.location.hostname)
      ) {
        return `${window.location.protocol}//${window.location.hostname}:3000`;
      }
      return rawEnvUrl;
    } catch {
      return rawEnvUrl;
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return "http://api-gateway:3000";
}

export function resolveGatewayWsUrl(path = "/") {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const apiBaseUrl = resolveApiBaseUrl();

  try {
    const parsed = new URL(apiBaseUrl);
    const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${parsed.host}${safePath}`;
  } catch {
    if (typeof window !== "undefined") {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${window.location.host}${safePath}`;
    }
    return `ws://api-gateway:3000${safePath}`;
  }
}

export function canUseBrowserGeolocation() {
  if (typeof window === "undefined") return false;
  return "geolocation" in navigator;
}
