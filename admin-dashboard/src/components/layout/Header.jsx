import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bell, ChevronDown, Download, LogOut, Menu, MessageSquare, Mic, RefreshCw, Search, UserPlus } from "lucide-react";
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
  const pageName = NAV_ITEMS.find((item) => item.key === activePage)?.label || "Overview";
  const initial = (profile?.name || profile?.email || "A").slice(0, 1).toUpperCase();
  const recentActivity = useMemo(() => (liveActivity || []).slice(0, 6), [liveActivity]);

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
    <header className="fixed left-0 right-0 top-0 z-40 flex h-11 items-center justify-between border-b border-white/5 bg-[#1C1C1C]/90 px-2.5 backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-2 text-xs text-white/75 sm:gap-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setProfileOpen(false);
            }}
          >
            <Menu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Activity</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {isMenuOpen ? (
            <div className="absolute left-0 top-9 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#1C1C1C] shadow-2xl">
              <div className="border-b border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Navigate</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActivePage(item.key);
                        setMenuOpen(false);
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] ${
                        item.key === activePage
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 text-white/75 hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Live Activity</p>
                  <span className="text-[10px] text-white/35">Overview feed</span>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {recentActivity.length ? (
                    recentActivity.map((event, idx) => {
                      const Icon = iconByType[event.type] || Activity;
                      return (
                        <div key={`${event.type}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/15 text-white/80">
                              <Icon size={12} />
                            </span>
                            <div className="min-w-0">
                              <p className="break-words text-[11px] text-white/90">{event.text || "Activity event"}</p>
                              <p className="text-[10px] text-white/40">{relativeTime(event.at)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-white/45">No recent events yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <p className="hidden text-white/50 md:block">KisanKiAwaaz Admin</p>
        <span className="hidden text-white/25 md:inline">&gt;</span>
        <p className="max-w-[38vw] truncate text-white/85">{pageName}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="action-btn" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button type="button" className="action-btn" onClick={() => setExportOpen(true)}>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button type="button" className="relative rounded-full border border-white/10 p-2 text-white/80 hover:bg-white/10">
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[9px] text-black">{unread}</span> : null}
        </button>
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/90 hover:bg-white/10"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px]">{initial}</span>
            <ChevronDown className="h-3 w-3 text-white/70" />
          </button>
          {isProfileOpen ? (
            <div className="absolute right-0 top-9 z-50 w-56 rounded-2xl border border-white/10 bg-[#1C1C1C] p-2 shadow-2xl">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <p className="truncate text-xs text-white/95">{profile?.name || "Admin User"}</p>
                <p className="truncate text-[10px] text-white/45">{profile?.email || "admin@kisankiawaz.in"}</p>
              </div>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/25 px-3 py-2 text-xs text-rose-200 hover:bg-rose-300/10"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;

