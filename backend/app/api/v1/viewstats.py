from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models import Video, TrackedChannel
from app.schemas.video import VideoResponse, OutlierAnalysisResponse
from typing import List

router = APIRouter()

@router.get("/outliers/{channel_id}", response_model=List[OutlierAnalysisResponse])
async def get_channel_outliers(channel_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get videos that significantly outperform a channel's average view count.
    This replicates the core ViewStats outlier engine.
    """
    # 1. Get channel
    channel_query = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
    channel = channel_query.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    # 2. Calculate average views for the channel's standard videos
    # In a real engine, this cuts off the top/bottom 5% before averaging.
    avg_query = await db.execute(
        select(func.avg(Video.view_count)).where(Video.channel_id == channel_id)
    )
    avg_views = avg_query.scalar() or 0.0
    
    if avg_views == 0:
        return []

    # 3. Find outliers (e.g. videos with > 3x the average views)
    outlier_threshold = avg_views * 3.0
    
    outliers_query = await db.execute(
        select(Video)
        .where(Video.channel_id == channel_id)
        .where(Video.view_count >= outlier_threshold)
        .order_by(Video.view_count.desc())
    )
    
    videos = outliers_query.scalars().all()
    
    results = []
    for vid in videos:
        multiplier = round(vid.view_count / avg_views, 2)
        # Update outlier score in DB optionally
        vid.outlier_score = multiplier
        results.append(OutlierAnalysisResponse(
            video=vid,
            channel_average_views=avg_views,
            multiplier=multiplier
        ))
    
    await db.commit()
    return results

@router.get("/velocity/top", response_model=List[VideoResponse])
async def get_top_velocity_videos(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """
    Get top videos across all tracked channels sorted by current VPH (Views Per Hour).
    """
    query = await db.execute(
        select(Video)
        .where(Video.vph != None)
        .order_by(Video.vph.desc())
        .limit(limit)
    )
    return query.scalars().all()
