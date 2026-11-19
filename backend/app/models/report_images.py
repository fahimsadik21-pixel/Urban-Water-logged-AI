"""Off-chain report image metadata model."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text
from backend.app.database import Base


class ReportImage(Base):
    """Off-chain metadata record for citizen or CCTV photos.

    Never stores raw binary media on-chain or in SQL tables.
    Stores only off-chain file reference, SHA-256 digest, MIME type, and Gemini analysis.
    """
    __tablename__ = "report_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(String(32), nullable=False, index=True)
    file_path = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    content_type = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    uploaded_at = Column(String(64), nullable=False)
    gemini_status = Column(String(32), default="pending")  # success, unavailable, rate_limited, error
    gemini_analysis = Column(Text, nullable=True)  # JSON payload
    is_offchain = Column(Boolean, default=True)
    synthetic_data = Column(Boolean, default=True)
