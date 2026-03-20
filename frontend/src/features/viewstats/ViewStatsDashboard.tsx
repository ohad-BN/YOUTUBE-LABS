import { useEffect, useState } from "react";
import { ViewStatsClient, DiscoveryClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Activity, Zap } from "lucide-react";
import { VideoDetailModal } from "./VideoDetailModal";

export function ViewStatsDashboard() {
  const [trackedChannels, setTrackedChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [outliers, setOutliers] = useState<any[]>([]);
  const [velocity, setVelocity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  useEffect(() => {
    DiscoveryClient.getTrackedChannels()
      .then((data) => {
        setTrackedChannels(data || []);
        if (data && data.length > 0) setActiveChannelId(data[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeChannelId) return;
    async function fetchData() {
      try {
        setLoading(true);
        const outlierData = await ViewStatsClient.getOutliers(activeChannelId!).catch(() => []);
        const velocityData = await ViewStatsClient.getTopVelocity(5).catch(() => []);
        setOutliers(outlierData || []);
        setVelocity(velocityData || []);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeChannelId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-synthwave-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">ViewStats Engine</h2>
      </div>

      {trackedChannels.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          No channels tracked yet. Use <span className="text-synthwave-cyan">Discover Channels</span> to add some.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-6">
          {trackedChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors border ${
                activeChannelId === ch.id
                  ? "bg-synthwave-cyan/20 text-synthwave-cyan border-synthwave-cyan/50"
                  : "text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {ch.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Outlier Engine UI */}
        <Card className="glassmorphism border-t-synthwave-magenta border-t-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-32 h-32 text-synthwave-magenta" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-synthwave-magenta animate-pulse synth-glow-magenta" />
              Exponential Outliers
            </CardTitle>
            <p className="text-sm text-slate-400">Videos performing 3x+ above channel average</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-slate-500 animate-pulse">Scanning channel matrix...</div>
            ) : outliers.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No outliers detected for this channel yet.</div>
            ) : (
              <div className="space-y-4">
                {outliers.map((item, idx) => (
                  <div key={idx} onClick={() => setSelectedVideoId(item.video.id)} className="flex justify-between items-center p-3 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors border-l-2 border-transparent hover:border-synthwave-magenta cursor-pointer">
                    <div className="truncate pr-4 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.video.title}</p>
                      <p className="text-xs text-slate-500">{new Date(item.video.published_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-synthwave-magenta drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]">
                        {item.multiplier}x
                      </p>
                      <p className="text-xs text-slate-400">{item.video.view_count.toLocaleString()} views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Velocity UI */}
        <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-synthwave-cyan animate-pulse synth-glow-cyan" />
              Global View Velocity (VPH)
            </CardTitle>
            <p className="text-sm text-slate-400">Real-time traction across tracked channels</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Video</TableHead>
                  <TableHead className="text-right text-slate-400">VPH</TableHead>
                  <TableHead className="text-right text-slate-400">Total Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                     <TableCell colSpan={3} className="text-center py-8 text-slate-500">Calculating velocity streams...</TableCell>
                  </TableRow>
                ) : velocity.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={3} className="text-center py-8 text-slate-500">Insufficient velocity data.</TableCell>
                  </TableRow>
                ) : (
                  velocity.map((vid, idx) => (
                    <TableRow key={idx} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="font-medium">
                        <p className="text-sm text-slate-200 truncate max-w-[200px]">{vid.title}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-synthwave-cyan font-mono font-bold bg-synthwave-cyan/10 px-2 py-1 rounded drop-shadow-[0_0_5px_rgba(0,255,255,0.3)]">
                          {vid.vph?.toLocaleString() || 0}/hr
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-slate-400 font-mono text-xs">
                        {vid.view_count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <VideoDetailModal videoId={selectedVideoId} onClose={() => setSelectedVideoId(null)} />
    </div>
  );
}
