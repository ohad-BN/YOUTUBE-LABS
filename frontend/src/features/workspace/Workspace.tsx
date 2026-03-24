import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  ResearchClient,
  type FolderChannel,
} from "../../services/ApiClient";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

export function Workspace() {
  // Channel Lists state
  const [channels, setChannels] = useState<FolderChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelsExpanded, setChannelsExpanded] = useState(true);

  // Load channels
  useEffect(() => {
    async function load() {
      setLoadingChannels(true);
      try {
        const data = await ResearchClient.getTrackedChannels();
        setChannels(data || []);
      } catch {
        toast.error("Failed to load tracked channels");
      } finally {
        setLoadingChannels(false);
      }
    }
    load();
  }, []);

  // Remove a tracked channel
  const handleRemoveChannel = async (channel: FolderChannel) => {
    try {
      await ResearchClient.deleteChannel(channel.id);
      setChannels((prev) => prev.filter((c) => c.id !== channel.id));
      toast.success(`Removed ${channel.title}`);
    } catch {
      toast.error("Could not remove channel");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-synthwave-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">Workspace</h2>
      </div>

      {/* Channel Lists */}
      <Card className="glasmorphism border-t-synthwave-cyan border-t-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-synthwave-cyan" />
              Channel Lists
              {!loadingChannels && (
                <span className="text-sm font-normal text-slate-400 ml-1">
                  ({channels.length})
                </span>
              )}
            </CardTitle>
            <button
              onClick={() => setChannelsExpanded((v) => !v)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle channel list"
            >
              {channelsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            All tracked channels across your workspace
          </p>
        </CardHeader>
        {channelsExpanded && (
          <CardContent>
            {loadingChannels ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : channels.length === 0 ? (
              <p className="text-slate-400 text-center py-6">
                No tracked channels yet. Use Research to discover and add channels.
              </p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors group"
                  >
                    {channel.thumbnail_url ? (
                      <img
                        src={channel.thumbnail_url}
                        alt={channel.title}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-400 text-xs font-bold">
                        {channel.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{channel.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {formatCount(channel.subscriber_count)} subs
                        </span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs text-slate-400">
                          {channel.video_count} videos
                        </span>
                        {channel.grade && (
                          <>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-semibold text-synthwave-cyan">
                              Grade {channel.grade}
                            </span>
                          </>
                        )}
                        {channel.last_upload_date && (
                          <>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-400">
                              Last: {new Date(channel.last_upload_date).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveChannel(channel)}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Remove channel"
                      aria-label={`Remove ${channel.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
