from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base
import enum


class TaskTypeEnum(str, enum.Enum):
    CONTENT_SUMMARY = "content_summary"
    CONTENT_MAPPING = "content_mapping"


class CourseContent(Base):
    __tablename__ = "course_content"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LexNormStandard(Base):
    __tablename__ = "lex_norm_standard"
    
    id = Column(Integer, primary_key=True, index=True)
    job_role = Column(String(255), nullable=False)
    nos_code = Column(String(100), nullable=False)
    nos_name = Column(String(500), nullable=False)
    pc_code = Column(String(100), nullable=False)
    pc_description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LexNormSettings(Base):
    __tablename__ = "lexnorm_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(50), default="content_summary")
    country = Column(String(100), default="India")
    lexnorm_standard = Column(String(100), default="NOS-National Occupational Standard")
    llm_model = Column(String(100), default="gemini-2.5-pro")
    llm_prompt = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MappingResult(Base):
    __tablename__ = "mapping_result"
    
    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("course_content.id"), nullable=False)
    settings_id = Column(Integer, ForeignKey("lexnorm_settings.id"), nullable=True)
    job_role_filter = Column(String(255), nullable=True)
    mapping_data = Column(JSON, nullable=False)  # Complete mapping response as JSON
    overall_confidence_score = Column(String(10), nullable=True)
    standards_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 