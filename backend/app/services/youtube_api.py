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

youtube_api = YouTubeApiService()
