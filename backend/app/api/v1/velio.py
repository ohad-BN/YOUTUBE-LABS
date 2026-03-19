from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import Folder, ChannelFolderMapping, TrackedChannel, Video
from app.schemas.folder import FolderCreate, FolderResponse
from app.schemas.video import VideoResponse
from typing import List

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
