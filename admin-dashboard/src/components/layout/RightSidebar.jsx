import * as Icons from "lucide-react";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "../../utils/constants";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";
import Tooltip from "../ui/Tooltip";

const RightSidebar = () => {
  const { activePage, setActivePage } = useUI();
  const { logout, profile } = useAuth();

  return (
    <aside className="fixed bottom-14 right-2 top-14 z-40 hidden w-14 flex-col items-center justify-between overflow-y-auto rounded-2xl border border-white/10 bg-[#1C1C1C]/95 p-2 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex">
      <div className="space-y-1">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = Icons[item.icon];
          const active = activePage === item.key;
          return (
            <div key={item.key}>
              {idx === 2 || idx === 7 ? <div className="my-2 h-px w-7 bg-white/10" /> : null}
              <Tooltip content={item.label}>
                <button
                  type="button"
                  onClick={() => setActivePage(item.key)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                    active
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-transparent text-white/70 hover:border-white/15 hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} />
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>
      <div className="my-2 h-px w-full bg-white/10" />
      <div className="space-y-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] text-white/85">
          {(profile?.name || "A").slice(0, 1).toUpperCase()}
        </div>
        <Tooltip content="Logout">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/75 hover:bg-white/5" onClick={logout}>
            <LogOut size={14} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};

export default RightSidebar;

