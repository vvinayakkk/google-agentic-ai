import { Suspense, lazy, useMemo, useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import { useUI } from "./context/UIContext";
import { useToast } from "./components/ui/Toast";
import { PAGE_KEYS, NAV_ITEMS } from "./utils/constants";
import Login from "./pages/Login";
import TopBar from "./components/layout/TopBar";
import GTranslate from "./components/GTranslate";
import { clearApiCache } from "./api/client";

const Overview = lazy(() => import("./pages/Overview"));
const Farmers = lazy(() => import("./pages/Farmers"));
const Market = lazy(() => import("./pages/Market"));
const Schemes = lazy(() => import("./pages/Schemes"));
const Equipment = lazy(() => import("./pages/Equipment"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AgentSystem = lazy(() => import("./pages/AgentSystem"));
// Notifications page removed per admin UI cleanup
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
  // Notifications removed
  [PAGE_KEYS.DATABASE]: DatabaseExplorer,
  [PAGE_KEYS.SYSTEM]: SystemConfig,
  [PAGE_KEYS.GEO]: GeoExplorer,
};

const Dashboard = () => {
  const { activePage, setLiveActivity, setActivePage } = useUI();
  const { push } = useToast();
  const [services, setServices] = useState([]);
  const [lastSync, setLastSync] = useState(new Date().toISOString());
  const [exportRows, setExportRows] = useState([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const ActivePage = pageMap[activePage] || Market;

  const onRefresh = () => {
    clearApiCache();
    setLastSync(new Date().toISOString());
    setRefreshNonce((n) => n + 1);
    push("Dashboard refresh triggered", "info");
  };

  const pageProps = useMemo(() => {
    return {
      refreshToken: refreshNonce,
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
  }, [refreshNonce, setLiveActivity]);

  const pageName = NAV_ITEMS.find((i) => i.key === activePage)?.label || "Overview";
  useEffect(() => {
    setActivePage(PAGE_KEYS.MARKET);
  }, [setActivePage]);

  return (
    <div className="relative min-h-screen" style={{ color: "var(--text)" }}>
      <Sidebar />
      <TopBar onRefresh={onRefresh} />

      <main className="app-main">
        <ErrorBoundary>
          <Suspense fallback={<div className="panel card-pad muted">Loading page...</div>}>
            <ActivePage key={`${activePage}-${refreshNonce}`} {...pageProps} onRefresh={onRefresh} />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Export modal removed per new layout spec */}
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Login />}
      <GTranslate />
    </>
  );
}

export default App;

