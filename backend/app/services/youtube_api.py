import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class YouTubeApiService:
    """
    Asynchronous service to interact with the YouTube Data API v3.
    Requires YOUTUBE_API_KEY explicitly set in the .env file.
    """
    
    def __init__(self):
        self.api_key = settings.YOUTUBE_API_KEY
        self.base_url = "https://www.googleapis.com/youtube/v3"
        if not self.api_key:
            logger.warning("YOUTUBE_API_KEY is not set in environment variables! API calls will fail.")

    async def get_channel_stats(self, channel_id: str) -> dict:
        """
        Fetch basic statistics for a given channel ID.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/channels",
                    params={
                        "part": "snippet,statistics",
                        "id": channel_id,
                        "key": self.api_key,
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if "items" not in data or len(data["items"]) == 0:
                    return None
                    
                return data["items"][0]
            except httpx.HTTPError as e:
                logger.error(f"Failed to fetch channel {channel_id}: {e}")
                return None

    async def get_recent_videos(self, channel_id: str, max_results: int = 50) -> list:
        """
        Fetch recent videos for a given channel using the 'search' endpoint.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/search",
                    params={
                        "part": "snippet",
                        "channelId": channel_id,
                        "key": self.api_key,
                        "order": "date",
                        "maxResults": max_results,
                        "type": "video"
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("items", [])
            except httpx.HTTPError as e:
                logger.error(f"Failed to fetch recent videos for channel {channel_id}: {e}")
                return []

    async def get_video_stats(self, video_id: str) -> dict:
        """
        Fetch detailed statistics for a specific video ID.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/videos",
                    params={
                        "part": "snippet,statistics",
                        "id": video_id,
                        "key": self.api_key,
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if "items" not in data or len(data["items"]) == 0:
                    return None
                    
                return data["items"][0]
            except httpx.HTTPError as e:
                logger.error(f"Failed to fetch video {video_id}: {e}")
                return None

    async def search_channels(self, query: str, max_results: int = 10) -> list:
        """
        Search for YouTube channels by name or topic keyword.
        Makes two API calls: search for channels, then batch-fetch their statistics.
        """
        async with httpx.AsyncClient() as client:
            try:
                # Step 1: Search for channels matching the query
                search_response = await client.get(
                    f"{self.base_url}/search",
                    params={
                        "part": "snippet",
                        "q": query,
                        "type": "channel",
                        "maxResults": max_results,
                        "key": self.api_key,
                    }
                )
                search_response.raise_for_status()
                search_data = search_response.json()

                items = search_data.get("items", [])
                if not items:
                    return []

                # Step 2: Batch-fetch subscriber/view/video counts for all results
                channel_ids = [item["snippet"]["channelId"] for item in items]
                stats_response = await client.get(
                    f"{self.base_url}/channels",
                    params={
                        "part": "statistics",
                        "id": ",".join(channel_ids),
                        "key": self.api_key,
                    }
                )
                stats_response.raise_for_status()
                stats_data = stats_response.json()

                stats_map = {
                    item["id"]: item.get("statistics", {})
                    for item in stats_data.get("items", [])
                }

                # Step 3: Combine search snippet with statistics
                results = []
                for item in items:
                    channel_id = item["snippet"]["channelId"]
                    snippet = item["snippet"]
                    stats = stats_map.get(channel_id, {})
                    thumbnails = snippet.get("thumbnails", {})
                    thumbnail_url = (
                        thumbnails.get("medium", {}).get("url")
                        or thumbnails.get("default", {}).get("url")
                    )
                    results.append({
                        "youtube_channel_id": channel_id,
                        "title": snippet.get("title", ""),
                        "description": snippet.get("description", ""),
                        "thumbnail_url": thumbnail_url,
                        "subscriber_count": int(stats.get("subscriberCount", 0)),
                        "video_count": int(stats.get("videoCount", 0)),
                        "view_count": int(stats.get("viewCount", 0)),
                    })

                return results

            except httpx.HTTPError as e:
                logger.error(f"Failed to search channels with query '{query}': {e}")
                return []

    async def get_videos_batch(self, video_ids: list) -> dict:
        """
        Fetch snippet and statistics for multiple videos in a single API call.
        Returns a dict mapping youtube_video_id -> {"snippet": {...}, "statistics": {...}}.
        Handles up to 50 video IDs per call.
        """
        if not video_ids:
            return {}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/videos",
                    params={
                        "part": "snippet,statistics",
                        "id": ",".join(video_ids[:50]),
                        "key": self.api_key,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return {
                    item["id"]: {
                        "snippet": item.get("snippet", {}),
                        "statistics": item.get("statistics", {}),
                    }
                    for item in data.get("items", [])
                }
            except httpx.HTTPError as e:
                logger.error(f"Failed to batch-fetch video stats: {e}")
                return {}

    async def resolve_channel_id(self, query: str) -> str | None:
        """
        Resolve a YouTube channel URL, @handle, or search term to a channel ID.
        Handles:
        - youtube.com/channel/UCxxxxxx  -> extract ID directly
        - youtube.com/@handle or @handle -> use channels forHandle API
        - Any other string -> use search API to find best match
        """
        import re
        # Direct channel ID in URL: /channel/UC...
        match = re.search(r"/channel/(UC[\w-]+)", query)
        if match:
            return match.group(1)

        # @handle in URL or raw input
        handle_match = re.search(r"@([\w.-]+)", query)
        handle = handle_match.group(1) if handle_match else None

        async with httpx.AsyncClient() as client:
            if handle:
                try:
                    resp = await client.get(
                        f"{self.base_url}/channels",
                        params={"part": "id", "forHandle": f"@{handle}", "key": self.api_key}
                    )
                    resp.raise_for_status()
                    items = resp.json().get("items", [])
                    if items:
                        return items[0]["id"]
                except httpx.HTTPError:
                    pass

            # Fall back to search
            try:
                resp = await client.get(
                    f"{self.base_url}/search",
                    params={"part": "snippet", "q": query, "type": "channel", "maxResults": 1, "key": self.api_key}
                )
                resp.raise_for_status()
                items = resp.json().get("items", [])
                if items:
                    return items[0]["snippet"]["channelId"]
            except httpx.HTTPError as e:
                logger.error(f"Failed to resolve channel query '{query}': {e}")

        return None

youtube_api = YouTubeApiService()
