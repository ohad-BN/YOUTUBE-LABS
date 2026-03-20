import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { Tv, TrendingUp, FolderOpen, Activity, Search, Compass, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { ViewStatsDashboard } from "./features/viewstats/ViewStatsDashboard";
import { VelioDashboard } from "./features/velio/VelioDashboard";
import { SocialBladeDashboard } from "./features/socialblade/SocialBladeDashboard";
import { VidIQDashboard } from "./features/vidiq/VidIQDashboard";
import { DiscoveryDashboard } from "./features/discovery/DiscoveryDashboard";
import { DiscoveryClient, ViewStatsClient } from "./services/ApiClient";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<{ total_channels: number; total_videos: number; total_folders: number } | null>(null);
  const [globalVph, setGlobalVph] = useState<any[]>([]);
  const [globalOutliers, setGlobalOutliers] = useState<any[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    DiscoveryClient.getStats().then(setStats).catch(() => {});
    ViewStatsClient.getTopVelocity(5).then(setGlobalVph).catch(() => {});
    ViewStatsClient.getGlobalOutliers(5).then(setGlobalOutliers).catch(() => {});
  }, []);

  useEffect(() => {
    const loadAlerts = () => {
      DiscoveryClient.getUnreadCount().then(d => setUnreadAlerts(d.unread)).catch(() => {});
      DiscoveryClient.getAlerts().then(setAlerts).catch(() => {});
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr] text-slate-200">

      {/* Sidebar Navigation */}
      <aside className="border-r border-slate-800/50 glassmorphism p-6 flex flex-col gap-8 z-10 h-screen sticky top-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
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
            onClick={() => setActiveTab("discovery")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'discovery' ? 'text-synthwave-cyan bg-slate-800/30' : 'hover:text-synthwave-cyan'}`}
          >
            <Compass className="w-4 h-4" />
            Discover Channels
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("viewstats")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'viewstats' ? 'text-synthwave-cyan bg-slate-800/30' : 'hover:text-synthwave-cyan'}`}
          >
            <TrendingUp className="w-4 h-4" />
            ViewStats
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("velio")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'velio' ? 'text-synthwave-magenta bg-slate-800/30' : 'hover:text-synthwave-magenta'}`}
          >
            <Search className="w-4 h-4" />
            Velio Discovery
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("socialblade")}
            className={`justify-start gap-3 hover:bg-slate-800/50 ${activeTab === 'socialblade' ? 'text-synthwave-cyan bg-slate-800/30' : 'hover:text-synthwave-cyan'}`}
          >
            <Activity className="w-4 h-4" />
            SocialBlade
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("vidiq")}
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
      <main className="p-8 relative bg-[#0a0f1d]">
        {/* Background ambient light */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-synthwave-purple/10 rounded-full blur-[120px] z-0 mix-blend-screen pointer-events-none" />

        <div className="relative z-10">
          {activeTab === "discovery" && <DiscoveryDashboard />}
          {activeTab === "dashboard" && (
            <div className="animate-in fade-in duration-500">
              <header className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-light tracking-tight">Dashboard Overview</h2>
              </header>

              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-400">Tracked Channels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold font-mono text-white">{stats?.total_channels ?? "—"}</div>
                      <p className="text-xs text-synthwave-cyan mt-1">channels being monitored</p>
                    </CardContent>
                  </Card>
                  <Card className="glassmorphism border-t-synthwave-magenta border-t-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-400">Tracked Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold font-mono text-white">{stats?.total_videos ?? "—"}</div>
                      <p className="text-xs text-synthwave-magenta mt-1">videos indexed</p>
                    </CardContent>
                  </Card>
                  <Card className="glassmorphism border-t-synthwave-purple border-t-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-400">Folders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold font-mono text-white">{stats?.total_folders ?? "—"}</div>
                      <p className="text-xs text-synthwave-purple mt-1">research groups</p>
                    </CardContent>
                  </Card>
                </div>
                {(!stats || stats.total_channels === 0) && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No channels tracked yet. Use <span className="text-synthwave-cyan cursor-pointer" onClick={() => setActiveTab("discovery")}>Discover Channels</span> to get started.
                  </div>
                )}

                {/* Global VPH Leaderboard */}
                {globalVph.length > 0 && (
                  <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-synthwave-cyan animate-pulse" />
                        Fastest Growing Right Now
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {globalVph.map((vid: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/60 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">{vid.title}</p>
                              <p className="text-xs text-slate-500">{vid.view_count?.toLocaleString()} views</p>
                            </div>
                            <span className="text-synthwave-cyan font-mono font-bold text-sm whitespace-nowrap">
                              {vid.vph?.toLocaleString()}/hr
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Global Outliers Feed */}
                {globalOutliers.length > 0 && (
                  <Card className="glassmorphism border-t-synthwave-magenta border-t-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-synthwave-magenta animate-pulse" />
                        Top Outliers Across All Channels
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {globalOutliers.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800/60 last:border-0">
                            {item.thumbnail_url && (
                              <img src={item.thumbnail_url} alt={item.title} className="w-16 h-10 object-cover rounded flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">{item.title}</p>
                              <p className="text-xs text-slate-500">{item.channel_title}</p>
                            </div>
                            <span className="text-synthwave-magenta font-mono font-bold text-sm whitespace-nowrap">
                              {item.outlier_score?.toFixed(1)}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === "viewstats" && <ViewStatsDashboard />}
          {activeTab === "velio" && <VelioDashboard />}
          {activeTab === "socialblade" && <SocialBladeDashboard />}
          {activeTab === "vidiq" && <VidIQDashboard />}
        </div>
      </main>

      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  )
}

export default App
