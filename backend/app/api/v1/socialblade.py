from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from app.db.session import get_db
from app.models import TrackedChannel, ChannelStatsDaily
from app.schemas.stats import ChannelStatsDailyResponse, ProjectionsResponse, ProjectionData
from typing import List

router = APIRouter()

@router.get("/channels/{channel_id}/stats", response_model=List[ChannelStatsDailyResponse])
async def get_daily_stats(channel_id: int, limit: int = 30, db: AsyncSession = Depends(get_db)):
    """Fetch the historical daily stats for a specific tracked channel."""
    query = await db.execute(
        select(ChannelStatsDaily)
        .where(ChannelStatsDaily.channel_id == channel_id)
        .order_by(ChannelStatsDaily.date_recorded.desc())
        .limit(limit)
    )
    return query.scalars().all()

@router.get("/channels/{channel_id}/projections", response_model=ProjectionsResponse)
async def get_channel_projections(channel_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generate 30/60/90 day projections based on the channel's recent stats (e.g. last 30 days avg).
    This fulfills the core SocialBlade features.
    """
    # 1. Fetch channel
    channel_query = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
    channel = channel_query.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # 2. Compute 30-day moving average from daily stats
    thirty_days_ago = date.today() - timedelta(days=30)
    avg_query = await db.execute(
        select(
            func.avg(ChannelStatsDaily.daily_subs).label("avg_subs"),
            func.avg(ChannelStatsDaily.daily_views).label("avg_views")
        )
        .where(ChannelStatsDaily.channel_id == channel_id)
        .where(ChannelStatsDaily.date_recorded >= thirty_days_ago)
    )
    avgs = avg_query.one_or_none()
    
    avg_subs = int(avgs.avg_subs) if avgs and avgs.avg_subs else 0
    avg_views = int(avgs.avg_views) if avgs and avgs.avg_views else 0

    # 3. Generate Projections
    projections = []
    for days in [30, 60, 90]:
        proj_date = date.today() + timedelta(days=days)
        projected_subs = channel.subscriber_count + (avg_subs * days)
        projected_views = channel.view_count + (avg_views * days)
        projections.append(ProjectionData(
            days_forward=days,
            projected_subs=projected_subs,
            projected_views=projected_views,
            projected_date=proj_date
        ))

    return ProjectionsResponse(
        channel_id=channel_id,
        current_subs=channel.subscriber_count,
        current_views=channel.view_count,
        daily_avg_subs=avg_subs,
        daily_avg_views=avg_views,
        projections=projections
    )
