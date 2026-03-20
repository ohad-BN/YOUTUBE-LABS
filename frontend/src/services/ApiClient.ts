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

// --- ViewStats Suite ---
export const ViewStatsClient = {
  getOutliers: (channelId: number) => fetchApi<any[]>(`/viewstats/outliers/${channelId}`),
  getTopVelocity: (limit: number = 10) => fetchApi<any[]>(`/viewstats/velocity/top?limit=${limit}`),
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
};

// --- VidIQ Suite ---
export const VidIQClient = {
  getSavedIdeas: () => fetchApi<any[]>("/vidiq/ideas"),
  saveIdea: (title: string, category: string, videoId?: number) =>
    fetchApi<any>("/vidiq/ideas", {
      method: "POST",
      body: JSON.stringify({ title, category, video_reference_id: videoId })
    }),
  scoreKeyword: (keyword: string) =>
    fetchApi<any>("/vidiq/keyword-score", {
      method: "POST",
      body: JSON.stringify({ keyword })
    })
};
