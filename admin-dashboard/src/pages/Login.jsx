import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div
      className="login-screen relative min-h-screen overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(var(--dot-minor) 1px, transparent 1px), radial-gradient(var(--dot-major) 1px, transparent 1px), var(--app-shell-gradient)",
        backgroundSize: "10px 10px, 48px 48px, auto",
        backgroundPosition: "0 0, 0 0, 0 0",
      }}
    >
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-[20px] p-6" style={{ border: "1px solid var(--soft)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
          <h1 className="font-display text-[30px] leading-none" style={{ color: "var(--text)" }}>KisanKiAwaaz</h1>
          <p className="mt-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>Admin Console</p>

          <label className="mt-5 block text-xs" style={{ color: "var(--muted)" }}>Email</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: "1px solid var(--soft)", background: "var(--surface-2)" }}>
            <Mail className="h-4 w-4" style={{ color: "var(--muted)" }} />
            <input className="w-full bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@kisankiawaz.in" />
          </div>

          <label className="mt-3 block text-xs" style={{ color: "var(--muted)" }}>Password</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: "1px solid var(--soft)", background: "var(--surface-2)" }}>
            <Lock className="h-4 w-4" style={{ color: "var(--muted)" }} />
            <input type="password" className="w-full bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>

          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

          <button type="submit" disabled={loading} className="btn-ghost mt-5 w-full rounded-full px-4 py-2 text-sm transition disabled:opacity-60" style={{ fontWeight: 700 }}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

