from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import SavedIdea
from app.schemas.idea import SavedIdeaCreate, SavedIdeaResponse
from typing import List, Optional

router = APIRouter()

CURRENT_USER_ID = 1

@router.post("/ideas", response_model=SavedIdeaResponse)
async def save_idea(idea: SavedIdeaCreate, db: AsyncSession = Depends(get_db)):
    """Save a video idea to the personal library."""
    db_idea = SavedIdea(
        user_id=CURRENT_USER_ID,
        title=idea.title,
        category=idea.category,
        video_reference_id=idea.video_reference_id,
        status=idea.status,
        notes=idea.notes,
    )
    db.add(db_idea)
    await db.commit()
    await db.refresh(db_idea)
    return db_idea

@router.get("/ideas", response_model=List[SavedIdeaResponse])
async def get_saved_ideas(
    category: Optional[str] = None,
    sort_by: str = "date",  # "date" | "status"
    db: AsyncSession = Depends(get_db),
):
    """List all saved ideas for the current user, with optional category filter and sort."""
    stmt = select(SavedIdea).where(SavedIdea.user_id == CURRENT_USER_ID)
    if category is not None:
        stmt = stmt.where(SavedIdea.category == category)
    if sort_by == "status":
        stmt = stmt.order_by(SavedIdea.status)
    else:
        stmt = stmt.order_by(SavedIdea.created_at.desc())
    query = await db.execute(stmt)
    return query.scalars().all()

@router.patch("/ideas/{idea_id}/status")
async def update_idea_status(idea_id: int, status: str, db: AsyncSession = Depends(get_db)):
    """Update the status of a saved idea."""
    result = await db.execute(
        select(SavedIdea).where(SavedIdea.id == idea_id, SavedIdea.user_id == CURRENT_USER_ID)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    allowed = {"backlog", "in-progress", "published", "discarded"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed}")
    idea.status = status
    await db.commit()
    await db.refresh(idea)
    return idea

@router.get("/video-keywords")
async def extract_video_keywords(video_id: str):
    """
    Fetch a YouTube video's title and description and return keyword suggestions
    extracted from them. video_id should be the YouTube video ID (e.g. dQw4w9WgXcQ).
    """
    from app.services.youtube_api import youtube_api
    data = await youtube_api.get_video_stats(video_id)
    if not data:
        raise HTTPException(status_code=404, detail="Video not found or API key missing")
    snippet = data.get("snippet", {})
    title = snippet.get("title", "")
    description = snippet.get("description", "")
    # Extract keywords: split title into words, filter out short/common words
    stop_words = {"the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","can","this","that","these","those","i","you","he","she","it","we","they","my","your","his","her","its","our","their","how","what","when","where","why","who","which","by","from","up","about","into","through","during","before","after","above","below","between","each","few","more","most","other","some","such","no","not","only","same","so","than","too","very","just","also"}
    words = set()
    for text in [title, description[:500]]:
        for word in text.lower().replace("!", "").replace("?", "").replace(",", "").replace(".", "").split():
            if len(word) > 3 and word not in stop_words and word.isalpha():
                words.add(word)
    return {
        "video_id": video_id,
        "title": title,
        "keywords": sorted(list(words))[:30],
    }
