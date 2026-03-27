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
    "auth", "farmer", "crop", "market", "equipment", "agent", "voice", "notification", "schemes", "geo", "admin", "analytics",
  ];

  const checks = await Promise.all(
    endpoints.map(async (name) => {
      const started = performance.now();
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
          headers: buildHeaders(),
        });
        return {
          name,
          ok: true,
          latencyMs: Math.round(performance.now() - started),
        };
      } catch {
        return {
          name,
          ok: false,
          latencyMs: Math.round(performance.now() - started),
        };
      }
    })
  );

  return checks;
};

