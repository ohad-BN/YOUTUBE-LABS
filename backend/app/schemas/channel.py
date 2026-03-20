from pydantic import BaseModel, ConfigDict
from typing import Optional

class ChannelBase(BaseModel):
    youtube_channel_id: str
    title: str
    thumbnail_url: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelResponse(ChannelBase):
    id: int
    subscriber_count: int
    view_count: int
    video_count: int
    grade: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)

class ChannelSearchResult(BaseModel):
    youtube_channel_id: str
    title: str
    description: str
    thumbnail_url: Optional[str] = None
    subscriber_count: int = 0
    video_count: int = 0
    view_count: int = 0
