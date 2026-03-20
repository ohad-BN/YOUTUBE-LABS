// Base API Client for fetching data from the FastAPI Backend

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    "Content-Type": "application/json",
    // Authorization headers will go here
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `API Request Failed: ${response.statusText}`);
  }

  return response.json();
}

export interface ChannelSearchResult {
  youtube_channel_id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  subscriber_count: number;
  video_count: number;
  view_count: number;
}

export interface FolderChannel {
  id: number;
  youtube_channel_id: string;
  title: string;
  thumbnail_url: string | null;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  grade: string | null;
  last_upload_date: string | null;
  avg_views_per_video: number | null;
}

// --- ViewStats Suite ---
export const ViewStatsClient = {
  getOutliers: (channelId: number) => fetchApi<any[]>(`/viewstats/outliers/${channelId}`),
  getTopVelocity: (limit: number = 10) => fetchApi<any[]>(`/viewstats/velocity/top?limit=${limit}`),
  getGlobalOutliers: (limit: number = 10) => fetchApi<any[]>(`/viewstats/outliers/global?limit=${limit}`),
  getVideoDetail: (videoId: number) => fetchApi<any>(`/viewstats/videos/${videoId}`),
};

// --- Velio Suite ---
export const VelioClient = {
  getFolders: () => fetchApi<any[]>("/velio/folders"),
  createFolder: (name: string, tags: string[] = []) => 
    fetchApi<any>("/velio/folders", {
      method: "POST",
      body: JSON.stringify({ name, tags }),
    }),
  getFolderVideos: (folderId: number) => fetchApi<any[]>(`/velio/folders/${folderId}/videos`),
  trackChannel: (youtubeId: string) => fetchApi<any>(`/velio/track/${youtubeId}`, { method: "POST" }),
  addChannelToFolder: (folderId: number, channelId: number) =>
    fetchApi<any>(`/velio/folders/${folderId}/channels/${channelId}`, { method: "POST" })
};

// --- SocialBlade Suite ---
export const SocialBladeClient = {
  getStats: (channelId: number, limit: number = 30) => fetchApi<any[]>(`/socialblade/channels/${channelId}/stats?limit=${limit}`),
  getProjections: (channelId: number) => fetchApi<any>(`/socialblade/channels/${channelId}/projections`),
  exportCsv: (channelId: number) => `${BASE_URL}/socialblade/channels/${channelId}/export`,
  compareChannels: (channelIds: number[]) =>
    fetchApi<any[]>(`/socialblade/compare?channel_ids=${channelIds.join(",")}`),
};

// --- VidIQ Suite ---
export const VidIQClient = {
  getSavedIdeas: () => fetchApi<any[]>("/vidiq/ideas"),
  saveIdea: (title: string, category: string, notes?: string, videoId?: number) =>
    fetchApi<any>("/vidiq/ideas", {
      method: "POST",
      body: JSON.stringify({ title, category, notes, video_reference_id: videoId })
    }),
  scoreKeyword: (keyword: string) =>
    fetchApi<any>("/vidiq/keyword-score", {
      method: "POST",
      body: JSON.stringify({ keyword })
    }),
  updateIdeaStatus: (ideaId: number, status: string) =>
    fetchApi<any>(`/vidiq/ideas/${ideaId}/status?status=${encodeURIComponent(status)}`, { method: "PATCH" }),
  extractVideoKeywords: (videoId: string) =>
    fetchApi<{ video_id: string; title: string; keywords: string[] }>(`/vidiq/video-keywords?video_id=${encodeURIComponent(videoId)}`),
  getRelatedKeywords: (keyword: string) =>
    fetchApi<{ keyword: string; suggestions: string[] }>(`/vidiq/related-keywords?keyword=${encodeURIComponent(keyword)}`),
};

// --- Saved Keywords ---
export const SavedKeywordsClient = {
  save: (keyword: string, sourceVideoId?: string) =>
    fetchApi<any>(`/vidiq/keywords?keyword=${encodeURIComponent(keyword)}${sourceVideoId ? `&source_video_id=${encodeURIComponent(sourceVideoId)}` : ""}`, { method: "POST" }),
  list: () => fetchApi<any[]>("/vidiq/keywords"),
  delete: (id: number) => fetchApi<any>(`/vidiq/keywords/${id}`, { method: "DELETE" }),
};

// --- Discovery Suite ---
export const DiscoveryClient = {
  searchChannels: (q: string) =>
    fetchApi<ChannelSearchResult[]>(`/velio/search?q=${encodeURIComponent(q)}`),
  trackChannel: (youtubeChannelId: string) =>
    fetchApi<{ status: string; channel_id: number }>(`/velio/track/${youtubeChannelId}`, { method: "POST" }),
  getFolders: () => fetchApi<any[]>("/velio/folders"),
  createFolder: (name: string, tags: string[] = []) =>
    fetchApi<any>("/velio/folders", { method: "POST", body: JSON.stringify({ name, tags }) }),
  getFolderChannels: (folderId: number) =>
    fetchApi<FolderChannel[]>(`/velio/folders/${folderId}/channels`),
  addChannelToFolder: (folderId: number, channelId: number) =>
    fetchApi<any>(`/velio/folders/${folderId}/channels/${channelId}`, { method: "POST" }),
  deleteFolder: (folderId: number) =>
    fetchApi<any>(`/velio/folders/${folderId}`, { method: "DELETE" }),
  removeChannelFromFolder: (folderId: number, channelId: number) =>
    fetchApi<any>(`/velio/folders/${folderId}/channels/${channelId}`, { method: "DELETE" }),
  getTrackedChannels: () => fetchApi<FolderChannel[]>("/velio/channels"),
  getStats: () => fetchApi<{ total_channels: number; total_videos: number; total_folders: number }>("/velio/stats"),
  deleteChannel: (channelId: number) => fetchApi<any>(`/velio/channels/${channelId}`, { method: "DELETE" }),
  getAlerts: () => fetchApi<any[]>("/velio/alerts"),
  getUnreadCount: () => fetchApi<{ unread: number }>("/velio/alerts/unread-count"),
  markAllRead: () => fetchApi<any>("/velio/alerts/mark-all-read", { method: "POST" }),
  markAlertRead: (alertId: number) => fetchApi<any>(`/velio/alerts/${alertId}/read`, { method: "PATCH" }),
  resolveChannel: (q: string) => fetchApi<{ youtube_channel_id: string }>(`/velio/resolve?q=${encodeURIComponent(q)}`),
  previewChannel: (youtubeChannelId: string) =>
    fetchApi<any>(`/velio/preview/${youtubeChannelId}`),
};
