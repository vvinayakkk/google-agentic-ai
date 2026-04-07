import { API_BASE_URL } from "../utils/constants";

const parseResponse = async (res) => {
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) return res.json();
  return res.text();
};

const buildHeaders = (headers = {}, skipAuth = false) => {
  const token = localStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    ...(skipAuth ? {} : token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

export const apiClient = async (path, options = {}, config = {}) => {
  const { skipAuth = false } = config;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers, skipAuth),
  });

  if (res.status === 401) {
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
    { name: "auth", paths: ["/api/v1/auth/health", "/health"] },
    { name: "farmer", paths: ["/api/v1/farmer/health", "/health"] },
    { name: "crop", paths: ["/api/v1/crop/health", "/health"] },
    { name: "market", paths: ["/api/v1/market/health", "/health"] },
    { name: "equipment", paths: ["/api/v1/equipment/health", "/health"] },
    { name: "agent", paths: ["/api/v1/agent/health", "/health"] },
    { name: "voice", paths: ["/api/v1/voice/health", "/health"] },
    { name: "notification", paths: ["/api/v1/notification/health", "/health"] },
    { name: "schemes", paths: ["/api/v1/schemes/health", "/health"] },
    { name: "geo", paths: ["/api/v1/geo/health", "/health"] },
    { name: "admin", paths: ["/api/v1/admin/health", "/api/v1/admin/stats"] },
    { name: "analytics", paths: ["/api/v1/analytics/health", "/api/v1/analytics/overview"] },
  ];

  const checks = await Promise.all(
    endpoints.map(async (svc) => {
      const started = performance.now();
      for (const path of svc.paths) {
        try {
          const res = await fetch(`${API_BASE_URL}${path}`, { headers: buildHeaders() });
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

