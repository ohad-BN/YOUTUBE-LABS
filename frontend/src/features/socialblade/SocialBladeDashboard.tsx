import { useEffect, useState } from "react";
import { SocialBladeClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Activity, BarChart3, TrendingUp } from "lucide-react";

export function SocialBladeDashboard() {
  const [projections, setProjections] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active channel is hardcoded for demo purposes
  const activeChannelId = 1;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await SocialBladeClient.getProjections(activeChannelId).catch(() => null);
      setProjections(data);
      setLoading(false);
    }
    loadData();
  }, [activeChannelId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-8 h-8 text-synthwave-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">SocialBlade Projections</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
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

      </div>
    </div>
  );
}
