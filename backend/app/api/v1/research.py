from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from app.db.session import get_db
from app.models import Folder, ChannelFolderMapping, TrackedChannel, Video
from app.schemas.folder import FolderCreate, FolderResponse
from app.schemas.channel import ChannelResponse, ChannelSearchResult
from app.schemas.video import VideoResponse
from typing import List, Optional
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

async def _ingest_videos_page(
    db: AsyncSession,
    channel: TrackedChannel,
    youtube_channel_id: str,
    page_token: str | None = None,
):
    """Fetch one page of videos (50) from a channel's uploads playlist, store them, and return next_page_token."""
    page_data = await youtube_api.get_channel_videos_page(youtube_channel_id, max_results=50, page_token=page_token)
    items = page_data.get("items", [])
    if not items:
        return None

    # Extract video IDs for batch stats fetch
    video_ids = [
        item.get("snippet", {}).get("resourceId", {}).get("videoId")
        for item in items
        if item.get("snippet", {}).get("resourceId", {}).get("videoId")
    ]
    video_details = await youtube_api.get_videos_batch(video_ids)

    for item in items:
        snippet = item.get("snippet", {})
        vid_id = snippet.get("resourceId", {}).get("videoId")
        if not vid_id:
            continue

        # Skip if already ingested
        existing = await db.execute(
            select(Video.id).where(Video.youtube_video_id == vid_id, Video.channel_id == channel.id).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            continue

        published_at_str = snippet.get("publishedAt", "")
        if published_at_str:
            published_at = datetime.datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
        else:
            published_at = datetime.datetime.now(datetime.timezone.utc)

        details = video_details.get(vid_id, {})
        stats = details.get("statistics", {})

        db_video = Video(
            youtube_video_id=vid_id,
            channel_id=channel.id,
            title=snippet.get("title", ""),
            thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            published_at=published_at,
            view_count=int(stats.get("viewCount", 0)),
            like_count=int(stats.get("likeCount", 0)),
            comment_count=int(stats.get("commentCount", 0)),
            outlier_score=1.0,
            vph=0.0,
        )
        db.add(db_video)

    return page_data.get("nextPageToken")


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

@router.get("/folders/{folder_id}/videos")
async def get_folder_videos(
    folder_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("newest"),
    sort_dir: str = Query("desc"),
    search: Optional[str] = Query(None),
    date_days: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated video feed for all channels in a folder.
    Supports sorting, search, and date filtering.
    """
    mapping_query = await db.execute(
        select(ChannelFolderMapping.channel_id).where(ChannelFolderMapping.folder_id == folder_id)
    )
    channel_ids = mapping_query.scalars().all()
    if not channel_ids:
        return {"items": [], "total": 0, "page": page, "per_page": per_page}

    base = select(Video).where(Video.channel_id.in_(channel_ids))

    # Search filter
    if search and search.strip():
        base = base.where(Video.title.ilike(f"%{search.strip()}%"))

    # Date filter
    if date_days:
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=date_days)
        base = base.where(Video.published_at >= cutoff)

    # Total count
    count_q = await db.execute(select(sqlfunc.count()).select_from(base.subquery()))
    total = count_q.scalar() or 0

    # Sorting
    sort_map = {
        "newest": Video.published_at,
        "most_views": Video.view_count,
        "outlier_score": Video.outlier_score,
        "vph": Video.vph,
    }
    sort_col = sort_map.get(sort_by, Video.published_at)
    if sort_dir == "asc":
        base = base.order_by(sort_col.asc().nullslast())
    else:
        base = base.order_by(sort_col.desc().nullslast())
    # Secondary sort for stability
    if sort_by != "newest":
        base = base.order_by(Video.published_at.desc())

    # Pagination
    offset = (page - 1) * per_page
    videos_query = await db.execute(base.offset(offset).limit(per_page))
    videos = videos_query.scalars().all()

    return {
        "items": [
            {
                "id": v.id,
                "title": v.title,
                "youtube_video_id": v.youtube_video_id,
                "channel_id": v.channel_id,
                "view_count": v.view_count,
                "thumbnail_url": v.thumbnail_url,
                "published_at": v.published_at.isoformat() if v.published_at else None,
                "like_count": v.like_count,
                "comment_count": v.comment_count,
                "outlier_score": v.outlier_score,
                "vph": v.vph,
            }
            for v in videos
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }

@router.post("/track/{youtube_channel_id}")
async def track_new_channel(youtube_channel_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch channel data from YouTube and start tracking it organically."""
    existing_q = await db.execute(select(TrackedChannel).where(TrackedChannel.youtube_channel_id == youtube_channel_id))
    existing = existing_q.scalar_one_or_none()
    if existing:
        return {"status": "success", "channel_id": existing.id}
        
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
    
    # Ingest recent videos using the uploads playlist (cheap: 1 quota unit per page)
    await _ingest_videos_page(db, new_channel, youtube_channel_id)
    await db.commit()
    
    return {"status": "success", "channel_id": new_channel.id}

@router.post("/channels/{channel_id}/ingest-more")
async def ingest_more_videos(
    channel_id: int,
    pages: int = Query(1, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch older videos for a tracked channel from YouTube.
    Each page fetches 50 videos. Max 10 pages (500 videos) per call.
    """
    channel_q = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
    channel = channel_q.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Find the oldest video we have to determine where to start paginating
    # We need to iterate from the beginning and skip pages we already have
    # Instead, just paginate from the start and _ingest_videos_page skips existing
    page_token = None
    total_new = 0
    for _ in range(pages):
        next_token = await _ingest_videos_page(db, channel, channel.youtube_channel_id, page_token)
        await db.commit()
        if not next_token:
            break
        page_token = next_token

    # Count total videos now
    count_q = await db.execute(
        select(sqlfunc.count()).select_from(
            select(Video.id).where(Video.channel_id == channel_id).subquery()
        )
    )
    total_new = count_q.scalar() or 0

    return {"status": "success", "total_videos": total_new}

@router.get("/search", response_model=List[ChannelSearchResult])
async def search_channels(q: str):
    """Search YouTube for channels by name or topic keyword."""
    results = await youtube_api.search_channels(q)
    return results

@router.get("/folders/{folder_id}/channels")
async def get_folder_channels(folder_id: int, db: AsyncSession = Depends(get_db)):
    """Get all tracked channels in a folder, enriched with last upload date and avg views."""
    mapping_query = await db.execute(
        select(ChannelFolderMapping.channel_id).where(ChannelFolderMapping.folder_id == folder_id)
    )
    channel_ids = mapping_query.scalars().all()
    if not channel_ids:
        return []
    channels_query = await db.execute(
        select(TrackedChannel).where(TrackedChannel.id.in_(channel_ids))
    )
    channels = channels_query.scalars().all()

    from sqlalchemy import func as sqlfunc
    results = []
    for ch in channels:
        last_video = await db.execute(
            select(Video.published_at)
            .where(Video.channel_id == ch.id)
            .order_by(Video.published_at.desc())
            .limit(1)
        )
        last_date = last_video.scalar_one_or_none()

        avg_q = await db.execute(
            select(sqlfunc.avg(Video.view_count)).where(Video.channel_id == ch.id)
        )
        avg_views = avg_q.scalar()

        results.append({
            "id": ch.id,
            "youtube_channel_id": ch.youtube_channel_id,
            "title": ch.title,
            "thumbnail_url": ch.thumbnail_url,
            "subscriber_count": ch.subscriber_count,
            "view_count": ch.view_count,
            "video_count": ch.video_count,
            "grade": ch.grade,
            "last_upload_date": last_date.isoformat() if last_date else None,
            "avg_views_per_video": int(avg_views) if avg_views else None,
        })
    return results

@router.patch("/folders/{folder_id}", response_model=FolderResponse)
async def rename_folder(folder_id: int, folder: FolderCreate, db: AsyncSession = Depends(get_db)):
    """Rename a folder (update name and/or tags)."""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == CURRENT_USER_ID)
    )
    db_folder = result.scalar_one_or_none()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db_folder.name = folder.name
    db_folder.tags = folder.tags
    await db.commit()
    await db.refresh(db_folder)
    return db_folder

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

@router.get("/channels")
async def get_all_channels(db: AsyncSession = Depends(get_db)):
    """List all tracked channels with enriched stats."""
    from sqlalchemy import func as sqlfunc
    result = await db.execute(select(TrackedChannel).order_by(TrackedChannel.subscriber_count.desc()))
    channels = result.scalars().all()
    enriched = []
    for ch in channels:
        last_video = await db.execute(
            select(Video.published_at)
            .where(Video.channel_id == ch.id)
            .order_by(Video.published_at.desc())
            .limit(1)
        )
        last_date = last_video.scalar_one_or_none()
        enriched.append({
            "id": ch.id,
            "youtube_channel_id": ch.youtube_channel_id,
            "title": ch.title,
            "thumbnail_url": ch.thumbnail_url,
            "subscriber_count": ch.subscriber_count,
            "view_count": ch.view_count,
            "video_count": ch.video_count,
            "grade": ch.grade,
            "last_upload_date": last_date.isoformat() if last_date else None,
        })
    return enriched

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

@router.get("/preview/{youtube_channel_id}")
async def preview_channel(youtube_channel_id: str):
    """
    Fetch live channel data from YouTube without storing it.
    Used to preview a channel before deciding to track it.
    """
    stats = await youtube_api.get_channel_stats(youtube_channel_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Channel not found or API key missing")

    snippet = stats.get("snippet", {})
    statistics = stats.get("statistics", {})
    video_count = int(statistics.get("videoCount", 0))
    sub_count = int(statistics.get("subscriberCount", 0))

    # Upload frequency: use channel creation date if available
    published_at_str = snippet.get("publishedAt", "")
    upload_per_week = None
    if published_at_str and video_count:
        from datetime import timezone as tz
        created = datetime.datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
        days_live = max((datetime.datetime.now(tz.utc) - created).days, 1)
        upload_per_week = round(video_count / (days_live / 7), 1)

    # Latest video
    latest_video = None
    recent = await youtube_api.get_recent_videos(youtube_channel_id, max_results=1)
    if recent:
        v = recent[0]
        vs = v.get("snippet", {})
        latest_video = {
            "title": vs.get("title", ""),
            "thumbnail_url": vs.get("thumbnails", {}).get("medium", {}).get("url") or vs.get("thumbnails", {}).get("default", {}).get("url"),
            "published_at": vs.get("publishedAt"),
        }

    return {
        "youtube_channel_id": youtube_channel_id,
        "title": snippet.get("title", ""),
        "thumbnail_url": snippet.get("thumbnails", {}).get("default", {}).get("url"),
        "subscriber_count": sub_count,
        "view_count": int(statistics.get("viewCount", 0)),
        "video_count": video_count,
        "upload_per_week": upload_per_week,
        "latest_video": latest_video,
    }


@router.get("/trending")
async def get_trending_videos(region: str = "US", limit: int = 24):
    """Fetch globally trending videos from YouTube (no auth/tracking required)."""
    results = await youtube_api.get_trending_videos(region_code=region, max_results=limit)
    return results
