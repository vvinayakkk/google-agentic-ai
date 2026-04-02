import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  Download,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { NAV_ITEMS } from "../../utils/constants";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";
import { relativeTime } from "../../utils/format";

const iconByType = {
  registration: UserPlus,
  session: MessageSquare,
  voice: Mic,
  scheme: Search,
  market: Activity,
};

const Header = ({ onRefresh, unread = 0 }) => {
  const { activePage, setActivePage, setExportOpen, liveActivity } = useUI();
  const { profile, logout } = useAuth();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);

  const menuRef = useRef(null);
  const profileRef = useRef(null);

  const pageName =
    NAV_ITEMS.find((item) => item.key === activePage)?.label || "Overview";

  const initial = (profile?.name || profile?.email || "A")
    .slice(0, 1)
    .toUpperCase();

  const recentActivity = useMemo(
    () => (liveActivity || []).slice(0, 6),
    [liveActivity]
  );

  useEffect(() => {
    const closeIfOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", closeIfOutside);
    return () => document.removeEventListener("mousedown", closeIfOutside);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#1C1C1C]/70 px-4 backdrop-blur-2xl shadow-lg">
      {/* LEFT */}
      <div className="flex items-center gap-3 text-sm">
        {/* MENU */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 transition-all hover:bg-indigo-500/20 hover:border-indigo-400/30 active:scale-95"
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setProfileOpen(false);
            }}
          >
            <Menu className="h-4 w-4" />
            <span className="hidden md:inline">Activity</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-12 w-[380px] rounded-2xl border border-white/10 bg-[#1C1C1C] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* NAV */}
              <div className="border-b border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-white/40">
                  Navigate
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActivePage(item.key);
                        setMenuOpen(false);
                      }}
                      className={`rounded-lg border px-2 py-2 text-left text-xs transition-all ${
                        item.key === activePage
                          ? "border-indigo-400/40 bg-indigo-500/20 text-white"
                          : "border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTIVITY */}
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    Live Activity
                  </p>
                  <span className="text-[10px] text-white/30">Realtime</span>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {recentActivity.length ? (
                    recentActivity.map((event, idx) => {
                      const Icon = iconByType[event.type] || Activity;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-2 hover:bg-white/10 transition"
                        >
                          <div className="flex items-start gap-2">
                            <span className="h-6 w-6 flex items-center justify-center rounded-md border border-white/15">
                              <Icon size={13} />
                            </span>
                            <div>
                              <p className="text-xs text-white/90">
                                {event.text}
                              </p>
                              <p className="text-[10px] text-white/40">
                                {relativeTime(event.at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-white/40">No activity</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TITLE */}
        <div className="flex items-center gap-2">
          <span className="hidden md:block text-white/30">
            KisanKiAwaaz
          </span>
          <span className="hidden md:block text-white/20">/</span>
          <span className="text-white font-semibold tracking-wide">
            {pageName}
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* REFRESH */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 transition hover:bg-indigo-500/20"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden md:inline">Refresh</span>
        </button>

        {/* EXPORT */}
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 transition hover:bg-indigo-500/20"
        >
          <Download className="h-4 w-4" />
          <span className="hidden md:inline">Export</span>
        </button>

        {/* NOTIFICATION */}
        <button className="relative rounded-full border border-white/10 p-2.5 hover:bg-white/10">
          <Bell className="h-4 w-4 text-white/80" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-1.5 text-[9px] text-white shadow">
              {unread}
            </span>
          )}
        </button>

        {/* PROFILE */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 hover:bg-white/10"
          >
            <div className="h-7 w-7 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 text-xs">
              {initial}
            </div>
            <ChevronDown className="h-3 w-3 text-white/70" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-[#1C1C1C] p-2 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="p-2">
                <p className="text-sm text-white">
                  {profile?.name || "Admin"}
                </p>
                <p className="text-xs text-white/40">
                  {profile?.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM GLOW */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </header>
  );
};

export default Header;