from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import Folder, ChannelFolderMapping, TrackedChannel, Video
from app.schemas.folder import FolderCreate, FolderResponse
from app.schemas.video import VideoResponse
from typing import List
from app.services.youtube_api import youtube_api
import datetime

router = APIRouter()

# For demo purposes until auth is wired
CURRENT_USER_ID = 1

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
        grade="A"
    )
    db.add(new_channel)
    await db.commit()
    await db.refresh(new_channel)
    
    # Ingest 10 recent videos to kickstart the system
    videos = await youtube_api.get_recent_videos(youtube_channel_id, max_results=10)
    for v in videos:
        v_snippet = v.get("snippet", {})
        vid_id = v.get("id", {}).get("videoId")
        if not vid_id: continue
        
        db_video = Video(
            youtube_video_id=vid_id,
            channel_id=new_channel.id,
            title=v_snippet.get("title", ""),
            thumbnail_url=v_snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            published_at=datetime.datetime.now(), # Simplified
            view_count=0,
            like_count=0,
            comment_count=0,
            outlier_score=1.0,
            vph=0.0
        )
        db.add(db_video)
    await db.commit()
    
    return {"status": "success", "channel_id": new_channel.id}
