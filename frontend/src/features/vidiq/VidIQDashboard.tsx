import { useState, useEffect } from "react";
import { VidIQClient, ViewStatsClient, SavedKeywordsClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Flame, Save, FolderOpen, Tag } from "lucide-react";
import { SavedKeywordsPanel } from "./SavedKeywordsPanel";
import { RelatedKeywordsPanel } from "./RelatedKeywordsPanel";
import { toast } from "sonner";

const STATUS_CYCLE: Record<string, string> = {
  backlog: "in-progress",
  "in-progress": "published",
  published: "discarded",
  discarded: "backlog",
};
const STATUS_COLORS: Record<string, string> = {
  backlog: "text-slate-400 border-slate-700",
  "in-progress": "text-synthwave-cyan border-synthwave-cyan/50",
  published: "text-green-400 border-green-700",
  discarded: "text-red-400 border-red-800",
};

export function VidIQDashboard() {
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [library, setLibrary] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [videoIdInput, setVideoIdInput] = useState("");
  const [keywordResult, setKeywordResult] = useState<{ video_id: string; title: string; keywords: string[] } | null>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<number, string>>({});

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadThumbnails(ideas: any[]) {
    const idsToFetch = ideas
      .filter((i) => i.video_reference_id && !videoThumbnails[i.video_reference_id])
      .map((i) => i.video_reference_id as number);
    for (const id of idsToFetch) {
      ViewStatsClient.getVideoDetail(id)
        .then((detail) => {
          if (detail?.thumbnail_url) {
            setVideoThumbnails((prev) => ({ ...prev, [id]: detail.thumbnail_url }));
          }
        })
        .catch(() => {});
    }
  }

  async function loadLibrary() {
    const data = await VidIQClient.getSavedIdeas().catch(() => []);
    setLibrary(data || []);
    loadThumbnails(data || []);
  }

  const handleExtractKeywords = async () => {
    const vid = videoIdInput.trim();
    if (!vid) return;
    setLoadingKeywords(true);
    setKeywordResult(null);
    const result = await VidIQClient.extractVideoKeywords(vid).catch(() => null);
    setKeywordResult(result);
    setLoadingKeywords(false);
  };

  const handleStatusClick = async (idea: any) => {
    const next = STATUS_CYCLE[idea.status ?? "backlog"] ?? "backlog";
    await VidIQClient.updateIdeaStatus(idea.id, next).catch(() => {});
    setLibrary((prev) => prev.map((i) => i.id === idea.id ? { ...i, status: next } : i));
  };

  const handleSaveIdea = async () => {
    if (!ideaTitle.trim()) return;
    const idea = await VidIQClient.saveIdea(ideaTitle, ideaCategory || "Uncategorized", ideaNotes || undefined).catch(() => null);
    if (idea) {
      setIdeaTitle("");
      setIdeaCategory("");
      setIdeaNotes("");
      setLibrary((prev) => [idea, ...prev]);
      loadThumbnails([idea]);
    }
  };

  const displayedLibrary = library
    .filter((idea) =>
      filterCategory.trim() === "" ||
      (idea.category ?? "").toLowerCase().includes(filterCategory.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "status") {
        return (a.status ?? "").localeCompare(b.status ?? "");
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-8 h-8 text-synthwave-purple drop-shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">VidIQ Intelligence</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Video Keyword Extractor */}
        <Card className="glassmorphism border-t-synthwave-cyan border-t-2 relative">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-synthwave-cyan" />
              Video Keyword Extractor
            </CardTitle>
            <p className="text-sm text-slate-400">Extract keywords from any YouTube video</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
                value={videoIdInput}
                onChange={(e) => setVideoIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExtractKeywords()}
                className="bg-slate-900 border-slate-700 text-slate-200 flex-1"
              />
              <Button
                onClick={handleExtractKeywords}
                disabled={loadingKeywords}
                className="bg-synthwave-cyan/20 hover:bg-synthwave-cyan/30 border border-synthwave-cyan/50 text-synthwave-cyan"
              >
                {loadingKeywords ? "..." : "Extract"}
              </Button>
            </div>

            {loadingKeywords && (
              <div className="py-8 text-center text-synthwave-cyan animate-pulse text-sm">Extracting keywords...</div>
            )}

            {!loadingKeywords && keywordResult === null && (
              <div className="py-8 text-center text-slate-500 text-sm">Enter a video ID and click Extract to see its keywords.</div>
            )}

            {!loadingKeywords && keywordResult && keywordResult.keywords.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-sm">No keywords found for this video.</div>
            )}

            {!loadingKeywords && keywordResult && keywordResult.keywords.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-200 truncate">{keywordResult.title}</p>
                <div className="flex flex-wrap gap-2">
                  {keywordResult.keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      onClick={() => SavedKeywordsClient.save(kw, videoIdInput.trim()).then(() => toast.success(`"${kw}" saved`)).catch(() => {})}
                      className="bg-slate-800 text-slate-300 border border-slate-700 hover:border-synthwave-purple hover:text-synthwave-purple transition-colors cursor-pointer"
                      title="Click to bookmark"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
                <RelatedKeywordsPanel seedKeyword={keywordResult?.keywords?.[0] ?? null} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Video Idea Library */}
        <Card className="glassmorphism border-t-synthwave-purple border-t-2 flex flex-col h-full opacity-90 hover:opacity-100 transition-opacity">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-synthwave-purple" />
              Personal Library
            </CardTitle>
            <p className="text-sm text-slate-400">Save viral configurations and script hooks</p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 space-y-4">
            {/* Idea creation form */}
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Video title / Hook idea..."
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Category (e.g. Hooks, Outliers)"
                  value={ideaCategory}
                  onChange={(e) => setIdeaCategory(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 flex-1"
                />
                <Button onClick={handleSaveIdea} className="bg-synthwave-purple hover:bg-purple-600 synth-glow-purple text-white">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
              <textarea
                placeholder="Notes (optional)..."
                value={ideaNotes}
                onChange={(e) => setIdeaNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md bg-slate-900 border border-slate-700 text-slate-200 text-sm px-3 py-2 resize-none placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-synthwave-purple"
              />
            </div>

            {/* Filter and sort controls */}
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Filter by category..."
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200 text-sm flex-1"
              />
              <Button
                onClick={() => setSortBy((s) => s === "date" ? "status" : "date")}
                className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 whitespace-nowrap"
              >
                Sort: {sortBy === "date" ? "Date" : "Status"}
              </Button>
            </div>

            {/* Library list */}
            <div className="flex-1 mt-1 border border-slate-800/50 rounded-lg bg-slate-900/30 overflow-y-auto min-h-[250px] p-2 space-y-2">
              {displayedLibrary.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">Library is empty.</div>
              ) : (
                displayedLibrary.map((idea, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/40 rounded hover:bg-slate-800 transition-colors border-l-2 border-synthwave-purple flex justify-between items-start group">
                    {idea.video_reference_id && videoThumbnails[idea.video_reference_id] && (
                      <img
                        src={videoThumbnails[idea.video_reference_id]}
                        alt=""
                        className="w-16 h-10 rounded object-cover border border-slate-700 flex-shrink-0 mr-3"
                      />
                    )}
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white">{idea.title}</p>
                      <p className="text-xs text-synthwave-purple/80">{idea.category}</p>
                      {idea.notes && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{idea.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStatusClick(idea)}
                        className={`text-xs px-2 py-0.5 rounded border cursor-pointer ${STATUS_COLORS[idea.status ?? "backlog"]}`}
                      >
                        {idea.status ?? "backlog"}
                      </button>
                      <span className="text-xs text-slate-500">{new Date(idea.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      <SavedKeywordsPanel />
    </div>
  );
}
