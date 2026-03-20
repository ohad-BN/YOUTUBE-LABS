import { useEffect, useState } from "react";
import { VelioClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Folder, Play, Plus } from "lucide-react";

export function VelioDashboard() {
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [folderVideos, setFolderVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolder = await VelioClient.createFolder(newFolderName).catch(() => null);
    if (newFolder) {
      setFolders((prev) => [...prev, newFolder]);
      setNewFolderName("");
      setActiveFolder(newFolder.id);
    }
  };

  const handleTrackChannel = async () => {
    if (!activeFolder) return;
    const youtubeId = prompt("Enter a YouTube Channel ID to track (e.g., UCX6OQ3DkcsbYNE6H8uQQuVA):");
    if (!youtubeId) return;
    
    setLoading(true);
    const result = await VelioClient.trackChannel(youtubeId).catch(() => {
      alert("Failed to track channel. Check backend logs or API key.");
      return null;
    });
    
    if (result && result.channel_id) {
      await VelioClient.addChannelToFolder(activeFolder as number, result.channel_id);
      // Refresh videos
      const data = await VelioClient.getFolderVideos(activeFolder as number).catch(() => []);
      setFolderVideos(data || []);
    }
    setLoading(false);
  };

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

              <div className="space-y-2 mt-4">
                {folders.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No folders yet</p>
                ) : (
                  folders.map((folder) => (
                    <Button
                      key={folder.id}
                      variant={activeFolder === folder.id ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-3 ${activeFolder === folder.id ? "bg-synthwave-magenta/20 text-synthwave-magenta border border-synthwave-magenta/50" : "text-slate-400 hover:text-slate-200"}`}
                      onClick={() => setActiveFolder(folder.id)}
                    >
                      <Folder className="w-4 h-4" />
                      {folder.name}
                    </Button>
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
            </div>
            {activeFolder && (
              <Button onClick={handleTrackChannel} variant="outline" className="border-synthwave-purple text-synthwave-purple hover:bg-synthwave-purple/10">
                + Track Channel
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 text-center text-synthwave-magenta animate-pulse">Synchronizing folder streams...</div>
            ) : !activeFolder ? (
              <div className="py-20 text-center text-slate-500">Select or create a folder to view the feed.</div>
            ) : folderVideos.length === 0 ? (
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
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
