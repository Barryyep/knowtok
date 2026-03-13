from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    abstract: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(64))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB)
    embedding_status: Mapped[str] = mapped_column(String(32))
    summary_status: Mapped[str] = mapped_column(String(32))
    hook_status: Mapped[str] = mapped_column(String(32))
    quality_status: Mapped[str] = mapped_column(String(32))
    retracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class HookCache(Base):
    __tablename__ = "hook_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    paper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"))
    user_profile_hash: Mapped[str] = mapped_column(Text)
    hook_text: Mapped[str] = mapped_column(Text)
    plain_summary: Mapped[str] = mapped_column(Text)
    template_id: Mapped[str] = mapped_column(Text)
    confidence: Mapped[Decimal] = mapped_column(Numeric(4, 3))
    source_refs: Mapped[list] = mapped_column(JSONB)
    language: Mapped[str] = mapped_column(Text)
