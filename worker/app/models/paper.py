import uuid
from datetime import datetime
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(Text)
    abstract: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(64))
    doi: Mapped[str | None] = mapped_column(Text)
    semantic_scholar_paper_id: Mapped[str | None] = mapped_column(Text)
    raw_url: Mapped[str] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    citation_count: Mapped[int | None] = mapped_column()
    influential_citation_count: Mapped[int | None] = mapped_column()
    venue: Mapped[str | None] = mapped_column(Text)
    fields_of_study: Mapped[list] = mapped_column(JSONB, default=list)
    open_access_pdf_url: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    title_hash: Mapped[str] = mapped_column(Text)
    ingest_status: Mapped[str] = mapped_column(String(32), default="pending")
    embedding_status: Mapped[str] = mapped_column(String(32), default="pending")
    summary_status: Mapped[str] = mapped_column(String(32), default="pending")
    hook_status: Mapped[str] = mapped_column(String(32), default="pending")
    quality_status: Mapped[str] = mapped_column(String(32), default="active")
    retracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class PaperEmbedding(Base):
    __tablename__ = "paper_embeddings"
    __table_args__ = (UniqueConstraint("paper_id", "model", name="paper_embeddings_paper_model_key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    paper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"))
    model: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class HookCache(Base):
    __tablename__ = "hook_cache"
    __table_args__ = (
        UniqueConstraint(
            "paper_id",
            "user_profile_hash",
            "template_id",
            "language",
            name="hook_cache_unique_cache_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    paper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"))
    user_profile_hash: Mapped[str] = mapped_column(Text, default="generic_zh_cn")
    hook_text: Mapped[str] = mapped_column(Text)
    plain_summary: Mapped[str] = mapped_column(Text)
    template_id: Mapped[str] = mapped_column(Text)
    confidence: Mapped[Decimal] = mapped_column(Numeric(4, 3))
    source_refs: Mapped[list] = mapped_column(JSONB, default=list)
    language: Mapped[str] = mapped_column(Text, default="zh-CN")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    event_type: Mapped[str] = mapped_column(Text)
    entity_type: Mapped[str] = mapped_column(Text)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    provider: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(Text)
    payload_hash: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32))
    error_summary: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
