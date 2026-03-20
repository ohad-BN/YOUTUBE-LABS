import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { Tv, TrendingUp, FolderOpen, Activity, Search, Compass, Bell, Menu, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ViewStatsDashboard } from "./features/viewstats/ViewStatsDashboard";
import { VelioDashboard } from "./features/velio/VelioDashboard";
import { SocialBladeDashboard } from "./features/socialblade/SocialBladeDashboard";
import { VidIQDashboard } from "./features/vidiq/VidIQDashboard";
import { DiscoveryDashboard } from "./features/discovery/DiscoveryDashboard";
import { DashboardHome } from "./features/dashboard/DashboardHome";
import { DiscoveryClient } from "./services/ApiClient";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadAlerts = () => {
      DiscoveryClient.getUnreadCount().then(d => setUnreadAlerts(d.unread)).catch(() => {});
      DiscoveryClient.getAlerts().then(setAlerts).catch(() => {});
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60_000);
    return () => clearInterval(interval);
  }, []);

  function navigate(tab: string) {
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen flex text-slate-200">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-30
        border-r border-slate-800/50 glassmorphism p-6 flex flex-col gap-8
        w-[280px] transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:flex-shrink-0
      `}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("dashboard")}>
          <div className="w-8 h-8 rounded bg-synthwave-magenta flex items-center justify-center synth-glow-magenta shadow-lg">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-synthwave-cyan to-synthwave-magenta">
            YOUTUBE LABS
          </h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Button
            variant="ghost"
            onClick={() => navigate("discovery")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'discovery' ? 'text-synthwave-cyan bg-slate-800/30' : 'hover:text-synthwave-cyan'}`}
          >
            <Compass className="w-4 h-4" />
            Discover Channels
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("viewstats")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'viewstats' ? 'text-synthwave-cyan bg-slate-800/30' : 'hover:text-synthwave-cyan'}`}
          >
            <TrendingUp className="w-4 h-4" />
            ViewStats
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("velio")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'velio' ? 'text-synthwave-magenta bg-slate-800/30' : 'hover:text-synthwave-magenta'}`}
          >
            <Search className="w-4 h-4" />
            Velio Discovery
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("socialblade")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'socialblade' ? 'text-synthwave-cyan bg-slate-800/30' : 'hover:text-synthwave-cyan'}`}
          >
            <Activity className="w-4 h-4" />
            SocialBlade
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("vidiq")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'vidiq' ? 'text-synthwave-purple bg-slate-800/30' : 'hover:text-synthwave-purple'}`}
          >
            <FolderOpen className="w-4 h-4" />
            Channel Folders
          </Button>
        </nav>

        {/* Notification Bell */}
        <div className="relative mt-auto">
          <button
            onClick={async () => {
              setShowAlerts(!showAlerts);
              if (!showAlerts && unreadAlerts > 0) {
                await DiscoveryClient.markAllRead().catch(() => {});
                setUnreadAlerts(0);
                setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="text-sm">Alerts</span>
            {unreadAlerts > 0 && (
              <span className="absolute right-2 top-1.5 bg-synthwave-magenta text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center synth-glow-magenta">
                {unreadAlerts > 9 ? "9+" : unreadAlerts}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute bottom-12 left-0 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-200">Recent Alerts</span>
                <button onClick={() => setShowAlerts(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No alerts yet</p>
                ) : (
                  alerts.slice(0, 10).map((alert: any) => (
                    <div key={alert.id} className={`px-4 py-3 border-b border-slate-800/50 text-sm ${alert.is_read ? 'text-slate-500' : 'text-slate-200'}`}>
                      <p>{alert.message}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{new Date(alert.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 relative bg-[#0a0f1d]">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-synthwave-cyan to-synthwave-magenta tracking-wider">
            YOUTUBE LABS
          </span>
          {unreadAlerts > 0 && (
            <span className="ml-auto bg-synthwave-magenta text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center synth-glow-magenta">
              {unreadAlerts > 9 ? "9+" : unreadAlerts}
            </span>
          )}
        </div>

        {/* Background ambient light */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-synthwave-purple/10 rounded-full blur-[120px] z-0 mix-blend-screen pointer-events-none" />

        <div className="relative z-10">
          {activeTab === "discovery" && <ErrorBoundary label="Discovery"><DiscoveryDashboard /></ErrorBoundary>}
          {activeTab === "dashboard" && <ErrorBoundary label="Dashboard"><DashboardHome onNavigate={setActiveTab} /></ErrorBoundary>}
          {activeTab === "viewstats" && <ErrorBoundary label="ViewStats"><ViewStatsDashboard /></ErrorBoundary>}
          {activeTab === "velio" && <ErrorBoundary label="Velio"><VelioDashboard /></ErrorBoundary>}
          {activeTab === "socialblade" && <ErrorBoundary label="SocialBlade"><SocialBladeDashboard /></ErrorBoundary>}
          {activeTab === "vidiq" && <ErrorBoundary label="VidIQ"><VidIQDashboard /></ErrorBoundary>}
        </div>
      </main>

      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  )
}

export default App
