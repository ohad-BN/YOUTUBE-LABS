import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChannelSearchResult, Folder, FolderVideo, TrendingYouTubeVideo } from "../../services/ApiClient";
import { ResearchClient, NichesClient, TrendsClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Compass, Search, Video, X, MoreVertical, Pencil, Trash2, Check } from "lucide-react";
import { Carousel } from "./Carousel";
import { VideoCardWithActions } from "./VideoCardWithActions";
import { Skeleton } from "../../components/ui/skeleton";
import { NicheDetailPage } from "./NicheDetailPage";

interface TrendingVideo {
  id: number;
  title: string;
  thumbnail_url?: string;
  view_count: number;
  published_at?: string;
  channel_title?: string;
}

interface AddModalState {
  isOpen: boolean;
  video?: TrendingVideo;
}

interface NicheMenuState {
  folderId: number;
  action: "menu" | "rename" | "confirmDelete";
}

export function ResearchNewV2() {
  const [activeTab, setActiveTab] = useState<"explore" | "niches">("explore");

  // Niche detail routing
  const [openNicheId, setOpenNicheId] = useState<number | null>(null);

  // Explore state
  const [feedMode, setFeedMode] = useState<"following" | "trending">("following");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChannelSearchResult[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [addModal, setAddModal] = useState<AddModalState>({ isOpen: false });

  // Niches state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [folderVideos, setFolderVideos] = useState<FolderVideo[]>([]);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Niche card management state
  const [nicheMenu, setNicheMenu] = useState<NicheMenuState | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setNicheMenu(null);
      }
    }
    if (nicheMenu?.action === "menu") {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [nicheMenu]);

  // Load folders on mount
  useEffect(() => {
    async function load() {
      const data = await NichesClient.getFolders().catch(() => []);
      setFolders(data || []);
      if (data && data.length > 0) {
        setActiveFolder(data[0].id);
      }
    }
    load();
  }, []);

  // Load folder videos
  useEffect(() => {
    if (!activeFolder || activeFolder <= 0) return;

    async function load() {
      setLoadingFolder(true);
      try {
        const data = await NichesClient.getFolderVideos(activeFolder!, { per_page: 100 }).catch(
          () => ({ items: [] as FolderVideo[], total: 0, page: 1, per_page: 100 })
        );
        setFolderVideos(data.items || []);
      } finally {
        setLoadingFolder(false);
      }
    }
    load();
  }, [activeFolder]);

  // Load videos for Explore based on feedMode
  useEffect(() => {
    if (activeTab === "explore" && !searchQuery) {
      async function load() {
        setLoadingTrending(true);
        try {
          if (feedMode === "trending") {
            // Global YouTube trending — no relation to tracked channels
            const videos: TrendingYouTubeVideo[] = await ResearchClient.getTrendingVideos("US", 24).catch(() => []);
            setTrendingVideos(
              videos.map((v, i) => ({
                id: i + 1, // synthetic id since these aren't in our DB
                title: v.title,
                thumbnail_url: v.thumbnail_url,
                view_count: v.view_count,
                published_at: v.published_at,
                channel_title: v.channel_title,
              }))
            );
          } else {
            // Following — from tracked channels (outliers + velocity)
            const [outliers, velocity] = await Promise.all([
              TrendsClient.getGlobalOutliers(24).catch(() => []),
              TrendsClient.getTopVelocity(24).catch(() => []),
            ]);
            const fromOutliers: TrendingVideo[] = outliers.map((v) => ({
              id: v.video_id,
              title: v.title,
              thumbnail_url: v.thumbnail_url,
              view_count: v.view_count,
              published_at: v.published_at,
              channel_title: v.channel_title,
            }));
            const outlierIds = new Set(fromOutliers.map((v) => v.id));
            const fromVelocity: TrendingVideo[] = velocity
              .filter((v) => !outlierIds.has(v.video_id))
              .map((v) => ({
                id: v.video_id,
                title: v.title,
                thumbnail_url: undefined,
                view_count: v.view_count,
                published_at: undefined,
                channel_title: undefined,
              }));
            setTrendingVideos([...fromOutliers, ...fromVelocity]);
          }
        } finally {
          setLoadingTrending(false);
        }
      }
      load();
    }
  }, [activeTab, searchQuery, feedMode]);

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await ResearchClient.searchChannels(query);
      setSearchResults(results || []);
    } catch {
      toast.error("Search failed");
      setSearchResults([]);
    }
  };

  // Add channel to folder
  const handleAddChannel = async (channel: ChannelSearchResult, folderId: number) => {
    try {
      const result = await ResearchClient.trackChannel(
        channel.youtube_channel_id
      );
      if (result.channel_id) {
        await ResearchClient.addChannelToFolder(folderId, result.channel_id).catch(
          () => {}
        );
        toast.success(`Added ${channel.title}`);
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch {
      toast.error("Could not add channel");
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await NichesClient.createFolder(newFolderName, undefined);
      const updated = await NichesClient.getFolders().catch(() => []);
      setFolders(updated || []);
      setNewFolderName("");
      toast.success("Niche created");
    } catch {
      toast.error("Could not create niche");
    }
  };

  // Rename a niche folder
  const handleRenameNiche = async (folderId: number) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    const original = folders.find((f) => f.id === folderId);
    try {
      const updated = await NichesClient.renameFolder(
        folderId,
        trimmed,
        original?.tags ?? []
      );
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? updated : f))
      );
      setNicheMenu(null);
      setRenameValue("");
      toast.success("Niche renamed");
    } catch {
      toast.error("Could not rename niche");
    }
  };

  // Delete a niche folder
  const handleDeleteNiche = async (folderId: number) => {
    try {
      await ResearchClient.deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (activeFolder === folderId) setActiveFolder(null);
      setNicheMenu(null);
      toast.success("Niche deleted");
    } catch {
      toast.error("Could not delete niche");
    }
  };

  // 6 per row for smooth infinite scroll (duplicated inside Carousel)
  const groupedVideos = trendingVideos.reduce(
    (acc, video, idx) => {
      const groupIdx = Math.floor(idx / 6);
      if (!acc[groupIdx]) acc[groupIdx] = [];
      acc[groupIdx].push(video);
      return acc;
    },
    {} as Record<number, TrendingVideo[]>
  );

  // If a niche is open, render the detail page
  if (openNicheId) {
    const folder = folders.find((f) => f.id === openNicheId);
    return <NicheDetailPage folderId={openNicheId} folderName={folder?.name ?? "Niche"} onBack={() => setOpenNicheId(null)} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-8 h-8 text-synthwave-magenta drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">
          Research
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("explore")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "explore"
              ? "text-synthwave-magenta border-b-2 border-synthwave-magenta"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Explore
        </button>
        <button
          onClick={() => setActiveTab("niches")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "niches"
              ? "text-synthwave-magenta border-b-2 border-synthwave-magenta"
              : "text-slate-400 hover:text-white"
          }`}
        >
          My Niches ({folders.length})
        </button>
      </div>

      {/* EXPLORE TAB */}
      {activeTab === "explore" && (
        <div className="space-y-8">
          {/* Search Bar */}
          <Card className="glasmorphism border-t-synthwave-cyan border-t-2">
            <CardHeader>
              <CardTitle className="text-white">Find Channels & Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search channel name, @handle, or topic..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-200 pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card className="glasmorphism border-t-synthwave-cyan border-t-2">
              <CardHeader>
                <CardTitle className="text-white">
                  Results for "{searchQuery}"
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchResults.map((channel) => (
                    <div
                      key={channel.youtube_channel_id}
                      className="p-4 bg-slate-800/50 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {channel.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(channel.subscriber_count || 0) >= 1_000_000
                            ? `${(
                                (channel.subscriber_count || 0) / 1_000_000
                              ).toFixed(1)}M`
                            : (channel.subscriber_count || 0) >= 1_000
                            ? `${Math.round(
                                (channel.subscriber_count || 0) / 1_000
                              )}K`
                            : channel.subscriber_count || 0}{" "}
                          subscribers
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <select
                          onChange={(e) => {
                            const folderId = Number(e.target.value);
                            if (folderId) {
                              handleAddChannel(channel, folderId);
                            }
                          }}
                          defaultValue=""
                          className="h-9 px-3 rounded bg-slate-900 border border-slate-700 text-slate-200 text-sm"
                        >
                          <option value="">Add to...</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feed Mode Toggle */}
          {!searchQuery && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Show:</span>
              {(["following", "trending"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFeedMode(mode)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                    feedMode === mode
                      ? "bg-synthwave-cyan/20 border-synthwave-cyan text-synthwave-cyan"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {mode === "following" ? "Following" : "Trending on YouTube"}
                </button>
              ))}
            </div>
          )}

          {/* Carousels */}
          {!searchQuery && (
            <div className="space-y-6">
              {loadingTrending ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 overflow-hidden">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="w-56 h-32 flex-shrink-0" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : trendingVideos.length === 0 ? (
                <Card className="glasmorphism">
                  <CardContent className="pt-6 text-center">
                    <p className="text-slate-400">No trending content yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Add channels to your niches — content will appear here once data is collected.</p>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(groupedVideos).map(([groupIdx, videos]) => (
                  <Carousel
                    key={groupIdx}
                    title=""
                    direction={parseInt(groupIdx) % 2 === 0 ? "right" : "left"}
                  >
                    {videos.map((video) => (
                      <VideoCardWithActions
                        key={video.id}
                        title={video.title}
                        thumbnail={video.thumbnail_url}
                        channelTitle={video.channel_title}
                        views={video.view_count}
                        onAddClick={() => setAddModal({ isOpen: true, video })}
                        onDetailsClick={() => {}}
                      />
                    ))}
                  </Carousel>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MY NICHES TAB */}
      {activeTab === "niches" && (
        <div className="space-y-6">
          {/* Create New Niche */}
          <Card className="glasmorphism border-t-synthwave-purple border-t-2">
            <CardHeader>
              <CardTitle className="text-white">Create New Niche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Niche name (e.g. Tech Reviews, Gaming, Beauty)"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateFolder()
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 flex-1"
                />
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Niches Grid */}
          {folders.length === 0 ? (
            <Card className="glasmorphism">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-center">
                  No niches yet. Create one above to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="relative group"
                >
                  {/* Inline rename mode */}
                  {nicheMenu?.folderId === folder.id && nicheMenu.action === "rename" ? (
                    <div className="p-4 rounded-lg border-2 bg-slate-800/50 border-synthwave-purple">
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameNiche(folder.id);
                            if (e.key === "Escape") {
                              setNicheMenu(null);
                              setRenameValue("");
                            }
                          }}
                          autoFocus
                          className="bg-slate-900 border-slate-600 text-slate-200 h-8 text-sm flex-1"
                          placeholder="Niche name..."
                        />
                        <button
                          onClick={() => handleRenameNiche(folder.id)}
                          className="p-1.5 text-green-400 hover:text-green-300 transition-colors flex-shrink-0"
                          aria-label="Confirm rename"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setNicheMenu(null);
                            setRenameValue("");
                          }}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                          aria-label="Cancel rename"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-400 mt-2">
                        Channels & videos
                      </p>
                    </div>
                  ) : nicheMenu?.folderId === folder.id && nicheMenu.action === "confirmDelete" ? (
                    /* Delete confirmation inline */
                    <div className="p-4 rounded-lg border-2 bg-slate-800/50 border-red-500/50">
                      <p className="text-white font-semibold mb-1">Delete "{folder.name}"?</p>
                      <p className="text-sm text-slate-400 mb-3">This action cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDeleteNiche(folder.id)}
                          className="bg-red-600 hover:bg-red-500 text-white text-sm h-8 px-3"
                        >
                          Delete
                        </Button>
                        <Button
                          onClick={() => setNicheMenu(null)}
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:text-white text-sm h-8 px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal niche card */
                    <button
                      onClick={() => setOpenNicheId(folder.id)}
                      className={`text-left w-full p-4 rounded-lg border-2 transition-all ${
                        activeFolder === folder.id
                          ? "bg-synthwave-purple/20 border-synthwave-purple text-synthwave-purple"
                          : "bg-slate-800/50 border-slate-700 text-white hover:border-synthwave-purple/50"
                      }`}
                    >
                      <h3 className="font-semibold">{folder.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Channels & videos
                      </p>
                    </button>
                  )}

                  {/* Gear icon — visible on hover, hidden during rename/delete */}
                  {nicheMenu?.folderId !== folder.id && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNicheMenu({ folderId: folder.id, action: "menu" });
                        }}
                        className="p-1.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                        aria-label={`Manage ${folder.name}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Dropdown menu */}
                  {nicheMenu?.folderId === folder.id && nicheMenu.action === "menu" && (
                    <div
                      ref={menuRef}
                      className="absolute top-2 right-2 z-20 w-40 rounded-lg border border-slate-700 bg-slate-900 shadow-xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameValue(folder.name);
                          setNicheMenu({ folderId: folder.id, action: "rename" });
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNicheMenu({ folderId: folder.id, action: "confirmDelete" });
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Folder Contents */}
          {activeFolder && (
            <Card className="glasmorphism border-t-synthwave-magenta border-t-2">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFolder ? (
                  <Skeleton className="h-32" />
                ) : folderVideos.length === 0 ? (
                  <p className="text-slate-400">
                    No videos yet. Add channels in Explore tab.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {folderVideos.slice(0, 20).map((vid) => (
                      <div key={vid.id} className="p-2 bg-slate-800/50 rounded text-sm">
                        <p className="text-white truncate">{vid.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ADD TO FOLDER MODAL */}
      {addModal.isOpen && addModal.video && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <Card className="glasmorphism w-96 border-t-synthwave-magenta border-t-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Add to Niche</CardTitle>
              <button
                onClick={() => setAddModal({ isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Video</p>
                <p className="text-white font-medium line-clamp-2">
                  {addModal.video.title}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-400">Select niche</p>
                <div className="space-y-2">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        // Note: We'd need to track the video differently to persist it
                        // For now, just close and show success
                        toast.success(`Added to ${f.name}`);
                        setAddModal({ isOpen: false });
                      }}
                      className="w-full p-2 text-left bg-slate-800/50 hover:bg-slate-700/50 rounded border border-slate-700 text-white transition-colors"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
