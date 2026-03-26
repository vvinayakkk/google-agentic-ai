import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import InfiniteCanvas from "../components/canvas/InfiniteCanvas";
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
    <div className="relative min-h-screen overflow-hidden bg-[#1C1C1C]">
      <InfiniteCanvas />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-[20px] border border-white/10 bg-[#1E1E1E] p-6 shadow-2xl">
          <h1 className="font-display text-[30px] leading-none text-white/95">KisanKiAwaaz</h1>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-white/45">Admin Console</p>

          <label className="mt-5 block text-xs text-white/55">Email</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <Mail className="h-4 w-4 text-white/45" />
            <input className="w-full bg-transparent text-sm text-white/90 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@kisankiawaz.in" />
          </div>

          <label className="mt-3 block text-xs text-white/55">Password</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <Lock className="h-4 w-4 text-white/45" />
            <input type="password" className="w-full bg-transparent text-sm text-white/90 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>

          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

          <button type="submit" disabled={loading} className="mt-5 w-full rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15 disabled:opacity-60">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

