from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SavedIdeaBase(BaseModel):
    title: str
    category: Optional[str] = None
    video_reference_id: Optional[int] = None

class SavedIdeaCreate(SavedIdeaBase):
    pass

class SavedIdeaResponse(SavedIdeaBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class KeywordScoreRequest(BaseModel):
    keyword: str

class KeywordScoreResponse(BaseModel):
    keyword: str
    search_volume: int
    competition: int
    overall_score: int
