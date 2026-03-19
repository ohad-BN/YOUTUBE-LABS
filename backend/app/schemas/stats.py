from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import List

class ChannelStatsDailyResponse(BaseModel):
    id: int
    channel_id: int
    date_recorded: date
    daily_views: int
    daily_subs: int

    model_config = ConfigDict(from_attributes=True)

class ProjectionData(BaseModel):
    days_forward: int
    projected_subs: int
    projected_views: int
    projected_date: date

class ProjectionsResponse(BaseModel):
    channel_id: int
    current_subs: int
    current_views: int
    daily_avg_subs: int
    daily_avg_views: int
    projections: List[ProjectionData]
