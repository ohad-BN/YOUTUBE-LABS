from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta, datetime, timezone
from app.db.session import get_db
from app.models import TrackedChannel, ChannelStatsDaily
from app.schemas.stats import ChannelStatsDailyResponse, ProjectionsResponse, ProjectionData
from typing import List
import csv
import io

router = APIRouter()

@router.get("/channels/{channel_id}/stats")
async def get_daily_stats(channel_id: int, limit: int = 30, db: AsyncSession = Depends(get_db)):
    """Fetch historical daily stats for a channel, enriched with per-day gain deltas."""
    result = await db.execute(
        select(ChannelStatsDaily)
        .where(ChannelStatsDaily.channel_id == channel_id)
        .order_by(ChannelStatsDaily.date_recorded.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    rows_sorted = sorted(rows, key=lambda r: r.date_recorded)

    enriched = []
    for i, row in enumerate(rows_sorted):
        prev = rows_sorted[i - 1] if i > 0 else None
        enriched.append({
            "date_recorded": str(row.date_recorded),
            "daily_subs": row.daily_subs,
            "daily_views": row.daily_views,
            "gain_subs": row.daily_subs - prev.daily_subs if prev else 0,
            "gain_views": row.daily_views - prev.daily_views if prev else 0,
        })
    return enriched

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

    # Estimate monthly revenue based on average daily views (CPM range $2-$8)
    monthly_views = avg_views * 30
    estimated_revenue_low = int(monthly_views / 1000 * 2)
    estimated_revenue_high = int(monthly_views / 1000 * 8)

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

    # Compute upload frequency based on video_count and channel age
    days_since_creation = (datetime.now(timezone.utc) - channel.created_at).days or 1
    weeks = days_since_creation / 7
    upload_frequency_per_week = round(channel.video_count / weeks, 1) if channel.video_count else 0.0

    return ProjectionsResponse(
        channel_id=channel_id,
        current_subs=channel.subscriber_count,
        current_views=channel.view_count,
        daily_avg_subs=avg_subs,
        daily_avg_views=avg_views,
        estimated_monthly_revenue_low=estimated_revenue_low,
        estimated_monthly_revenue_high=estimated_revenue_high,
        projections=projections,
        upload_frequency_per_week=upload_frequency_per_week,
    )

@router.get("/compare")
async def compare_channels(channel_ids: str, db: AsyncSession = Depends(get_db)):
    """
    Compare metrics for multiple channels side-by-side.
    channel_ids: comma-separated list of internal channel IDs (e.g. "1,2,3")
    """
    ids = [int(x.strip()) for x in channel_ids.split(",") if x.strip().isdigit()]
    if not ids or len(ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 channel IDs")
    if len(ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 channels for comparison")

    results = []
    for channel_id in ids:
        channel_q = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
        channel = channel_q.scalar_one_or_none()
        if not channel:
            continue

        # Get daily stats for growth calculation
        stats_q = await db.execute(
            select(ChannelStatsDaily)
            .where(ChannelStatsDaily.channel_id == channel_id)
            .order_by(ChannelStatsDaily.date_recorded.asc())
        )
        daily = stats_q.scalars().all()

        daily_avg_subs = 0
        if len(daily) >= 2:
            days = (daily[-1].date_recorded - daily[0].date_recorded).days or 1
            daily_avg_subs = round((daily[-1].daily_subs - daily[0].daily_subs) / days)

        results.append({
            "channel_id": channel.id,
            "title": channel.title,
            "thumbnail_url": channel.thumbnail_url,
            "subscriber_count": channel.subscriber_count,
            "view_count": channel.view_count,
            "video_count": channel.video_count,
            "grade": channel.grade,
            "daily_avg_subs": daily_avg_subs,
        })

    return results


@router.get("/channels/{channel_id}/export")
async def export_channel_csv(channel_id: int, db: AsyncSession = Depends(get_db)):
    """Export channel growth data as a CSV file."""
    channel_query = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
    channel = channel_query.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    stats_query = await db.execute(
        select(ChannelStatsDaily)
        .where(ChannelStatsDaily.channel_id == channel_id)
        .order_by(ChannelStatsDaily.date_recorded.asc())
    )
    stats = stats_query.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "subscribers", "views"])
    for s in stats:
        writer.writerow([s.date_recorded.isoformat(), s.daily_subs, s.daily_views])

    csv_content = output.getvalue()
    filename = f"{channel.title.replace(' ', '_')}_stats.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
