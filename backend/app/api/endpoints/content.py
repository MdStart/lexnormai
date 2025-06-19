from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import aiofiles
import os
from ...core.database import get_db
from ...core.config import settings
from ...models.models import CourseContent
from ...schemas.schemas import (
    CourseContentCreate,
    CourseContentUpdate,
    CourseContentResponse,
    FileUploadResponse
)
from ...services.gemini_service import gemini_service

router = APIRouter()


async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file and return the content as text."""
    
    # Create upload directory if it doesn't exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    
    # Save file temporarily
    file_path = os.path.join(settings.upload_dir, upload_file.filename)
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await upload_file.read()
        await f.write(content)
    
    # Read content based on file type
    if upload_file.filename.endswith('.txt'):
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            text_content = await f.read()
    elif upload_file.filename.endswith('.pdf'):
        # For now, we'll just return a placeholder
        # In production, you'd use a PDF reader like PyPDF2 or similar
        text_content = "PDF content extraction not implemented yet. Please use text files."
    else:
        text_content = content.decode('utf-8')
    
    # Clean up temporary file
    os.remove(file_path)
    
    return text_content


@router.post("/upload", response_model=CourseContentResponse)
async def upload_course_content(
    file: UploadFile = File(...),
    title: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload course content file and create a new course content record."""
    
    # Validate file size
    if file.size > settings.max_upload_size:
        raise HTTPException(
            status_code=413,
            detail=f"File size {file.size} exceeds maximum allowed size {settings.max_upload_size}"
        )
    
    # Validate file type
    allowed_types = ["text/plain", "application/pdf", "text/markdown"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"File type {file.content_type} not supported. Allowed types: {allowed_types}"
        )
    
    try:
        # Extract content from file
        content = await save_upload_file(file)
        
        # Create course content record
        course_content_data = CourseContentCreate(title=title, content=content)
        db_content = CourseContent(**course_content_data.dict())
        
        db.add(db_content)
        db.commit()
        db.refresh(db_content)
        
        return db_content
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/", response_model=CourseContentResponse)
async def create_course_content(
    content: CourseContentCreate,
    db: Session = Depends(get_db)
):
    """Create new course content record manually."""
    db_content = CourseContent(**content.dict())
    db.add(db_content)
    db.commit()
    db.refresh(db_content)
    return db_content


@router.get("/", response_model=List[CourseContentResponse])
async def get_all_course_content(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all course content records."""
    content = db.query(CourseContent).offset(skip).limit(limit).all()
    return content


@router.get("/{content_id}", response_model=CourseContentResponse)
async def get_course_content(content_id: int, db: Session = Depends(get_db)):
    """Get specific course content by ID."""
    content = db.query(CourseContent).filter(CourseContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Course content not found")
    return content


@router.put("/{content_id}", response_model=CourseContentResponse)
async def update_course_content(
    content_id: int,
    content_update: CourseContentUpdate,
    db: Session = Depends(get_db)
):
    """Update course content."""
    db_content = db.query(CourseContent).filter(CourseContent.id == content_id).first()
    if not db_content:
        raise HTTPException(status_code=404, detail="Course content not found")
    
    update_data = content_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_content, field, value)
    
    db.commit()
    db.refresh(db_content)
    return db_content


@router.delete("/{content_id}")
async def delete_course_content(content_id: int, db: Session = Depends(get_db)):
    """Delete course content."""
    db_content = db.query(CourseContent).filter(CourseContent.id == content_id).first()
    if not db_content:
        raise HTTPException(status_code=404, detail="Course content not found")
    
    db.delete(db_content)
    db.commit()
    return {"message": "Course content deleted successfully"}


@router.post("/{content_id}/generate-summary")
async def generate_content_summary(
    content_id: int,
    custom_prompt: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate AI summary for course content."""
    
    # Get the course content
    db_content = db.query(CourseContent).filter(CourseContent.id == content_id).first()
    if not db_content:
        raise HTTPException(status_code=404, detail="Course content not found")
    
    try:
        # Generate summary using Gemini AI
        summary = await gemini_service.generate_content_summary(
            content=db_content.content,
            custom_prompt=custom_prompt or ""
        )
        
        # Update the content record with the summary
        db_content.summary = summary
        db.commit()
        db.refresh(db_content)
        
        return {
            "content_id": content_id,
            "summary": summary,
            "message": "Summary generated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}") 