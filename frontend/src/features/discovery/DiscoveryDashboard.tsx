import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DiscoveryClient, ChannelSearchResult } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Compass, Search, Plus, Users, Video, Check, Folder } from "lucide-react";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

function QuickTrackInput({ folders, selectedFolderId, onTracked }: {
  folders: any[];
  selectedFolderId: number | null;
  onTracked: (name: string) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    try {
      const { youtube_channel_id } = await DiscoveryClient.resolveChannel(q);
      const result = await DiscoveryClient.trackChannel(youtube_channel_id);
      if (selectedFolderId && result.channel_id) {
        await DiscoveryClient.addChannelToFolder(selectedFolderId, result.channel_id).catch(() => {});
      }
      onTracked(q);
      setInput("");
    } catch {
      toast.error("Could not resolve channel", { description: "Try a YouTube URL, @handle, or channel name." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-1.5">
      <Input
        placeholder="@handle or youtube.com/..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handle()}
        className="bg-slate-900 border-slate-700 text-slate-200 h-8 text-xs flex-1"
      />
      <Button size="sm" onClick={handle} disabled={loading} className="h-8 px-2 bg-synthwave-magenta/20 border border-synthwave-magenta/50 text-synthwave-magenta hover:bg-synthwave-magenta/30 text-xs">
        {loading ? "..." : "Add"}
      </Button>
    </div>
  );
}

export function DiscoveryDashboard() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"name" | "topic">("name");
  const [results, setResults] = useState<ChannelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  // Map: youtube_channel_id -> internal channel_id (after tracking)
  const [trackedMap, setTrackedMap] = useState<Record<string, number>>({});
  // Map: youtube_channel_id -> Set of folder_ids it was added to this session
  const [addedToFolders, setAddedToFolders] = useState<Record<string, Set<number>>>({});

  useEffect(() => {
    DiscoveryClient.getFolders().then(setFolders).catch(() => {});
  }, []);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    try {
      const data = await DiscoveryClient.searchChannels(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (channel: ChannelSearchResult): Promise<number | null> => {
    if (trackedMap[channel.youtube_channel_id] !== undefined) {
      return trackedMap[channel.youtube_channel_id];
    }
    try {
      const res = await DiscoveryClient.trackChannel(channel.youtube_channel_id);
      const internalId = res.channel_id;
      setTrackedMap((prev) => ({ ...prev, [channel.youtube_channel_id]: internalId }));
      return internalId;
    } catch {
      return null;
    }
  };

  const handleAddToFolder = async (channel: ChannelSearchResult) => {
    if (!selectedFolderId) {
      toast.warning("Select a folder first", { description: "Click a folder on the left before adding channels." });
      return;
    }
    const internalId = await handleTrack(channel);
    if (internalId === null) {
      toast.error("Failed to track channel", { description: "Check that the YouTube API key is set in the backend .env file." });
      return;
    }
    try {
      await DiscoveryClient.addChannelToFolder(selectedFolderId, internalId);
      setAddedToFolders((prev) => {
        const existing = prev[channel.youtube_channel_id]
          ? new Set(prev[channel.youtube_channel_id])
          : new Set<number>();
        existing.add(selectedFolderId);
        return { ...prev, [channel.youtube_channel_id]: existing };
      });
      toast.success(`Added to ${folders.find(f => f.id === selectedFolderId)?.name}`);
      toast.success("Channel tracked", { description: channel.title });
    } catch {
      // Already in folder or other error — treat as success
      setAddedToFolders((prev) => {
        const existing = prev[channel.youtube_channel_id]
          ? new Set(prev[channel.youtube_channel_id])
          : new Set<number>();
        existing.add(selectedFolderId);
        return { ...prev, [channel.youtube_channel_id]: existing };
      });
      toast.success(`Added to ${folders.find(f => f.id === selectedFolderId)?.name}`);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const folder = await DiscoveryClient.createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setSelectedFolderId(folder.id);
      setNewFolderName("");
      toast.success(`Folder "${name}" created`);
    } catch {
      // ignore
    } finally {
      setCreatingFolder(false);
    }
  };

  const isTracked = (ytId: string) => trackedMap[ytId] !== undefined;
  const isInSelectedFolder = (ytId: string) =>
    selectedFolderId !== null &&
    (addedToFolders[ytId]?.has(selectedFolderId) ?? false);

  const placeholder =
    searchType === "name"
      ? "Search for a channel (e.g. MrBeast, Linus Tech Tips...)"
      : "Search by topic (e.g. fishing, tech, cooking...)";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-8 h-8 text-synthwave-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">Discover Channels</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

        {/* Left Sidebar: Folder Picker */}
        <div className="space-y-4">
          <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Add to Folder</CardTitle>
              <p className="text-xs text-slate-400">Select a folder before tracking channels</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create new folder inline */}
              <div className="flex gap-2">
                <Input
                  placeholder="New folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder}
                  className="bg-synthwave-cyan hover:bg-cyan-400 h-9 w-9 text-black"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Folder list */}
              <div className="space-y-1">
                {folders.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">No folders yet</p>
                ) : (
                  folders.map((folder) => (
                    <Button
                      key={folder.id}
                      variant="ghost"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`w-full justify-start gap-2 text-sm ${
                        selectedFolderId === folder.id
                          ? "bg-synthwave-cyan/20 text-synthwave-cyan border border-synthwave-cyan/50"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      {folder.name}
                    </Button>
                  ))
                )}
              </div>

              {selectedFolderId && (
                <p className="text-xs text-synthwave-cyan text-center">
                  ✓ Channels will be added to: <strong>{folders.find((f) => f.id === selectedFolderId)?.name}</strong>
                </p>
              )}

              {/* Quick track by URL or handle */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-xs text-slate-500">Track by URL or @handle</p>
                <QuickTrackInput folders={folders} selectedFolderId={selectedFolderId} onTracked={(name) => toast.success(`Tracking ${name}`)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Search + Results */}
        <div className="space-y-6">
          {/* Search Card */}
          <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
            <CardContent className="pt-6 space-y-4">
              {/* Search type toggle */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={searchType === "name" ? "secondary" : "ghost"}
                  onClick={() => setSearchType("name")}
                  className={searchType === "name" ? "bg-synthwave-cyan/20 text-synthwave-cyan border border-synthwave-cyan/50" : "text-slate-400"}
                >
                  By Channel Name
                </Button>
                <Button
                  size="sm"
                  variant={searchType === "topic" ? "secondary" : "ghost"}
                  onClick={() => setSearchType("topic")}
                  className={searchType === "topic" ? "bg-synthwave-cyan/20 text-synthwave-cyan border border-synthwave-cyan/50" : "text-slate-400"}
                >
                  By Topic
                </Button>
              </div>

              {/* Search input */}
              <div className="flex gap-3">
                <Input
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-slate-900 border-slate-700 text-slate-200 flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-synthwave-cyan hover:bg-cyan-400 text-black px-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {loading && (
            <div className="text-center py-16 text-synthwave-cyan animate-pulse">
              Scanning YouTube for channels...
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-center py-16 text-slate-500">
              No channels found for "{query}". Try a different search term.
            </div>
          )}

          {!loading && results.length === 0 && !query && (
            <div className="text-center py-16 text-slate-600">
              Search by channel name or topic to discover channels.
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {results.map((channel) => (
                <div
                  key={channel.youtube_channel_id}
                  className="flex gap-4 p-4 rounded-lg glassmorphism border border-slate-800 hover:border-synthwave-cyan transition-colors group"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {channel.thumbnail_url ? (
                      <img
                        src={channel.thumbnail_url}
                        alt={channel.title}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 group-hover:border-synthwave-cyan transition-colors"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                        <Users className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="font-semibold text-slate-100 truncate group-hover:text-synthwave-cyan transition-colors">
                        {channel.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {formatCount(channel.subscriber_count)} subs
                        </span>
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {formatCount(channel.video_count)} videos
                        </span>
                      </div>
                    </div>

                    {channel.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {channel.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTrack(channel)}
                        disabled={isTracked(channel.youtube_channel_id)}
                        className={`text-xs h-7 px-3 ${
                          isTracked(channel.youtube_channel_id)
                            ? "border-green-700 text-green-500 cursor-default"
                            : "border-slate-600 text-slate-300 hover:border-synthwave-cyan hover:text-synthwave-cyan"
                        }`}
                      >
                        {isTracked(channel.youtube_channel_id) ? (
                          <>
                            <Check className="w-3 h-3 mr-1" /> Tracked
                          </>
                        ) : (
                          "Track"
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleAddToFolder(channel)}
                        disabled={isInSelectedFolder(channel.youtube_channel_id)}
                        className={`text-xs h-7 px-3 ${
                          isInSelectedFolder(channel.youtube_channel_id)
                            ? "bg-green-800 text-green-300 cursor-default"
                            : "bg-synthwave-magenta hover:bg-fuchsia-600 text-white"
                        }`}
                      >
                        {isInSelectedFolder(channel.youtube_channel_id) ? (
                          <>
                            <Check className="w-3 h-3 mr-1" /> Added
                          </>
                        ) : selectedFolderId ? (
                          <>
                            <Folder className="w-3 h-3 mr-1" />
                            Add to {folders.find((f) => f.id === selectedFolderId)?.name}
                          </>
                        ) : (
                          "+ Add to Folder"
                        )}
                      </Button>

                      {isTracked(channel.youtube_channel_id) && (
                        <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-400 self-center">
                          ID: {trackedMap[channel.youtube_channel_id]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
