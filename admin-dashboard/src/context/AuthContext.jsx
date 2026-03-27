import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem("admin_profile");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem("admin_token", token);
    } else {
      localStorage.removeItem("admin_token");
    }
  }, [token]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem("admin_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("admin_profile");
    }
  }, [profile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setProfile(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiClient(
        "/api/v1/admin/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
        { skipAuth: true }
      );
      setToken(data.access_token);
      setProfile(data.admin || null);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      token,
      profile,
      role: profile?.role || "admin",
      isAuthenticated: Boolean(token),
      loading,
      login,
      logout,
    }),
    [token, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

