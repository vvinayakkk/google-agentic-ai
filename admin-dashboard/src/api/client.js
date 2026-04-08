import { API_BASE_URL } from "../utils/constants";

const API_CACHE_PREFIX = "admin_api_cache_v1:";
const API_CACHE_TTL_MS = 5 * 60 * 1000;

const cacheKeyForPath = (path) => `${API_CACHE_PREFIX}${path}`;

const readCache = (path) => {
  try {
    const raw = sessionStorage.getItem(cacheKeyForPath(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() > Number(parsed.expiresAt || 0)) {
      sessionStorage.removeItem(cacheKeyForPath(path));
      return null;
    }
    return parsed.payload ?? null;
  } catch {
    return null;
  }
};

const writeCache = (path, payload) => {
  try {
    sessionStorage.setItem(
      cacheKeyForPath(path),
      JSON.stringify({
        expiresAt: Date.now() + API_CACHE_TTL_MS,
        payload,
      })
    );
  } catch {
    // Ignore storage issues and continue with network-only behavior.
  }
};

export const clearApiCache = () => {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(API_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
};

const parseResponse = async (res) => {
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) return res.json();
  return res.text();
};

const buildHeaders = (headers = {}, skipAuth = false, method = "GET") => {
  const token = localStorage.getItem("admin_token");
  const upperMethod = String(method || "GET").toUpperCase();
  const includeJsonContentType = upperMethod !== "GET" && upperMethod !== "HEAD";
  return {
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(skipAuth ? {} : token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

export const apiClient = async (path, options = {}, config = {}) => {
  const { skipAuth = false, forceRefresh = false, skipCache = false } = config;
  const method = String(options?.method || "GET").toUpperCase();
  const canCache = method === "GET" && !skipCache;

  if (canCache && !forceRefresh) {
    const cached = readCache(path);
    if (cached !== null) {
      return cached;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers, skipAuth, method),
  });

  if (res.status === 401) {
    clearApiCache();
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    window.dispatchEvent(new Event("auth:unauthorized"));
    throw new Error("Unauthorized");
  }

  const payload = await parseResponse(res);
  if (!res.ok) {
    const message = payload?.detail || payload?.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  if (canCache) {
    writeCache(path, payload);
  } else {
    clearApiCache();
  }

  return payload;
};

export const apiTry = async (paths, options = {}, config = {}) => {
  let lastError = null;
  for (const path of paths) {
    try {
      return await apiClient(path, options, config);
    } catch (error) {
      if (error?.status === 401) throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("All fallback endpoints failed");
};

export const withQuery = (path, params = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  });
  return url.pathname + url.search;
};

export const healthChecks = async () => {
  const endpoints = [
    { name: "auth", paths: ["/health", "/api/v1/auth/health"] },
    { name: "farmer", paths: ["/health", "/api/v1/farmer/health"] },
    { name: "crop", paths: ["/health", "/api/v1/crop/health"] },
    { name: "market", paths: ["/health", "/api/v1/market/health"] },
    { name: "equipment", paths: ["/health", "/api/v1/equipment/health"] },
    { name: "agent", paths: ["/health", "/api/v1/agent/health"] },
    { name: "voice", paths: ["/health", "/api/v1/voice/health"] },
    { name: "notification", paths: ["/health", "/api/v1/notification/health"] },
    { name: "schemes", paths: ["/health", "/api/v1/schemes/health"] },
    { name: "geo", paths: ["/health", "/api/v1/geo/health"] },
    { name: "admin", paths: ["/health", "/api/v1/admin/stats"] },
    { name: "analytics", paths: ["/health", "/api/v1/analytics/overview"] },
  ];

  const checks = await Promise.all(
    endpoints.map(async (svc) => {
      const started = performance.now();
      for (const path of svc.paths) {
        try {
          const res = await fetch(`${API_BASE_URL}${path}`, { headers: buildHeaders({}, false, "GET") });
          if (res.ok) {
            return {
              name: svc.name,
              ok: true,
              latencyMs: Math.round(performance.now() - started),
            };
          }
        } catch {
          // try the next fallback path
        }
      }
      return {
        name: svc.name,
        ok: false,
        latencyMs: Math.round(performance.now() - started),
      };
    })
  );

  return checks;
};

