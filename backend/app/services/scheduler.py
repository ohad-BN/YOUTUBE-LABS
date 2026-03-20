import logging
from datetime import date, datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models import TrackedChannel, ChannelStatsDaily, Video, VideoThumbnailHistory, Alert
from app.services.youtube_api import youtube_api

logger = logging.getLogger(__name__)

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


MILESTONES = [1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000]

async def check_milestone(db, channel, old_subs: int, new_subs: int):
    """Create an Alert if the channel crossed a subscriber milestone between refreshes."""
    for milestone in MILESTONES:
        if old_subs < milestone <= new_subs:
            msg = f"{channel.title} reached {milestone:,} subscribers!"
            alert = Alert(channel_id=channel.id, type="milestone", message=msg)
            db.add(alert)
            logger.info(f"Scheduler: milestone alert — {msg}")


async def refresh_channel_stats():
    """
    Job 1 (runs every 6 hours):
    For each tracked channel, fetch latest subscriber/view/video counts from YouTube
    and update the database record.
    """
    logger.info("Scheduler: starting channel stats refresh")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(TrackedChannel))
        channels = result.scalars().all()
        for channel in channels:
            try:
                data = await youtube_api.get_channel_stats(channel.youtube_channel_id)
                if not data:
                    continue
                stats = data.get("statistics", {})
                old_subs = channel.subscriber_count
                new_subs = int(stats.get("subscriberCount", channel.subscriber_count))
                await check_milestone(db, channel, old_subs, new_subs)
                channel.subscriber_count = new_subs
                channel.view_count = int(stats.get("viewCount", channel.view_count))
                old_video_count = channel.video_count
                new_video_count = int(stats.get("videoCount", channel.video_count))
                if new_video_count > old_video_count:
                    msg = f"{channel.title} published {new_video_count - old_video_count} new video(s)!"
                    alert = Alert(channel_id=channel.id, type="new_video", message=msg)
                    db.add(alert)
                    logger.info(f"Scheduler: new video alert — {msg}")
                channel.video_count = new_video_count
                channel.grade = calculate_grade(channel.subscriber_count)
                channel.updated_at = datetime.now(timezone.utc)
            except Exception as e:
                logger.error(f"Scheduler: failed to refresh channel {channel.youtube_channel_id}: {e}")
        await db.commit()
    logger.info(f"Scheduler: channel stats refresh complete ({len(channels)} channels)")


async def refresh_video_stats():
    """
    Job 2 (runs every 6 hours):
    - Updates view/like/comment counts for all tracked videos.
    - Calculates VPH from the delta since the last refresh (job runs every 6h).
    - Detects thumbnail changes and writes a VideoThumbnailHistory record when found.
    Processes in batches of 50 to stay within API limits.
    """
    logger.info("Scheduler: starting video stats refresh")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Video))
        videos = result.scalars().all()
        for i in range(0, len(videos), 50):
            batch = videos[i:i + 50]
            video_ids = [v.youtube_video_id for v in batch]
            try:
                details = await youtube_api.get_videos_batch(video_ids)
                for video in batch:
                    d = details.get(video.youtube_video_id, {})
                    stats = d.get("statistics", {})
                    snippet = d.get("snippet", {})
                    if not stats:
                        continue

                    # VPH: delta since last refresh (6h interval)
                    new_views = int(stats.get("viewCount", video.view_count))
                    views_delta = max(0, new_views - video.view_count)
                    video.vph = round(views_delta / 6, 2)

                    video.view_count = new_views

                    # Viral spike alert: VPH crosses threshold
                    VIRAL_VPH_THRESHOLD = 500
                    if video.vph and video.vph >= VIRAL_VPH_THRESHOLD:
                        msg = f'"{video.title[:60]}" is going viral at {int(video.vph):,} views/hour!'
                        alert = Alert(channel_id=video.channel_id, type="viral_spike", message=msg)
                        db.add(alert)
                        logger.info(f"Scheduler: viral spike alert — {msg}")
                    video.like_count = int(stats.get("likeCount", video.like_count))
                    video.comment_count = int(stats.get("commentCount", video.comment_count))

                    # Thumbnail change detection
                    if snippet:
                        new_thumbnail = (
                            snippet.get("thumbnails", {}).get("high", {}).get("url")
                            or snippet.get("thumbnails", {}).get("default", {}).get("url")
                        )
                        new_title = snippet.get("title", video.title)
                        if new_thumbnail and new_thumbnail != video.thumbnail_url:
                            logger.info(f"Scheduler: thumbnail changed for video {video.youtube_video_id}")
                            history = VideoThumbnailHistory(
                                video_id=video.id,
                                thumbnail_url=video.thumbnail_url or "",
                                title=video.title,
                            )
                            db.add(history)
                            # Create alert for thumbnail change
                            thumb_alert = Alert(
                                channel_id=video.channel_id,
                                type="thumbnail_change",
                                message=f'"{video.title[:60]}" thumbnail was changed.',
                            )
                            db.add(thumb_alert)
                            video.thumbnail_url = new_thumbnail
                        if new_title and new_title != video.title:
                            video.title = new_title

            except Exception as e:
                logger.error(f"Scheduler: failed to refresh video batch: {e}")

        # Recalculate outlier scores for all channels
        from sqlalchemy import func
        channel_ids_result = await db.execute(select(Video.channel_id).distinct())
        channel_ids_with_videos = channel_ids_result.scalars().all()
        for ch_id in channel_ids_with_videos:
            try:
                avg_q = await db.execute(
                    select(func.avg(Video.view_count)).where(Video.channel_id == ch_id)
                )
                avg_views = avg_q.scalar() or 0.0
                if avg_views == 0:
                    continue
                videos_q = await db.execute(select(Video).where(Video.channel_id == ch_id))
                ch_videos = videos_q.scalars().all()
                for v in ch_videos:
                    v.outlier_score = round(v.view_count / avg_views, 2) if avg_views > 0 else None
            except Exception as e:
                logger.error(f"Scheduler: failed to recalculate outlier scores for channel {ch_id}: {e}")

        await db.commit()
    logger.info(f"Scheduler: video stats refresh complete ({len(videos)} videos)")


async def record_daily_snapshot():
    """
    Job 3 (runs daily at midnight):
    For each tracked channel, record a ChannelStatsDaily row with today's subscriber
    and view counts. Skips if a snapshot for today already exists.
    """
    logger.info("Scheduler: recording daily snapshots")
    today = date.today()
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(TrackedChannel))
        channels = result.scalars().all()
        for channel in channels:
            try:
                existing = await db.execute(
                    select(ChannelStatsDaily).where(
                        ChannelStatsDaily.channel_id == channel.id,
                        ChannelStatsDaily.date_recorded == today
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                snapshot = ChannelStatsDaily(
                    channel_id=channel.id,
                    date_recorded=today,
                    daily_views=channel.view_count,
                    daily_subs=channel.subscriber_count,
                )
                db.add(snapshot)
            except Exception as e:
                logger.error(f"Scheduler: failed to snapshot channel {channel.id}: {e}")
        await db.commit()
    logger.info("Scheduler: daily snapshots complete")


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(refresh_channel_stats, "interval", hours=6, id="refresh_channel_stats")
    scheduler.add_job(refresh_video_stats, "interval", hours=6, id="refresh_video_stats")
    scheduler.add_job(record_daily_snapshot, "cron", hour=0, minute=0, id="daily_snapshot")
    return scheduler
