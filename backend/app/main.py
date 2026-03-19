from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="YouTube Labs API",
    description="Backend for YouTube Labs Analytics and Channel Growth Platform",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import viewstats, velio, socialblade, vidiq

app.include_router(viewstats.router, prefix="/api/v1/viewstats", tags=["ViewStats"])
app.include_router(velio.router, prefix="/api/v1/velio", tags=["Velio (Folders)"])
app.include_router(socialblade.router, prefix="/api/v1/socialblade", tags=["SocialBlade"])
app.include_router(vidiq.router, prefix="/api/v1/vidiq", tags=["VidIQ"])

@app.get("/")
async def root():
    return {"message": "Welcome to the YouTube Labs API"}
