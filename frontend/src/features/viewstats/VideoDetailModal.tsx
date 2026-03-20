import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Eye, ThumbsUp, MessageSquare, Zap, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { ViewStatsClient } from "../../services/ApiClient";

interface Props {
  videoId: number | null;
  onClose: () => void;
}

export function VideoDetailModal({ videoId, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!videoId) { setDetail(null); return; }
    setLoading(true);
    ViewStatsClient.getVideoDetail(videoId)
      .then(setDetail)
      .catch((err) => toast.error(err.message || "Failed to load video details"))
      .finally(() => setLoading(false));
  }, [videoId]);

  return (
    <Dialog open={!!videoId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading && (
          <div className="py-20 text-center text-slate-400 animate-pulse">Loading video data...</div>
        )}
        {!loading && detail && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white text-lg leading-snug pr-6">{detail.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {detail.channel_thumbnail && (
                  <img src={detail.channel_thumbnail} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span className="text-sm text-slate-400">{detail.channel_title}</span>
                {detail.published_at && (
                  <span className="text-xs text-slate-500 ml-auto">
                    {new Date(detail.published_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </DialogHeader>

            {/* Thumbnail */}
            {detail.thumbnail_url && (
              <img
                src={detail.thumbnail_url}
                alt={detail.title}
                className="w-full rounded-lg border border-slate-700 object-cover"
              />
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
              {[
                { icon: Eye, label: "Views", value: detail.view_count?.toLocaleString() },
                { icon: ThumbsUp, label: "Likes", value: detail.like_count?.toLocaleString() },
                { icon: MessageSquare, label: "Comments", value: detail.comment_count?.toLocaleString() },
                { icon: Zap, label: "VPH", value: detail.vph != null ? `${Number(detail.vph).toLocaleString()}/hr` : "—" },
                { icon: TrendingUp, label: "Outlier", value: detail.outlier_score != null ? `${Number(detail.outlier_score).toFixed(2)}x` : "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700">
                  <Icon className="w-4 h-4 text-synthwave-cyan mx-auto mb-1" />
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-semibold text-white font-mono">{value ?? "—"}</p>
                </div>
              ))}
            </div>

            {/* Watch link */}
            <a
              href={`https://youtube.com/watch?v=${detail.youtube_video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-synthwave-cyan hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Watch on YouTube
            </a>

            {/* Thumbnail history */}
            {detail.thumbnail_history?.length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Thumbnail History
                  <Badge variant="outline" className="ml-2 text-xs border-slate-600 text-slate-400">
                    {detail.thumbnail_history.length}
                  </Badge>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {detail.thumbnail_history.map((h: any, i: number) => (
                    <div key={i} className="flex gap-3 items-start bg-slate-800/40 rounded-lg p-2 border border-slate-700/50">
                      <img src={h.thumbnail_url} alt="" className="w-24 rounded border border-slate-600 object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 line-clamp-2">{h.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(h.detected_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
