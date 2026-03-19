from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, func, JSON, ForeignKey, Float, Date
from datetime import datetime, date
from typing import List, Optional, Any

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    folders: Mapped[List["Folder"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    saved_ideas: Mapped[List["SavedIdea"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Folder(Base):
    __tablename__ = "folders"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    tags: Mapped[Optional[Any]] = mapped_column(JSON, default=list) # Array of strings stored as JSON
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="folders")
    channel_mappings: Mapped[List["ChannelFolderMapping"]] = relationship(back_populates="folder", cascade="all, delete-orphan")

class TrackedChannel(Base):
    __tablename__ = "tracked_channels"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    youtube_channel_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    subscriber_count: Mapped[int] = mapped_column(default=0)
    view_count: Mapped[int] = mapped_column(default=0)
    video_count: Mapped[int] = mapped_column(default=0)
    grade: Mapped[Optional[str]] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    folder_mappings: Mapped[List["ChannelFolderMapping"]] = relationship(back_populates="channel", cascade="all, delete-orphan")
    daily_stats: Mapped[List["ChannelStatsDaily"]] = relationship(back_populates="channel", cascade="all, delete-orphan")
    videos: Mapped[List["Video"]] = relationship(back_populates="channel", cascade="all, delete-orphan")

class ChannelFolderMapping(Base):
    __tablename__ = "channel_folder_mappings"
    folder_id: Mapped[int] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), primary_key=True)
    channel_id: Mapped[int] = mapped_column(ForeignKey("tracked_channels.id", ondelete="CASCADE"), primary_key=True)

    folder: Mapped["Folder"] = relationship(back_populates="channel_mappings")
    channel: Mapped["TrackedChannel"] = relationship(back_populates="folder_mappings")

class ChannelStatsDaily(Base):
    __tablename__ = "channel_stats_daily"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    channel_id: Mapped[int] = mapped_column(ForeignKey("tracked_channels.id", ondelete="CASCADE"), index=True)
    date_recorded: Mapped[date] = mapped_column(Date)
    daily_views: Mapped[int] = mapped_column(default=0)
    daily_subs: Mapped[int] = mapped_column(default=0)
    
    channel: Mapped["TrackedChannel"] = relationship(back_populates="daily_stats")

class Video(Base):
    __tablename__ = "videos"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    youtube_video_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    channel_id: Mapped[int] = mapped_column(ForeignKey("tracked_channels.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    view_count: Mapped[int] = mapped_column(default=0)
    like_count: Mapped[int] = mapped_column(default=0)
    comment_count: Mapped[int] = mapped_column(default=0)
    outlier_score: Mapped[Optional[float]] = mapped_column(Float)
    vph: Mapped[Optional[float]] = mapped_column(Float) # Views per hour
    
    # Relationships
    channel: Mapped["TrackedChannel"] = relationship(back_populates="videos")
    thumbnail_history: Mapped[List["VideoThumbnailHistory"]] = relationship(back_populates="video", cascade="all, delete-orphan")
    saved_references: Mapped[List["SavedIdea"]] = relationship(back_populates="video", viewonly=True)

class VideoThumbnailHistory(Base):
    __tablename__ = "video_thumbnail_history"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), index=True)
    thumbnail_url: Mapped[str] = mapped_column(String(500))
    title: Mapped[str] = mapped_column(String(500))
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    video: Mapped["Video"] = relationship(back_populates="thumbnail_history")

class SavedIdea(Base):
    __tablename__ = "saved_ideas"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[Optional[str]] = mapped_column(String(100)) # e.g. folder/tag for ideas
    video_reference_id: Mapped[Optional[int]] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="saved_ideas")
    video: Mapped[Optional["Video"]] = relationship(back_populates="saved_references")
