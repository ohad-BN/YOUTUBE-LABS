import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { DiscoveryClient, ViewStatsClient } from "../../services/ApiClient";

interface Props {
  onNavigate: (tab: string) => void;
}

export function DashboardHome({ onNavigate }: Props) {
  const [stats, setStats] = useState<{ total_channels: number; total_videos: number; total_folders: number } | null>(null);
  const [globalVph, setGlobalVph] = useState<any[]>([]);
  const [globalOutliers, setGlobalOutliers] = useState<any[]>([]);

  useEffect(() => {
    DiscoveryClient.getStats().then(setStats).catch(() => {});
    ViewStatsClient.getTopVelocity(5).then(setGlobalVph).catch(() => {});
    ViewStatsClient.getGlobalOutliers(5).then(setGlobalOutliers).catch(() => {});
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-light tracking-tight">Dashboard Overview</h2>
      </header>

      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
            No channels tracked yet. Use <span className="text-synthwave-cyan cursor-pointer" onClick={() => onNavigate("discovery")}>Discover Channels</span> to get started.
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
  );
}
