from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create default demo user on startup
    from app.db.session import AsyncSessionLocal
    from app.models import User
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == 1))
        if not result.scalars().first():
            demo_user = User(id=1, email="demo@youtubelabs.local", hashed_password="demo")
            db.add(demo_user)
            await db.commit()

    from app.services.scheduler import create_scheduler
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="YouTube Labs API",
    description="Backend for YouTube Labs Analytics and Channel Growth Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to ["http://localhost:7000"] or your domain before any public deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import trends, research, analytics, ideas

app.include_router(trends.router, prefix="/api/v1/trends", tags=["Trends"])
app.include_router(research.router, prefix="/api/v1/research", tags=["Research"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(ideas.router, prefix="/api/v1/ideas", tags=["Ideas"])

@app.get("/")
async def root():
    return {"message": "Welcome to the YouTube Labs API"}
