import { useEffect, useState } from "react";
import { SocialBladeClient, DiscoveryClient } from "../../services/ApiClient";
import { ChannelComparisonPanel } from "./ChannelComparisonPanel";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Activity, BarChart3, TrendingUp, DollarSign, Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export function SocialBladeDashboard() {
  const [projections, setProjections] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackedChannels, setTrackedChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [view, setView] = useState<"projections" | "compare">("projections");

  // Load tracked channels on mount
  useEffect(() => {
    async function loadChannels() {
      const data = await DiscoveryClient.getTrackedChannels().catch(() => []);
      setTrackedChannels(data);
      setActiveChannelId(data[0]?.id ?? null);
    }
    loadChannels();
  }, []);

  // Load projections and daily stats whenever activeChannelId changes
  useEffect(() => {
    if (!activeChannelId) {
      setProjections(null);
      setDailyStats([]);
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      const [projData, statsData] = await Promise.all([
        SocialBladeClient.getProjections(activeChannelId).catch(() => null),
        SocialBladeClient.getStats(activeChannelId, 30).catch(() => []),
      ]);
      setProjections(projData);
      // Backend already returns oldest → newest (sorted ascending)
      setDailyStats((statsData as any[]) ?? []);
      setLoading(false);
    }
    loadData();
  }, [activeChannelId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Activity className="w-8 h-8 text-synthwave-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">SocialBlade Projections</h2>
      </div>

      {/* View Toggle + Channel Picker + Export */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="flex flex-wrap gap-2">
        {/* View toggle */}
        {["projections", "compare"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as "projections" | "compare")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
              view === v
                ? "bg-synthwave-magenta/20 border-synthwave-magenta text-synthwave-magenta shadow-[0_0_8px_rgba(180,0,255,0.4)]"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-synthwave-magenta/50 hover:text-white"
            }`}
          >
            {v === "projections" ? "Projections" : "Compare"}
          </button>
        ))}
        <span className="w-px h-6 bg-slate-700 self-center mx-1" />
      </div>
      </div>

      {view === "compare" && (
        <ChannelComparisonPanel trackedChannels={trackedChannels} />
      )}

      {view === "projections" && (
      <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="flex flex-wrap gap-2">
        {trackedChannels.length === 0 ? (
          <p className="text-synthwave-cyan text-sm">
            No channels tracked yet. Use Discover Channels to add some.
          </p>
        ) : (
          trackedChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeChannelId === ch.id
                  ? "bg-synthwave-cyan/20 border-synthwave-cyan text-synthwave-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-synthwave-cyan/50 hover:text-white"
              }`}
            >
              {ch.title}
            </button>
          ))
        )}
      </div>
      {activeChannelId && (
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300 hover:border-synthwave-cyan hover:text-synthwave-cyan"
          onClick={() => window.open(SocialBladeClient.exportCsv(activeChannelId), "_blank")}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      )}
      </div>

      {/* 3-column metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Current Stats Overview */}
        <Card className="glassmorphism border-t-synthwave-cyan border-t-2 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-synthwave-cyan" />
              Channel Current Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse text-slate-500">Scanning historical blocks...</div>
            ) : !projections ? (
              <div className="text-slate-500">Insufficient historical data to form current metrics.</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-slate-400">Total Subscribers</p>
                  <p className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                    {projections.current_subs?.toLocaleString()}
                  </p>
                  <p className="text-sm text-synthwave-cyan mt-1">
                    Avg +{projections.daily_avg_subs?.toLocaleString()}/day
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Views</p>
                  <p className="text-4xl font-mono font-bold text-synthwave-cyan">
                    {projections.current_views?.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Avg +{projections.daily_avg_views?.toLocaleString()}/day
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Upload Frequency</p>
                  <p className="text-2xl font-mono font-bold text-synthwave-magenta">
                    {projections.upload_frequency_per_week != null
                      ? `${projections.upload_frequency_per_week} videos/week`
                      : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Projections Table */}
        <Card className="glassmorphism border-t-synthwave-magenta border-t-2">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-synthwave-magenta" />
              Future Growth Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse text-synthwave-magenta text-center py-10">
                Running predictive algorithms...
              </div>
            ) : !projections || !projections.projections ? (
              <div className="text-center py-10 text-slate-500">Projection engine requires more days of tracked data.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Timeframe</TableHead>
                    <TableHead className="text-right text-slate-400">Target Date</TableHead>
                    <TableHead className="text-right text-synthwave-magenta">Proj. Subs</TableHead>
                    <TableHead className="text-right text-synthwave-cyan">Proj. Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projections.projections.map((proj: any, idx: number) => (
                    <TableRow key={idx} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="font-medium text-slate-200">
                        {proj.days_forward} Days
                      </TableCell>
                      <TableCell className="text-right text-slate-400 text-sm">
                        {new Date(proj.projected_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-synthwave-magenta font-bold">
                        {proj.projected_subs.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-synthwave-cyan">
                        {proj.projected_views.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Revenue Estimate */}
        <Card className="glassmorphism border-t-synthwave-purple border-t-2 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-synthwave-purple" />
              Est. Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse text-slate-500">Calculating earnings...</div>
            ) : !projections ? (
              <div className="text-slate-500">No revenue data available.</div>
            ) : (
              <div className="space-y-3">
                <p className="text-3xl font-mono font-bold text-synthwave-purple drop-shadow-[0_0_8px_rgba(180,0,255,0.5)]">
                  ${projections.estimated_monthly_revenue_low?.toLocaleString()} – ${projections.estimated_monthly_revenue_high?.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">Based on $2–$8 CPM range</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Subscriber Growth Chart — full width */}
      <Card className="glassmorphism border-t-synthwave-cyan border-t-2 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-synthwave-cyan" />
            Subscriber Growth (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse text-slate-500 py-6">Loading chart data...</div>
          ) : dailyStats.length === 0 ? (
            <div className="text-slate-500 py-6 text-center">
              No historical data yet — stats will appear once daily polling is set up.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyStats} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date_recorded"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(val: string) => val.slice(5)} // show MM-DD
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={50} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #00ffff33", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Line
                  type="monotone"
                  dataKey="daily_subs"
                  name="Total Subs"
                  stroke="#00ffff"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="gain_subs"
                  name="Daily Gain"
                  stroke="#ff00ff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      )}

    </div>
  );
}
