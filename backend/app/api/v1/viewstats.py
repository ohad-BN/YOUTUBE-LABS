from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models import Video, TrackedChannel, VideoThumbnailHistory
from app.schemas.video import VideoResponse, OutlierAnalysisResponse
from typing import List

router = APIRouter()

@router.get("/videos/{video_id}")
async def get_video_detail(video_id: int, db: AsyncSession = Depends(get_db)):
    """Get full details for a single video including thumbnail history."""
    video_q = await db.execute(select(Video).where(Video.id == video_id))
    video = video_q.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    history_q = await db.execute(
        select(VideoThumbnailHistory)
        .where(VideoThumbnailHistory.video_id == video_id)
        .order_by(VideoThumbnailHistory.detected_at.desc())
    )
    history = history_q.scalars().all()

    channel_q = await db.execute(select(TrackedChannel).where(TrackedChannel.id == video.channel_id))
    channel = channel_q.scalar_one_or_none()

    return {
        "id": video.id,
        "youtube_video_id": video.youtube_video_id,
        "title": video.title,
        "thumbnail_url": video.thumbnail_url,
        "published_at": video.published_at.isoformat() if video.published_at else None,
        "view_count": video.view_count,
        "like_count": video.like_count,
        "comment_count": video.comment_count,
        "outlier_score": video.outlier_score,
        "vph": video.vph,
        "channel_title": channel.title if channel else "Unknown",
        "channel_thumbnail": channel.thumbnail_url if channel else None,
        "thumbnail_history": [
            {
                "thumbnail_url": h.thumbnail_url,
                "title": h.title,
                "detected_at": h.detected_at.isoformat(),
            }
            for h in history
        ],
    }

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

@router.get("/outliers/global")
async def get_global_outliers(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """
    Get the top outlier videos across ALL tracked channels, sorted by outlier score.
    Returns videos with their outlier_score already calculated (updated by the per-channel endpoint or scheduler).
    """
    query = await db.execute(
        select(Video)
        .where(Video.outlier_score != None)
        .where(Video.outlier_score > 1.0)
        .order_by(Video.outlier_score.desc())
        .limit(limit)
    )
    videos = query.scalars().all()
    # Build response with channel info
    results = []
    for vid in videos:
        channel_q = await db.execute(select(TrackedChannel).where(TrackedChannel.id == vid.channel_id))
        channel = channel_q.scalar_one_or_none()
        results.append({
            "video_id": vid.id,
            "youtube_video_id": vid.youtube_video_id,
            "title": vid.title,
            "thumbnail_url": vid.thumbnail_url,
            "view_count": vid.view_count,
            "published_at": vid.published_at.isoformat() if vid.published_at else None,
            "outlier_score": vid.outlier_score,
            "vph": vid.vph,
            "channel_title": channel.title if channel else "Unknown",
            "channel_thumbnail": channel.thumbnail_url if channel else None,
        })
    return results
