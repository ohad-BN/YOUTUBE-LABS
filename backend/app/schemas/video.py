from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class VideoBase(BaseModel):
    youtube_video_id: str
    title: str
    thumbnail_url: Optional[str] = None
    published_at: datetime
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    outlier_score: Optional[float] = None
    vph: Optional[float] = None

class VideoCreate(VideoBase):
    channel_id: int

class VideoResponse(VideoBase):
    id: int
    channel_id: int
    
    model_config = ConfigDict(from_attributes=True)

class OutlierAnalysisResponse(BaseModel):
    video: VideoResponse
    channel_average_views: float
    multiplier: float
