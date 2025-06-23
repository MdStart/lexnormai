from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


# Course Content Schemas
class CourseContentBase(BaseModel):
    title: str
    content: str


class CourseContentCreate(CourseContentBase):
    pass


class CourseContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None


class CourseContentResponse(CourseContentBase):
    id: int
    summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Lex Norm Standard Schemas
class LexNormStandardBase(BaseModel):
    job_role: str
    nos_code: str
    nos_name: str
    pc_code: str
    pc_description: str


class LexNormStandardCreate(LexNormStandardBase):
    pass


class LexNormStandardResponse(LexNormStandardBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Lex Norm Settings Schemas
class LexNormSettingsBase(BaseModel):
    task_type: Optional[Literal["content_summary", "content_mapping"]] = "content_summary"
    country: Optional[str] = "India"
    lexnorm_standard: Optional[str] = "NOS-National Occupational Standard"
    llm_model: Optional[str] = "gemini-2.5-pro"
    llm_prompt: Optional[str] = ""


class LexNormSettingsCreate(LexNormSettingsBase):
    pass


class LexNormSettingsUpdate(BaseModel):
    task_type: Optional[Literal["content_summary", "content_mapping"]] = None
    country: Optional[str] = None
    lexnorm_standard: Optional[str] = None
    llm_model: Optional[str] = None
    llm_prompt: Optional[str] = None


class LexNormSettingsResponse(LexNormSettingsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# File Upload Schema
class FileUploadResponse(BaseModel):
    filename: str
    size: int
    content_type: str
    message: str


# Content Processing Schemas
class ContentSummaryRequest(BaseModel):
    content_id: int


class ContentMappingRequest(BaseModel):
    content_id: int
    settings_id: Optional[int] = None
    job_role_filter: Optional[str] = None


class MappedStandardDetail(BaseModel):
    """Individual mapping result with confidence and analysis"""
    standard: LexNormStandardResponse
    confidence_score: float
    reasoning: str
    gap_analysis: Optional[str] = None


class ContentMappingResponse(BaseModel):
    content_id: int
    mapped_standards: list[MappedStandardDetail]
    overall_confidence_score: Optional[float] = None
    overall_gap_analysis: Optional[str] = None
    summary_used: str


class MappingResultCreate(BaseModel):
    content_id: int
    settings_id: Optional[int] = None
    job_role_filter: Optional[str] = None
    mapping_data: dict
    overall_confidence_score: Optional[str] = None
    standards_count: int


class MappingResultResponse(BaseModel):
    id: int
    content_id: int
    settings_id: Optional[int] = None
    job_role_filter: Optional[str] = None
    mapping_data: dict
    overall_confidence_score: Optional[str] = None
    standards_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 