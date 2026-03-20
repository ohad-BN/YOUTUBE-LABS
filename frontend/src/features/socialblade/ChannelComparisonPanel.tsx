import { useState } from "react";
import { SocialBladeClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { GitCompareArrows } from "lucide-react";

interface Props {
  trackedChannels: any[];
}

const METRICS = [
  { label: "Subscribers", key: "subscriber_count" },
  { label: "Views", key: "view_count" },
  { label: "Videos", key: "video_count" },
  { label: "Grade", key: "grade" },
  { label: "Daily Avg Subs", key: "daily_avg_subs" },
];

export function ChannelComparisonPanel({ trackedChannels }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonData, setComparisonData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleChannel(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
    setComparisonData(null);
  }

  async function handleCompare() {
    if (selectedIds.length < 2) return;
    setLoading(true);
    try {
      const data = await SocialBladeClient.compareChannels(selectedIds);
      setComparisonData(data);
    } catch {
      setComparisonData([]);
    } finally {
      setLoading(false);
    }
  }

  function formatValue(key: string, val: any) {
    if (val == null) return <span className="text-slate-600">—</span>;
    if (key === "grade") return <Badge className="bg-synthwave-purple/20 text-synthwave-purple border-synthwave-purple/40">{val}</Badge>;
    if (typeof val === "number") return val.toLocaleString();
    return val;
  }

  return (
    <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
      <CardHeader>
        <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
          <GitCompareArrows className="w-5 h-5 text-synthwave-cyan" />
          Channel Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Channel selector */}
        <div className="flex flex-wrap gap-2">
          {trackedChannels.length === 0 ? (
            <p className="text-slate-500 text-sm">No tracked channels available.</p>
          ) : (
            trackedChannels.map((ch) => {
              const active = selectedIds.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    active
                      ? "bg-synthwave-cyan/20 border-synthwave-cyan text-synthwave-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-synthwave-cyan/50 hover:text-white"
                  }`}
                >
                  {ch.title}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={selectedIds.length < 2 || loading}
            onClick={handleCompare}
            className="bg-synthwave-cyan/10 border border-synthwave-cyan text-synthwave-cyan hover:bg-synthwave-cyan/20 disabled:opacity-40"
          >
            {loading ? "Comparing..." : "Compare"}
          </Button>
          <span className="text-xs text-slate-500">{selectedIds.length}/5 selected (min 2)</span>
        </div>

        {/* Results table */}
        {comparisonData && comparisonData.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 w-36">Metric</TableHead>
                {comparisonData.map((ch) => (
                  <TableHead key={ch.channel_id} className="text-synthwave-cyan text-center">
                    {ch.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRICS.map((metric) => (
                <TableRow key={metric.key} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="text-slate-400 text-sm font-medium">{metric.label}</TableCell>
                  {comparisonData.map((ch) => (
                    <TableCell key={ch.channel_id} className="text-center font-mono text-slate-200">
                      {formatValue(metric.key, ch[metric.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {comparisonData && comparisonData.length === 0 && (
          <p className="text-slate-500 text-sm">No data returned. Ensure selected channels have been tracked.</p>
        )}
      </CardContent>
    </Card>
  );
}
