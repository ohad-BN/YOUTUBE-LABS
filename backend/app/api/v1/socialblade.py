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
    """Fetch the most recent N daily stats rows, returned oldest→newest with per-day gain deltas."""
    # Subquery: pick the most recent `limit` rows (DESC + LIMIT),
    # then wrap in an outer query sorted ASC so the chart always reads left→right in time.
    subq = (
        select(ChannelStatsDaily)
        .where(ChannelStatsDaily.channel_id == channel_id)
        .order_by(ChannelStatsDaily.date_recorded.desc())
        .limit(limit)
        .subquery()
    )
    result = await db.execute(
        select(ChannelStatsDaily)
        .join(subq, ChannelStatsDaily.id == subq.c.id)
        .order_by(ChannelStatsDaily.date_recorded.asc())
    )
    rows = result.scalars().all()

    enriched = []
    for i, row in enumerate(rows):
        prev = rows[i - 1] if i > 0 else None
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

    # Compute upload frequency based on video_count and channel age
    days_since_creation = (datetime.now(timezone.utc) - channel.created_at).days or 1
    weeks = days_since_creation / 7
    upload_frequency_per_week = round(channel.video_count / weeks, 1) if channel.video_count else 0.0

    # Guard: require at least 7 days of history before projecting
    row_count_q = await db.execute(
        select(func.count()).select_from(ChannelStatsDaily)
        .where(ChannelStatsDaily.channel_id == channel_id)
    )
    row_count = row_count_q.scalar() or 0
    if row_count < 7:
        return ProjectionsResponse(
            channel_id=channel_id,
            current_subs=channel.subscriber_count,
            current_views=channel.view_count,
            daily_avg_subs=0,
            daily_avg_views=0,
            estimated_monthly_revenue_low=0,
            estimated_monthly_revenue_high=0,
            upload_frequency_per_week=upload_frequency_per_week,
            projections=[],
        )

    # Estimate monthly revenue based on average daily views (CPM range $2-$8)
    monthly_views = avg_views * 30
    estimated_revenue_low = int(monthly_views / 1000 * 2)
    estimated_revenue_high = int(monthly_views / 1000 * 8)

    # 3. Generate Projections
    projections = []
    for days in [30, 60, 90, 180, 365]:
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


@router.get("/channels/{channel_id}/report", response_class=Response)
async def get_channel_report(channel_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns a printable HTML report for a channel.
    Open in browser and use Ctrl+P → Save as PDF.
    """
    channel_q = await db.execute(select(TrackedChannel).where(TrackedChannel.id == channel_id))
    channel = channel_q.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Get projections data
    thirty_days_ago = date.today() - timedelta(days=30)
    avg_q = await db.execute(
        select(
            func.avg(ChannelStatsDaily.daily_subs).label("avg_subs"),
            func.avg(ChannelStatsDaily.daily_views).label("avg_views"),
        )
        .where(ChannelStatsDaily.channel_id == channel_id)
        .where(ChannelStatsDaily.date_recorded >= thirty_days_ago)
    )
    avgs = avg_q.one_or_none()
    avg_subs = int(avgs.avg_subs) if avgs and avgs.avg_subs else 0
    avg_views = int(avgs.avg_views) if avgs and avgs.avg_views else 0

    monthly_views = avg_views * 30
    revenue_low = int(monthly_views / 1000 * 2)
    revenue_high = int(monthly_views / 1000 * 8)

    rows = ""
    for days in [30, 60, 90, 180, 365]:
        proj_date = date.today() + timedelta(days=days)
        proj_subs = channel.subscriber_count + (avg_subs * days)
        proj_views = channel.view_count + (avg_views * days)
        rows += f"<tr><td>{days} Days</td><td>{proj_date}</td><td>{proj_subs:,}</td><td>{proj_views:,}</td></tr>"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{channel.title} — YouTube Labs Report</title>
  <style>
    body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; }}
    h1 {{ font-size: 1.8rem; margin-bottom: 4px; }}
    .meta {{ color: #666; font-size: 0.9rem; margin-bottom: 24px; }}
    .grade {{ display: inline-block; background: #4f46e5; color: white; padding: 2px 10px; border-radius: 4px; font-weight: bold; }}
    .stats-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }}
    .stat {{ border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }}
    .stat-value {{ font-size: 1.6rem; font-weight: bold; }}
    .stat-label {{ font-size: 0.8rem; color: #666; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
    th {{ background: #f8fafc; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; font-size: 0.85rem; }}
    td {{ padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }}
    .footer {{ margin-top: 40px; font-size: 0.75rem; color: #999; text-align: center; }}
    @media print {{ body {{ margin: 20px; }} }}
  </style>
</head>
<body>
  <h1>{channel.title}</h1>
  <div class="meta">
    Grade: <span class="grade">{channel.grade or "N/A"}</span>
    &nbsp;·&nbsp; Report generated: {date.today()}
  </div>

  <div class="stats-grid">
    <div class="stat">
      <div class="stat-value">{channel.subscriber_count:,}</div>
      <div class="stat-label">Subscribers</div>
    </div>
    <div class="stat">
      <div class="stat-value">{channel.view_count:,}</div>
      <div class="stat-label">Total Views</div>
    </div>
    <div class="stat">
      <div class="stat-value">{channel.video_count:,}</div>
      <div class="stat-label">Videos</div>
    </div>
  </div>

  <p><strong>Daily avg growth:</strong> +{avg_subs:,} subs/day &nbsp;·&nbsp; +{avg_views:,} views/day</p>
  <p><strong>Est. monthly revenue:</strong> ${revenue_low:,} – ${revenue_high:,} (CPM $2–$8)</p>

  <h2 style="margin-top:32px">Growth Projections</h2>
  <table>
    <thead><tr><th>Timeframe</th><th>Target Date</th><th>Proj. Subscribers</th><th>Proj. Views</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>

  <div class="footer">Generated by YouTube Labs · {date.today()}</div>
</body>
</html>"""

    return Response(content=html, media_type="text/html")
