// Base API Client for fetching data from the FastAPI Backend

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

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

// --- ViewStats Response Types ---
export interface VideoOutlier {
  video_id: number;
  title: string;
  channel_title: string;
  view_count: number;
  published_at: string;
  multiplier: number;
  thumbnail_url?: string;
  video?: { id: number; title: string; published_at: string; view_count: number; thumbnail_url?: string };
  outlier_score?: number;
}

export interface VelocityData {
  video_id: number;
  title: string;
  view_count: number;
  vph: number;
}

export interface ThumbnailHistory {
  thumbnail_url: string;
  title?: string;
  detected_at?: string;
}

export interface VideoDetail {
  id: number;
  title: string;
  description: string;
  view_count: number;
  published_at: string;
  thumbnail_url?: string;
  thumbnail_history?: ThumbnailHistory[];
}

// --- Velio Response Types ---
export interface Folder {
  id: number;
  name: string;
  tags: string[];
  created_at: string;
}

export interface TrackingResponse {
  status: string;
  channel_id: number;
}

export interface FolderVideo {
  id: number;
  title: string;
  youtube_id: string;
  view_count: number;
  thumbnail_url?: string;
  published_at?: string;
}

// --- SocialBlade Response Types ---
export interface ChannelStats {
  date: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
}

export interface ProjectionData {
  current: number;
  predicted_30day: number;
  predicted_90day: number;
  current_subs?: number;
  current_views?: number;
  daily_avg_subs?: number;
  daily_avg_views?: number;
  upload_frequency_per_week?: number;
  projections?: Array<{ days_forward: number; projected_date: string; projected_subs: number; projected_views: number }>;
  estimated_monthly_revenue_low?: number;
  estimated_monthly_revenue_high?: number;
}

export interface ChannelComparison {
  channel_id: number;
  title: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  grade?: string;
  daily_avg_subs?: number;
}

// --- VidIQ Response Types ---
export interface IdeaData {
  id: number;
  title: string;
  category: string;
  notes?: string;
  status: string;
  created_at: string;
  video_reference_id?: number;
}

export interface KeywordScore {
  keyword: string;
  score: number;
}

export interface VideoKeywords {
  video_id: string;
  title: string;
  keywords: string[];
}

export interface RelatedKeywords {
  keyword: string;
  suggestions: string[];
}

export interface SavedKeyword {
  id: number;
  keyword: string;
  created_at: string;
  source_video_id?: string;
}

// --- Discovery Response Types ---
export interface DiscoveryAlert {
  id: number;
  title: string;
  channel_id: number;
  type: string;
  read: boolean;
  created_at: string;
}

export interface UnreadCount {
  unread: number;
}

export interface ChannelPreview {
  youtube_channel_id: string;
  title: string;
  description: string;
  subscriber_count: number;
  view_count: number;
  thumbnail_url?: string;
  latest_video?: { published_at: string; thumbnail_url?: string; title?: string };
  upload_per_week?: number;
}

// --- ViewStats Suite ---
export const ViewStatsClient = {
  getOutliers: (channelId: number) => fetchApi<VideoOutlier[]>(`/viewstats/outliers/${channelId}`),
  getTopVelocity: (limit: number = 10) => fetchApi<VelocityData[]>(`/viewstats/velocity/top?limit=${limit}`),
  getGlobalOutliers: (limit: number = 10) => fetchApi<VideoOutlier[]>(`/viewstats/outliers/global?limit=${limit}`),
  getVideoDetail: (videoId: number) => fetchApi<VideoDetail>(`/viewstats/videos/${videoId}`),
};

// --- Velio Suite ---
export const VelioClient = {
  getFolders: () => fetchApi<Folder[]>("/velio/folders"),
  createFolder: (name: string, tags: string[] = []) =>
    fetchApi<Folder>("/velio/folders", {
      method: "POST",
      body: JSON.stringify({ name, tags }),
    }),
  getFolderVideos: (folderId: number) => fetchApi<FolderVideo[]>(`/velio/folders/${folderId}/videos`),
  trackChannel: (youtubeId: string) => fetchApi<TrackingResponse>(`/velio/track/${youtubeId}`, { method: "POST" }),
  addChannelToFolder: (folderId: number, channelId: number) =>
    fetchApi<TrackingResponse>(`/velio/folders/${folderId}/channels/${channelId}`, { method: "POST" })
};

// --- SocialBlade Suite ---
export const SocialBladeClient = {
  getStats: (channelId: number, limit: number = 30) => fetchApi<ChannelStats[]>(`/socialblade/channels/${channelId}/stats?limit=${limit}`),
  getProjections: (channelId: number) => fetchApi<ProjectionData>(`/socialblade/channels/${channelId}/projections`),
  exportCsv: (channelId: number) => `${BASE_URL}/socialblade/channels/${channelId}/export`,
  compareChannels: (channelIds: number[]) =>
    fetchApi<ChannelComparison[]>(`/socialblade/compare?channel_ids=${channelIds.join(",")}`),
};

// --- VidIQ Suite ---
export const VidIQClient = {
  getSavedIdeas: () => fetchApi<IdeaData[]>("/vidiq/ideas"),
  saveIdea: (title: string, category: string, notes?: string, videoId?: number) =>
    fetchApi<IdeaData>("/vidiq/ideas", {
      method: "POST",
      body: JSON.stringify({ title, category, notes, video_reference_id: videoId })
    }),
  scoreKeyword: (keyword: string) =>
    fetchApi<KeywordScore>("/vidiq/keyword-score", {
      method: "POST",
      body: JSON.stringify({ keyword })
    }),
  updateIdeaStatus: (ideaId: number, status: string) =>
    fetchApi<IdeaData>(`/vidiq/ideas/${ideaId}/status?status=${encodeURIComponent(status)}`, { method: "PATCH" }),
  extractVideoKeywords: (videoId: string) =>
    fetchApi<VideoKeywords>(`/vidiq/video-keywords?video_id=${encodeURIComponent(videoId)}`),
  getRelatedKeywords: (keyword: string) =>
    fetchApi<RelatedKeywords>(`/vidiq/related-keywords?keyword=${encodeURIComponent(keyword)}`),
};

// --- Saved Keywords ---
export const SavedKeywordsClient = {
  save: (keyword: string, sourceVideoId?: string) =>
    fetchApi<SavedKeyword>(`/vidiq/keywords?keyword=${encodeURIComponent(keyword)}${sourceVideoId ? `&source_video_id=${encodeURIComponent(sourceVideoId)}` : ""}`, { method: "POST" }),
  list: () => fetchApi<SavedKeyword[]>("/vidiq/keywords"),
  delete: (id: number) => fetchApi<{ status: string }>(`/vidiq/keywords/${id}`, { method: "DELETE" }),
};

// --- Discovery Suite ---
export const DiscoveryClient = {
  searchChannels: (q: string) =>
    fetchApi<ChannelSearchResult[]>(`/velio/search?q=${encodeURIComponent(q)}`),
  trackChannel: (youtubeChannelId: string) =>
    fetchApi<TrackingResponse>(`/velio/track/${youtubeChannelId}`, { method: "POST" }),
  getFolders: () => fetchApi<Folder[]>("/velio/folders"),
  createFolder: (name: string, tags: string[] = []) =>
    fetchApi<Folder>("/velio/folders", { method: "POST", body: JSON.stringify({ name, tags }) }),
  getFolderChannels: (folderId: number) =>
    fetchApi<FolderChannel[]>(`/velio/folders/${folderId}/channels`),
  addChannelToFolder: (folderId: number, channelId: number) =>
    fetchApi<TrackingResponse>(`/velio/folders/${folderId}/channels/${channelId}`, { method: "POST" }),
  deleteFolder: (folderId: number) =>
    fetchApi<{ status: string }>(`/velio/folders/${folderId}`, { method: "DELETE" }),
  removeChannelFromFolder: (folderId: number, channelId: number) =>
    fetchApi<{ status: string }>(`/velio/folders/${folderId}/channels/${channelId}`, { method: "DELETE" }),
  getTrackedChannels: () => fetchApi<FolderChannel[]>("/velio/channels"),
  getStats: () => fetchApi<{ total_channels: number; total_videos: number; total_folders: number }>("/velio/stats"),
  deleteChannel: (channelId: number) => fetchApi<{ status: string }>(`/velio/channels/${channelId}`, { method: "DELETE" }),
  getAlerts: () => fetchApi<DiscoveryAlert[]>("/velio/alerts"),
  getUnreadCount: () => fetchApi<UnreadCount>("/velio/alerts/unread-count"),
  markAllRead: () => fetchApi<{ status: string }>("/velio/alerts/mark-all-read", { method: "POST" }),
  markAlertRead: (alertId: number) => fetchApi<DiscoveryAlert>(`/velio/alerts/${alertId}/read`, { method: "PATCH" }),
  resolveChannel: (q: string) => fetchApi<{ youtube_channel_id: string }>(`/velio/resolve?q=${encodeURIComponent(q)}`),
  previewChannel: (youtubeChannelId: string) =>
    fetchApi<ChannelPreview>(`/velio/preview/${youtubeChannelId}`),
};
