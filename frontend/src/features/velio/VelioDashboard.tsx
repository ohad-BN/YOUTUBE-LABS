import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VelioClient, DiscoveryClient, FolderChannel } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Folder, Play, Plus, Trash2, Users } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function VelioDashboard() {
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [folderVideos, setFolderVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderTags, setNewFolderTags] = useState("");
  const [activeView, setActiveView] = useState<'channels' | 'videos'>('channels');
  const [folderChannels, setFolderChannels] = useState<FolderChannel[]>([]);
  const [channelSort, setChannelSort] = useState<"subs" | "avg_views">("subs");

  useEffect(() => {
    async function loadFolders() {
      const data = await VelioClient.getFolders().catch(() => []);
      setFolders(data || []);
      if (data && data.length > 0) setActiveFolder(data[0].id);
    }
    loadFolders();
  }, []);

  useEffect(() => {
    if (activeFolder) {
      async function loadVideos() {
        setLoading(true);
        const data = await VelioClient.getFolderVideos(activeFolder as number).catch(() => []);
        setFolderVideos(data || []);
        setLoading(false);
      }
      loadVideos();
    }
  }, [activeFolder]);

  useEffect(() => {
    if (activeFolder) {
      DiscoveryClient.getFolderChannels(activeFolder).then(setFolderChannels).catch(() => setFolderChannels([]));
    }
  }, [activeFolder, activeView]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folderName = newFolderName.trim();
    const tags = newFolderTags.split(",").map((t) => t.trim()).filter(Boolean);
    const newFolder = await VelioClient.createFolder(folderName, tags).catch(() => null);
    if (newFolder) {
      setFolders((prev) => [...prev, newFolder]);
      setNewFolderName("");
      setNewFolderTags("");
      setActiveFolder(newFolder.id);
      toast.success(`Folder "${folderName}" created`);
    }
  };

  const sortedChannels = [...folderChannels].sort((a, b) => {
    if (channelSort === "avg_views") return (b.avg_views_per_video ?? 0) - (a.avg_views_per_video ?? 0);
    return b.subscriber_count - a.subscriber_count;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Folder className="w-8 h-8 text-synthwave-magenta drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">Velio Channel Folders</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">

        {/* Left Sidebar: Folders List */}
        <div className="space-y-4">
          <Card className="glassmorphism border-t-synthwave-purple border-t-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Your Niches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="New Folder..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-200 h-9"
                  />
                  <Button size="icon" onClick={handleCreateFolder} className="bg-synthwave-magenta hover:bg-fuchsia-600 h-9 w-9 synth-glow-magenta text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Tags (comma-separated, e.g. tech, rivals)"
                  value={newFolderTags}
                  onChange={(e) => setNewFolderTags(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 h-8 text-xs"
                />
              </div>

              <div className="space-y-2 mt-4">
                {folders.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No folders yet</p>
                ) : (
                  folders.map((folder) => (
                    <div key={folder.id} className="relative group flex items-center">
                      <Button
                        variant={activeFolder === folder.id ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-3 flex-col items-start h-auto py-2 ${activeFolder === folder.id ? "bg-synthwave-magenta/20 text-synthwave-magenta border border-synthwave-magenta/50" : "text-slate-400 hover:text-slate-200"}`}
                        onClick={() => setActiveFolder(folder.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Folder className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        {folder.tags && folder.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {folder.tags.map((tag: string) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0 rounded bg-slate-700 text-slate-400">{tag}</span>
                            ))}
                          </div>
                        )}
                      </Button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await DiscoveryClient.deleteFolder(folder.id);
                          setFolders((prev) => prev.filter((f) => f.id !== folder.id));
                          if (activeFolder === folder.id) setActiveFolder(null);
                          toast.success("Folder deleted");
                        }}
                        className="absolute right-1 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-900/40 text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Area: Aggregated Video Feed */}
        <Card className="glassmorphism border-t-synthwave-magenta border-t-2 min-h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-synthwave-magenta animate-pulse synth-glow-magenta" />
                Aggregated Feed
              </CardTitle>
              <p className="text-sm text-slate-400">Latest videos from all channels in this folder</p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView('channels')}
                  className={activeView === 'channels' ? 'bg-synthwave-magenta/20 text-synthwave-magenta border border-synthwave-magenta/50' : 'text-slate-400'}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Channels
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView('videos')}
                  className={activeView === 'videos' ? 'bg-synthwave-magenta/20 text-synthwave-magenta border border-synthwave-magenta/50' : 'text-slate-400'}
                >
                  Videos
                </Button>
              </div>
            </div>
            {activeFolder && (
              <p className="text-xs text-slate-500">Use <strong className="text-synthwave-cyan">Discover Channels</strong> to add channels here</p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                    <Skeleton className="h-5 w-8" />
                  </div>
                ))}
              </div>
            ) : !activeFolder ? (
              <div className="py-20 text-center text-slate-500">Select or create a folder to view the feed.</div>
            ) : (
              <>
                {activeView === 'channels' && activeFolder && (
                  folderChannels.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-sm">
                      No channels in this folder yet. Use <span className="text-synthwave-cyan">Discover Channels</span> to add some.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-1 mb-3">
                        <span className="text-xs text-slate-500 self-center mr-1">Sort:</span>
                        {(["subs", "avg_views"] as const).map((s) => (
                          <button key={s} onClick={() => setChannelSort(s)}
                            className={`text-xs px-2 py-0.5 rounded border ${channelSort === s ? "border-synthwave-magenta text-synthwave-magenta" : "border-slate-700 text-slate-500"}`}>
                            {s === "subs" ? "Subscribers" : "Avg Views"}
                          </button>
                        ))}
                      </div>
                      {sortedChannels.map((ch) => (
                        <div key={ch.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-synthwave-magenta transition-colors group">
                          {ch.thumbnail_url ? (
                            <img src={ch.thumbnail_url} alt={ch.title} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                              <Users className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{ch.title}</p>
                            <p className="text-xs text-slate-500">{formatCount(ch.subscriber_count)} subscribers</p>
                            {ch.last_upload_date && (
                              <p className="text-xs text-slate-600">
                                Last upload: {new Date(ch.last_upload_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            )}
                          </div>
                          {ch.avg_views_per_video != null && (
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              ~{formatCount(ch.avg_views_per_video)} avg/video
                            </span>
                          )}
                          {ch.grade && (
                            <span className="text-xs font-bold text-synthwave-cyan bg-synthwave-cyan/10 border border-synthwave-cyan/30 px-2 py-0.5 rounded">
                              {ch.grade}
                            </span>
                          )}
                          <button
                            title="Remove from this folder"
                            onClick={async () => {
                              await DiscoveryClient.removeChannelFromFolder(activeFolder as number, ch.id);
                              setFolderChannels((prev) => prev.filter((c) => c.id !== ch.id));
                              toast.success("Removed from folder");
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-900/40 text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete channel entirely (removes from all folders)"
                            onClick={async () => {
                              await DiscoveryClient.deleteChannel(ch.id);
                              setFolderChannels((prev) => prev.filter((c) => c.id !== ch.id));
                              toast.error("Channel deleted", { description: "All associated data has been removed." });
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-orange-900/40 text-orange-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeView === 'videos' && activeFolder && (
                  folderVideos.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                      No videos found. Map channels to this folder to start tracking.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {folderVideos.map((video, idx) => (
                        <div key={idx} className="flex gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-synthwave-magenta transition-colors group cursor-pointer">
                          <div className="w-32 h-20 bg-slate-800 rounded overflow-hidden relative flex-shrink-0">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-slate-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug group-hover:text-synthwave-magenta transition-colors">{video.title}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span className="text-synthwave-cyan">{video.view_count.toLocaleString()} views</span>
                              <span>{new Date(video.published_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
