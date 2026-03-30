import { Suspense, lazy, useMemo, useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import ExportModal from "./components/ui/ExportModal";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import { useUI } from "./context/UIContext";
import { useToast } from "./components/ui/Toast";
import { PAGE_KEYS, NAV_ITEMS } from "./utils/constants";
import Login from "./pages/Login";

const Overview = lazy(() => import("./pages/Overview"));
const Farmers = lazy(() => import("./pages/Farmers"));
const Market = lazy(() => import("./pages/Market"));
const Schemes = lazy(() => import("./pages/Schemes"));
const Equipment = lazy(() => import("./pages/Equipment"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AgentSystem = lazy(() => import("./pages/AgentSystem"));
const Notifications = lazy(() => import("./pages/Notifications"));
const DatabaseExplorer = lazy(() => import("./pages/DatabaseExplorer"));
const SystemConfig = lazy(() => import("./pages/SystemConfig"));
const GeoExplorer = lazy(() => import("./pages/GeoExplorer"));

const pageMap = {
  [PAGE_KEYS.OVERVIEW]: Overview,
  [PAGE_KEYS.FARMERS]: Farmers,
  [PAGE_KEYS.MARKET]: Market,
  [PAGE_KEYS.SCHEMES]: Schemes,
  [PAGE_KEYS.EQUIPMENT]: Equipment,
  [PAGE_KEYS.ANALYTICS]: Analytics,
  [PAGE_KEYS.AGENT]: AgentSystem,
  [PAGE_KEYS.NOTIFICATIONS]: Notifications,
  [PAGE_KEYS.DATABASE]: DatabaseExplorer,
  [PAGE_KEYS.SYSTEM]: SystemConfig,
  [PAGE_KEYS.GEO]: GeoExplorer,
};

const Dashboard = () => {
  const { activePage, setLiveActivity } = useUI();
  const { push } = useToast();
  const [services, setServices] = useState([]);
  const [lastSync, setLastSync] = useState(new Date().toISOString());
  const [exportRows, setExportRows] = useState([]);
  const ActivePage = pageMap[activePage] || Overview;

  const onRefresh = () => {
    setLastSync(new Date().toISOString());
    push("Dashboard refresh triggered", "info");
  };

  const pageProps = useMemo(() => {
    return {
      onStatsChange: (data) => {
        setLastSync(new Date().toISOString());
        if (Array.isArray(data?.service_health)) {
          setServices(data.service_health);
        }
        if (Array.isArray(data?.items)) {
          setExportRows(data.items);
        }
      },
      onActivityChange: (events) => {
        setLiveActivity(Array.isArray(events) ? events : []);
      },
    };
  }, [setLiveActivity]);

  const pageName = NAV_ITEMS.find((i) => i.key === activePage)?.label || "Overview";

  return (
    <div className="relative min-h-screen text-white">
      <Sidebar />

      <div className="app-topbar">
        <div className="flex items-center gap-3">
          <div className="uppercase-xs">KisanKiAwaaz</div>
          <div className="text-white/70">/</div>
          <div className="font-medium" style={{ fontSize: 15 }}>{pageName}</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" className="btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <main className="app-main">
        <ErrorBoundary>
          <Suspense fallback={<div className="panel card-pad muted">Loading page...</div>}>
            <ActivePage {...pageProps} onRefresh={onRefresh} />
          </Suspense>
        </ErrorBoundary>
      </main>

      <ExportModal rows={exportRows} />
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Login />;
  return <Dashboard />;
}

export default App;

