from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import Folder, ChannelFolderMapping, TrackedChannel, Video
from app.schemas.folder import FolderCreate, FolderResponse
from app.schemas.channel import ChannelResponse, ChannelSearchResult
from app.schemas.video import VideoResponse
from typing import List
from app.services.youtube_api import youtube_api
import datetime

router = APIRouter()

# For demo purposes until auth is wired
CURRENT_USER_ID = 1

def calculate_grade(subscriber_count: int) -> str:
    if subscriber_count >= 10_000_000: return "A++"
    if subscriber_count >= 5_000_000:  return "A+"
    if subscriber_count >= 1_000_000:  return "A"
    if subscriber_count >= 500_000:    return "B+"
    if subscriber_count >= 100_000:    return "B"
    if subscriber_count >= 50_000:     return "C+"
    if subscriber_count >= 10_000:     return "C"
    if subscriber_count >= 1_000:      return "D"
    return "F"

@router.post("/folders", response_model=FolderResponse)
async def create_folder(folder: FolderCreate, db: AsyncSession = Depends(get_db)):
    """Create a new folder for categorizing channels."""
    db_folder = Folder(user_id=CURRENT_USER_ID, name=folder.name, tags=folder.tags)
    db.add(db_folder)
    await db.commit()
    await db.refresh(db_folder)
    return db_folder

@router.get("/folders", response_model=List[FolderResponse])
async def get_folders(db: AsyncSession = Depends(get_db)):
    """List all folders for the current user."""
    query = await db.execute(select(Folder).where(Folder.user_id == CURRENT_USER_ID))
    return query.scalars().all()

@router.post("/folders/{folder_id}/channels/{channel_id}")
async def add_channel_to_folder(folder_id: int, channel_id: int, db: AsyncSession = Depends(get_db)):
    """Map a channel to a specific folder."""
    mapping = ChannelFolderMapping(folder_id=folder_id, channel_id=channel_id)
    db.add(mapping)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Mapping already exists or IDs are invalid")
    return {"status": "success", "message": "Channel bounded to folder"}

@router.get("/folders/{folder_id}/videos", response_model=List[VideoResponse])
async def get_folder_videos(folder_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get aggregated video feed for all channels in a chosen folder.
    Fulfills the Velio feature requirement exactly.
    """
    mapping_query = await db.execute(
        select(ChannelFolderMapping.channel_id).where(ChannelFolderMapping.folder_id == folder_id)
    )
    channel_ids = mapping_query.scalars().all()
    if not channel_ids:
        return []
        
    videos_query = await db.execute(
        select(Video)
        .where(Video.channel_id.in_(channel_ids))
        .order_by(Video.published_at.desc())
        .limit(100)
    )
    return videos_query.scalars().all()

@router.post("/track/{youtube_channel_id}")
async def track_new_channel(youtube_channel_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch channel data from YouTube and start tracking it organically."""
    existing = await db.execute(select(TrackedChannel).where(TrackedChannel.youtube_channel_id == youtube_channel_id))
    if existing.scalar_one_or_none():
        return {"status": "success", "message": "Channel is already tracked"}
        
    stats = await youtube_api.get_channel_stats(youtube_channel_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Channel not found or API key missing")
        
    snippet = stats.get("snippet", {})
    statistics = stats.get("statistics", {})
    
    new_channel = TrackedChannel(
        youtube_channel_id=youtube_channel_id,
        title=snippet.get("title", "Unknown"),
        thumbnail_url=snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
        subscriber_count=int(statistics.get("subscriberCount", 0)),
        view_count=int(statistics.get("viewCount", 0)),
        video_count=int(statistics.get("videoCount", 0)),
        grade=calculate_grade(int(statistics.get("subscriberCount", 0)))
    )
    db.add(new_channel)
    await db.commit()
    await db.refresh(new_channel)
    
    # Ingest 10 recent videos with real stats
    videos = await youtube_api.get_recent_videos(youtube_channel_id, max_results=10)
    video_ids = [v.get("id", {}).get("videoId") for v in videos if v.get("id", {}).get("videoId")]
    video_details = await youtube_api.get_videos_batch(video_ids)

    for v in videos:
        v_snippet = v.get("snippet", {})
        vid_id = v.get("id", {}).get("videoId")
        if not vid_id:
            continue

        published_at_str = v_snippet.get("publishedAt", "")
        if published_at_str:
            published_at = datetime.datetime.fromisoformat(published_at_str.replace('Z', '+00:00'))
        else:
            published_at = datetime.datetime.now(datetime.timezone.utc)

        details = video_details.get(vid_id, {})
        stats = details.get("statistics", {})

        db_video = Video(
            youtube_video_id=vid_id,
            channel_id=new_channel.id,
            title=v_snippet.get("title", ""),
            thumbnail_url=v_snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            published_at=published_at,
            view_count=int(stats.get("viewCount", 0)),
            like_count=int(stats.get("likeCount", 0)),
            comment_count=int(stats.get("commentCount", 0)),
            outlier_score=1.0,
            vph=0.0
        )
        db.add(db_video)
    await db.commit()
    
    return {"status": "success", "channel_id": new_channel.id}

@router.get("/search", response_model=List[ChannelSearchResult])
async def search_channels(q: str):
    """Search YouTube for channels by name or topic keyword."""
    results = await youtube_api.search_channels(q)
    return results

@router.get("/folders/{folder_id}/channels", response_model=List[ChannelResponse])
async def get_folder_channels(folder_id: int, db: AsyncSession = Depends(get_db)):
    """Get all tracked channels assigned to a specific folder."""
    mapping_query = await db.execute(
        select(ChannelFolderMapping.channel_id).where(ChannelFolderMapping.folder_id == folder_id)
    )
    channel_ids = mapping_query.scalars().all()
    if not channel_ids:
        return []
    channels_query = await db.execute(
        select(TrackedChannel).where(TrackedChannel.id.in_(channel_ids))
    )
    return channels_query.scalars().all()

@router.delete("/folders/{folder_id}")
async def delete_folder(folder_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a folder and all its channel mappings."""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == CURRENT_USER_ID)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    await db.delete(folder)
    await db.commit()
    return {"status": "success"}

@router.delete("/folders/{folder_id}/channels/{channel_id}")
async def remove_channel_from_folder(folder_id: int, channel_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a channel from a folder without deleting the channel from tracking."""
    result = await db.execute(
        select(ChannelFolderMapping).where(
            ChannelFolderMapping.folder_id == folder_id,
            ChannelFolderMapping.channel_id == channel_id
        )
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Channel not in this folder")
    await db.delete(mapping)
    await db.commit()
    return {"status": "success"}

@router.get("/channels", response_model=List[ChannelResponse])
async def get_all_channels(db: AsyncSession = Depends(get_db)):
    """List all tracked channels."""
    result = await db.execute(select(TrackedChannel).order_by(TrackedChannel.subscriber_count.desc()))
    return result.scalars().all()

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Return aggregate counts: tracked channels, total videos, total folders."""
    from sqlalchemy import func
    channels_count = (await db.execute(select(func.count()).select_from(TrackedChannel))).scalar()
    videos_count = (await db.execute(select(func.count()).select_from(Video))).scalar()
    folders_count = (await db.execute(
        select(func.count()).select_from(Folder).where(Folder.user_id == CURRENT_USER_ID)
    )).scalar()
    return {
        "total_channels": channels_count,
        "total_videos": videos_count,
        "total_folders": folders_count,
    }

@router.delete("/channels/{channel_id}")
async def delete_channel(channel_id: int, db: AsyncSession = Depends(get_db)):
    """Permanently delete a tracked channel and all its associated data."""
    result = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    await db.delete(channel)
    await db.commit()
    return {"status": "success"}

@router.get("/resolve")
async def resolve_channel(q: str):
    """
    Resolve a YouTube channel URL, @handle, or search query to a channel ID.
    Accepts: youtube.com/channel/ID, youtube.com/@handle, @handle, or a channel name.
    Returns: { youtube_channel_id: str }
    """
    channel_id = await youtube_api.resolve_channel_id(q)
    if not channel_id:
        raise HTTPException(status_code=404, detail="Could not resolve channel from input")
    return {"youtube_channel_id": channel_id}

@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db)):
    """Get all recent alerts, newest first."""
    from app.models import Alert as AlertModel
    result = await db.execute(
        select(AlertModel).order_by(AlertModel.created_at.desc()).limit(50)
    )
    alerts = result.scalars().all()
    return [
        {
            "id": a.id,
            "type": a.type,
            "message": a.message,
            "is_read": a.is_read,
            "created_at": a.created_at.isoformat(),
            "channel_id": a.channel_id,
        }
        for a in alerts
    ]

@router.get("/alerts/unread-count")
async def get_unread_count(db: AsyncSession = Depends(get_db)):
    """Return count of unread alerts for the notification bell."""
    from app.models import Alert as AlertModel
    from sqlalchemy import func as sqlfunc
    count = (await db.execute(
        select(sqlfunc.count()).select_from(AlertModel).where(AlertModel.is_read == False)
    )).scalar()
    return {"unread": count}

@router.post("/alerts/mark-all-read")
async def mark_all_alerts_read(db: AsyncSession = Depends(get_db)):
    """Mark all alerts as read."""
    from app.models import Alert as AlertModel
    from sqlalchemy import update
    await db.execute(update(AlertModel).values(is_read=True))
    await db.commit()
    return {"status": "success"}

@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a single alert as read."""
    from app.models import Alert as AlertModel
    result = await db.execute(select(AlertModel).where(AlertModel.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    await db.commit()
    return {"status": "success"}
