from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import SavedIdea
from app.schemas.idea import SavedIdeaCreate, SavedIdeaResponse, KeywordScoreRequest, KeywordScoreResponse
from typing import List
import random

router = APIRouter()

CURRENT_USER_ID = 1

@router.post("/keyword-score", response_model=KeywordScoreResponse)
async def score_keyword(request: KeywordScoreRequest):
    """
    Simulate VidIQ's AI keyword scoring.
    In production, this queries Google Trends or YouTube Autocomplete APIs.
    """
    random.seed(request.keyword) # Deterministic for the demo
    volume = random.randint(30, 99)
    competition = random.randint(10, 90)
    
    # Formula: High volume + Low competition = High Score
    overall_score = round((volume * 0.6) + ((100 - competition) * 0.4))
    
    return KeywordScoreResponse(
        keyword=request.keyword,
        search_volume=volume,
        competition=competition,
        overall_score=overall_score
    )

@router.post("/ideas", response_model=SavedIdeaResponse)
async def save_idea(idea: SavedIdeaCreate, db: AsyncSession = Depends(get_db)):
    """Save a video idea to the personal library."""
    db_idea = SavedIdea(
        user_id=CURRENT_USER_ID,
        title=idea.title,
        category=idea.category,
        video_reference_id=idea.video_reference_id
    )
    db.add(db_idea)
    await db.commit()
    await db.refresh(db_idea)
    return db_idea

@router.get("/ideas", response_model=List[SavedIdeaResponse])
async def get_ideas(db: AsyncSession = Depends(get_db)):
    """List all saved ideas for the current user."""
    query = await db.execute(
        select(SavedIdea)
        .where(SavedIdea.user_id == CURRENT_USER_ID)
        .order_by(SavedIdea.created_at.desc())
    )
    return query.scalars().all()
