import { useEffect, useState, useCallback } from "react";
import { NichesClient, ResearchClient, type FolderVideo, type FolderChannel } from "../../services/ApiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Video,
  Eye,
  ThumbsUp,
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Download,
  Loader2,
} from "lucide-react";

interface Props {
  folderId: number;
  folderName: string;
  onBack: () => void;
}

type SortOption = "newest" | "most_views" | "outlier_score" | "vph";
type DateFilter = "all" | "7d" | "30d" | "90d";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most_views", label: "Most Views" },
  { value: "outlier_score", label: "Outlier Score" },
  { value: "vph", label: "VPH" },
];

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const PER_PAGE = 20;

function formatNumber(n: number | undefined | null): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatRelativeTime(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diffDay = Math.floor((now - then) / 86_400_000);
  if (diffDay >= 365) return `${Math.floor(diffDay / 365)}y ago`;
  if (diffDay >= 30) return `${Math.floor(diffDay / 30)}mo ago`;
  if (diffDay >= 7) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay >= 1) return `${diffDay}d ago`;
  const diffHr = Math.floor((now - then) / 3_600_000);
  if (diffHr >= 1) return `${diffHr}h ago`;
  return "Just now";
}

function dateDaysFromFilter(f: DateFilter): number | undefined {
  if (f === "7d") return 7;
  if (f === "30d") return 30;
  if (f === "90d") return 90;
  return undefined;
}

export function NicheDetailPage({ folderId, folderName, onBack }: Props) {
  const [videos, setVideos] = useState<FolderVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [page, setPage] = useState(1);

  // Channels in this folder (for "fetch more" feature)
  const [channels, setChannels] = useState<FolderChannel[]>([]);
  const [ingesting, setIngesting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchDebounced, sortBy, sortDir, dateFilter]);

  // Fetch videos from server
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await NichesClient.getFolderVideos(folderId, {
        page,
        per_page: PER_PAGE,
        sort_by: sortBy,
        sort_dir: sortDir,
        search: searchDebounced || undefined,
        date_days: dateDaysFromFilter(dateFilter),
      });
      setVideos(data.items);
      setTotal(data.total);
    } catch {
      setVideos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [folderId, page, sortBy, sortDir, searchDebounced, dateFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Load folder channels once (for ingest-more)
  useEffect(() => {
    ResearchClient.getFolderChannels(folderId).then(setChannels).catch(() => {});
  }, [folderId]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleIngestMore = async () => {
    if (channels.length === 0) return;
    setIngesting(true);
    try {
      let totalNew = 0;
      for (const ch of channels) {
        const res = await NichesClient.ingestMore(ch.id, 5);
        totalNew += res.total_videos;
      }
      toast.success(`Fetched older videos. ${totalNew} total videos now indexed.`);
      await fetchVideos();
    } catch {
      toast.error("Failed to fetch more videos");
    } finally {
      setIngesting(false);
    }
  };

  const hasNoVideos = !loading && total === 0 && !searchDebounced;
  const hasNoResults = !loading && total === 0 && !!searchDebounced;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-light tracking-tight text-white">
          {folderName}
        </h2>
        {!loading && (
          <span className="text-sm text-slate-500 ml-1">
            {total} video{total !== 1 ? "s" : ""}
          </span>
        )}
        {/* Fetch older videos button */}
        {channels.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={ingesting}
            onClick={handleIngestMore}
            className="ml-auto bg-slate-800/60 border-slate-700 text-slate-300 hover:border-synthwave-cyan hover:text-synthwave-cyan text-xs"
          >
            {ingesting ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Fetching...</>
            ) : (
              <><Download className="w-3 h-3 mr-1" /> Fetch older videos</>
            )}
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search videos by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-900/80 border-slate-700 text-slate-200 pl-10 h-11"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Sort</span>
          <div className="flex gap-1.5">
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (isActive) {
                      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                    } else {
                      setSortBy(opt.value);
                      setSortDir("desc");
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1 ${
                    isActive
                      ? "bg-synthwave-magenta/20 border-synthwave-magenta text-synthwave-magenta"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {opt.label}
                  {isActive &&
                    (sortDir === "desc" ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronUp className="w-3 h-3" />
                    ))}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-px h-6 bg-slate-700 hidden sm:block" />

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Date</span>
          <div className="flex gap-1.5">
            {DATE_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  dateFilter === opt.value
                    ? "bg-synthwave-cyan/20 border-synthwave-cyan text-synthwave-cyan"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="glassmorphism overflow-hidden">
              <Skeleton className="w-full aspect-video" />
              <CardContent className="pt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty: No Videos */}
      {hasNoVideos && (
        <Card className="glassmorphism border-t-synthwave-purple border-t-2">
          <CardContent className="py-16 text-center">
            <Video className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No videos tracked yet.</p>
            <p className="text-slate-500 text-sm mt-2">
              Add channels to this niche from the Explore tab.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty: No Search Results */}
      {hasNoResults && (
        <Card className="glassmorphism">
          <CardContent className="py-16 text-center">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No videos match your search.</p>
            <p className="text-slate-500 text-sm mt-2">
              Try a different search term or adjust your filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PER_PAGE && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Video Card ──────────────────────────────────────────────────────── */

function VideoCard({ video }: { video: FolderVideo }) {
  const showOutlierBadge =
    video.outlier_score != null && video.outlier_score > 3;
  const showHotBadge = video.vph != null && video.vph > 1000;

  return (
    <div className="group rounded-lg overflow-hidden border border-slate-800 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-synthwave-cyan/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-800 overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <Video className="w-10 h-10 text-slate-600" />
          </div>
        )}

        {/* Badges overlay */}
        {(showOutlierBadge || showHotBadge) && (
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {showOutlierBadge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-synthwave-magenta/90 text-white shadow-[0_0_8px_rgba(255,0,255,0.5)]">
                Outlier {video.outlier_score!.toFixed(1)}x
              </span>
            )}
            {showHotBadge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-synthwave-cyan/90 text-slate-900 shadow-[0_0_8px_rgba(0,255,255,0.5)] flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Hot
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">
          {video.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(video.view_count)}
          </span>
          {video.like_count != null && video.like_count > 0 && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {formatNumber(video.like_count)}
            </span>
          )}
          {video.published_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(video.published_at)}
            </span>
          )}
        </div>

        {video.vph != null && video.vph > 0 && (
          <div className="text-[11px] text-synthwave-cyan font-mono">
            {formatNumber(video.vph)} views/hr
          </div>
        )}
      </div>
    </div>
  );
}
