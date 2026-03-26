import { Suspense, lazy, useMemo, useState } from "react";
import Header from "./components/layout/Header";
import RightSidebar from "./components/layout/RightSidebar";
import StatusBar from "./components/layout/StatusBar";
import InfiniteCanvas from "./components/canvas/InfiniteCanvas";
import ExportModal from "./components/ui/ExportModal";
import CommandPalette from "./components/ui/CommandPalette";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import { useUI } from "./context/UIContext";
import { useToast } from "./components/ui/Toast";
import { PAGE_KEYS } from "./utils/constants";
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
  const { activePage, setCanvasPan, setCanvasScale, setLiveActivity } = useUI();
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

  return (
    <div className="relative min-h-screen bg-[#1C1C1C] text-white">
      <InfiniteCanvas />
      <Header onRefresh={onRefresh} unread={3} />
      <RightSidebar />

      <main className="relative z-20 px-3 pb-16 pt-12 sm:px-4 lg:pr-24 xl:pr-28">
        <ErrorBoundary>
          <Suspense fallback={<div className="panel p-4 text-xs text-white/60">Loading page...</div>}>
            <ActivePage {...pageProps} />
          </Suspense>
        </ErrorBoundary>
      </main>

      <StatusBar
        services={services}
        lastSync={lastSync}
        onReset={() => {
          setCanvasPan({ x: 0, y: 0 });
          setCanvasScale(1);
        }}
      />

      <ExportModal rows={exportRows} />
      <CommandPalette />
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Login />;
  return <Dashboard />;
}

export default App;

