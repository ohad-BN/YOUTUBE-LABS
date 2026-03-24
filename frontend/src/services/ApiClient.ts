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

// --- Trends Response Types ---
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

// --- Research Response Types ---
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
  youtube_video_id: string;
  channel_id: number;
  view_count: number;
  thumbnail_url?: string;
  published_at?: string;
  like_count?: number;
  comment_count?: number;
  outlier_score?: number;
  vph?: number;
}

export interface PaginatedVideos {
  items: FolderVideo[];
  total: number;
  page: number;
  per_page: number;
}

export interface TrendingYouTubeVideo {
  youtube_video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url?: string;
  published_at?: string;
  view_count: number;
  like_count: number;
}

// --- Analytics Response Types ---
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

// --- Ideas Response Types ---
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

// --- Alert Types ---
export interface Alert {
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

// --- Trends Suite ---
export const TrendsClient = {
  getOutliers: (channelId: number) => fetchApi<VideoOutlier[]>(`/trends/outliers/${channelId}`),
  getTopVelocity: (limit: number = 10) => fetchApi<VelocityData[]>(`/trends/velocity/top?limit=${limit}`),
  getGlobalOutliers: (limit: number = 10) => fetchApi<VideoOutlier[]>(`/trends/outliers/global?limit=${limit}`),
  getVideoDetail: (videoId: number) => fetchApi<VideoDetail>(`/trends/videos/${videoId}`),
};

// --- Niches Suite (folder/channel management) ---
export const NichesClient = {
  getFolders: () => fetchApi<Folder[]>("/research/folders"),
  createFolder: (name: string, tags: string[] = []) =>
    fetchApi<Folder>("/research/folders", {
      method: "POST",
      body: JSON.stringify({ name, tags }),
    }),
  renameFolder: (folderId: number, name: string, tags: string[] = []) =>
    fetchApi<Folder>(`/research/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, tags }),
    }),
  getFolderVideos: (
    folderId: number,
    params: { page?: number; per_page?: number; sort_by?: string; sort_dir?: string; search?: string; date_days?: number } = {},
  ) => {
    const p = new URLSearchParams();
    if (params.page) p.set("page", String(params.page));
    if (params.per_page) p.set("per_page", String(params.per_page));
    if (params.sort_by) p.set("sort_by", params.sort_by);
    if (params.sort_dir) p.set("sort_dir", params.sort_dir);
    if (params.search) p.set("search", params.search);
    if (params.date_days) p.set("date_days", String(params.date_days));
    const qs = p.toString();
    return fetchApi<PaginatedVideos>(`/research/folders/${folderId}/videos${qs ? `?${qs}` : ""}`);
  },
  trackChannel: (youtubeId: string) => fetchApi<TrackingResponse>(`/research/track/${youtubeId}`, { method: "POST" }),
  addChannelToFolder: (folderId: number, channelId: number) =>
    fetchApi<TrackingResponse>(`/research/folders/${folderId}/channels/${channelId}`, { method: "POST" }),
  ingestMore: (channelId: number, pages: number = 3) =>
    fetchApi<{ status: string; total_videos: number }>(`/research/channels/${channelId}/ingest-more?pages=${pages}`, { method: "POST" }),
};

// --- Analytics Suite ---
export const AnalyticsClient = {
  getStats: (channelId: number, limit: number = 30) => fetchApi<ChannelStats[]>(`/analytics/channels/${channelId}/stats?limit=${limit}`),
  getProjections: (channelId: number) => fetchApi<ProjectionData>(`/analytics/channels/${channelId}/projections`),
  exportCsv: (channelId: number) => `${BASE_URL}/analytics/channels/${channelId}/export`,
  compareChannels: (channelIds: number[]) =>
    fetchApi<ChannelComparison[]>(`/analytics/compare?channel_ids=${channelIds.join(",")}`),
};

// --- Ideas Suite ---
export const IdeasClient = {
  getSavedIdeas: () => fetchApi<IdeaData[]>("/ideas/ideas"),
  saveIdea: (title: string, category: string, notes?: string, videoId?: number) =>
    fetchApi<IdeaData>("/ideas/ideas", {
      method: "POST",
      body: JSON.stringify({ title, category, notes, video_reference_id: videoId })
    }),
  scoreKeyword: (keyword: string) =>
    fetchApi<KeywordScore>("/ideas/keyword-score", {
      method: "POST",
      body: JSON.stringify({ keyword })
    }),
  updateIdeaStatus: (ideaId: number, status: string) =>
    fetchApi<IdeaData>(`/ideas/ideas/${ideaId}/status?status=${encodeURIComponent(status)}`, { method: "PATCH" }),
  extractVideoKeywords: (videoId: string) =>
    fetchApi<VideoKeywords>(`/ideas/video-keywords?video_id=${encodeURIComponent(videoId)}`),
  getRelatedKeywords: (keyword: string) =>
    fetchApi<RelatedKeywords>(`/ideas/related-keywords?keyword=${encodeURIComponent(keyword)}`),
};

// --- Keywords Suite ---
export const KeywordsClient = {
  save: (keyword: string, sourceVideoId?: string) =>
    fetchApi<SavedKeyword>(`/ideas/keywords?keyword=${encodeURIComponent(keyword)}${sourceVideoId ? `&source_video_id=${encodeURIComponent(sourceVideoId)}` : ""}`, { method: "POST" }),
  list: () => fetchApi<SavedKeyword[]>("/ideas/keywords"),
  delete: (id: number) => fetchApi<{ status: string }>(`/ideas/keywords/${id}`, { method: "DELETE" }),
};

// --- Research Suite (channel discovery, search, alerts) ---
export const ResearchClient = {
  searchChannels: (q: string) =>
    fetchApi<ChannelSearchResult[]>(`/research/search?q=${encodeURIComponent(q)}`),
  trackChannel: (youtubeChannelId: string) =>
    fetchApi<TrackingResponse>(`/research/track/${youtubeChannelId}`, { method: "POST" }),
  getFolders: () => fetchApi<Folder[]>("/research/folders"),
  createFolder: (name: string, tags: string[] = []) =>
    fetchApi<Folder>("/research/folders", { method: "POST", body: JSON.stringify({ name, tags }) }),
  getFolderChannels: (folderId: number) =>
    fetchApi<FolderChannel[]>(`/research/folders/${folderId}/channels`),
  addChannelToFolder: (folderId: number, channelId: number) =>
    fetchApi<TrackingResponse>(`/research/folders/${folderId}/channels/${channelId}`, { method: "POST" }),
  renameFolder: (folderId: number, name: string, tags: string[] = []) =>
    fetchApi<Folder>(`/research/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, tags }),
    }),
  deleteFolder: (folderId: number) =>
    fetchApi<{ status: string }>(`/research/folders/${folderId}`, { method: "DELETE" }),
  removeChannelFromFolder: (folderId: number, channelId: number) =>
    fetchApi<{ status: string }>(`/research/folders/${folderId}/channels/${channelId}`, { method: "DELETE" }),
  getTrackedChannels: () => fetchApi<FolderChannel[]>("/research/channels"),
  getStats: () => fetchApi<{ total_channels: number; total_videos: number; total_folders: number }>("/research/stats"),
  deleteChannel: (channelId: number) => fetchApi<{ status: string }>(`/research/channels/${channelId}`, { method: "DELETE" }),
  getAlerts: () => fetchApi<Alert[]>("/research/alerts"),
  getUnreadCount: () => fetchApi<UnreadCount>("/research/alerts/unread-count"),
  markAllRead: () => fetchApi<{ status: string }>("/research/alerts/mark-all-read", { method: "POST" }),
  markAlertRead: (alertId: number) => fetchApi<Alert>(`/research/alerts/${alertId}/read`, { method: "PATCH" }),
  resolveChannel: (q: string) => fetchApi<{ youtube_channel_id: string }>(`/research/resolve?q=${encodeURIComponent(q)}`),
  previewChannel: (youtubeChannelId: string) =>
    fetchApi<ChannelPreview>(`/research/preview/${youtubeChannelId}`),
  getTrendingVideos: (region = "US", limit = 24) =>
    fetchApi<TrendingYouTubeVideo[]>(`/research/trending?region=${region}&limit=${limit}`),
};
