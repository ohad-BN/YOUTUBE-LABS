from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.channel import ChannelResponse

class FolderBase(BaseModel):
    name: str
    tags: List[str] = []

class FolderCreate(FolderBase):
    pass

class FolderResponse(FolderBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class FolderWithChannelsResponse(FolderResponse):
    channels: List[ChannelResponse]
