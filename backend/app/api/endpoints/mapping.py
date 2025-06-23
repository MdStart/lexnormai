from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ...core.database import get_db
from ...models.models import CourseContent, LexNormStandard, LexNormSettings, MappingResult
from ...schemas.schemas import ContentMappingRequest, ContentMappingResponse, MappedStandardDetail, LexNormStandardResponse, MappingResultCreate
from ...services.gemini_service import gemini_service
import json

router = APIRouter()


@router.post("/map-content", response_model=ContentMappingResponse)
async def map_content_to_standards(
    request: ContentMappingRequest,
    db: Session = Depends(get_db)
):
    """Map course content to relevant occupational standards using AI."""
    
    # Get the course content
    course_content = db.query(CourseContent).filter(
        CourseContent.id == request.content_id
    ).first()
    
    if not course_content:
        raise HTTPException(status_code=404, detail="Course content not found")
    
    # Check if content has a summary, if not generate one
    if not course_content.summary:
        try:
            summary = await gemini_service.generate_content_summary(course_content.content)
            course_content.summary = summary
            db.commit()
            db.refresh(course_content)
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Error generating summary: {str(e)}"
            )
    
    # Get settings if specified, otherwise use defaults
    settings = None
    if request.settings_id:
        settings = db.query(LexNormSettings).filter(
            LexNormSettings.id == request.settings_id
        ).first()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
    
    # Get all available standards from the database, optionally filtered by job role
    standards_query = db.query(LexNormStandard)
    
    # Apply job role filter if provided
    if request.job_role_filter:
        standards_query = standards_query.filter(
            LexNormStandard.job_role.ilike(f"%{request.job_role_filter}%")
        )
    
    standards = standards_query.all()
    if not standards:
        error_msg = "No occupational standards found"
        if request.job_role_filter:
            error_msg += f" for job role '{request.job_role_filter}'"
        error_msg += ". Please check your filter or import standards first."
        raise HTTPException(status_code=404, detail=error_msg)
    
    try:
        # Use custom prompt if available in settings
        custom_prompt = settings.llm_prompt if settings else ""
        
        # Map content to standards using AI
        mapping_results = await gemini_service.map_content_to_standards(
            summary=course_content.summary,
            standards=standards,
            custom_prompt=custom_prompt
        )
        
        # Convert mapping results to standard responses
        mapped_standards = []
        total_confidence = 0
        overall_gap_analysis = None
        
        if not mapping_results:
            # If no results from Gemini, return empty response
            return ContentMappingResponse(
                content_id=request.content_id,
                mapped_standards=[],
                overall_confidence_score=0,
                overall_gap_analysis="No mapping results available",
                summary_used=course_content.summary
            )
        
        for result in mapping_results:
            try:
                # Find the corresponding standard in database
                nos_code = result.get("nos_code")
                pc_code = result.get("pc_code")
                confidence_score = result.get("confidence_score", 0)
                reasoning = result.get("reasoning", "")
                gap_analysis = result.get("gap_analysis", "")
                
                # Extract overall gap analysis from first result
                if overall_gap_analysis is None:
                    overall_gap_analysis = result.get("overall_gap_analysis", "")
                
                if not nos_code:
                    continue
                
                # Try exact match first
                standard = db.query(LexNormStandard).filter(
                    LexNormStandard.nos_code == nos_code,
                    LexNormStandard.pc_code == pc_code
                ).first()
                
                # If exact match not found, try just nos_code match
                if not standard:
                    standard = db.query(LexNormStandard).filter(
                        LexNormStandard.nos_code == nos_code
                    ).first()
                
                if standard:
                    # Create standard response
                    standard_response = LexNormStandardResponse(
                        id=standard.id,
                        job_role=standard.job_role,
                        nos_code=standard.nos_code,
                        nos_name=standard.nos_name,
                        pc_code=standard.pc_code,
                        pc_description=standard.pc_description,
                        created_at=standard.created_at,
                        updated_at=standard.updated_at
                    )
                    
                    # Create detailed mapping result
                    mapped_detail = MappedStandardDetail(
                        standard=standard_response,
                        confidence_score=confidence_score,
                        reasoning=reasoning,
                        gap_analysis=gap_analysis
                    )
                    
                    mapped_standards.append(mapped_detail)
                    total_confidence += confidence_score
                    
            except Exception as e:
                # Log the error but continue processing other results
                print(f"Error processing mapping result {result}: {str(e)}")
                continue
        
        # Calculate average confidence
        avg_confidence = total_confidence / len(mapping_results) if mapping_results else 0
        
        # Create the response object
        response = ContentMappingResponse(
            content_id=request.content_id,
            mapped_standards=mapped_standards,
            overall_confidence_score=avg_confidence,
            overall_gap_analysis=overall_gap_analysis or "No overall gap analysis available",
            summary_used=course_content.summary
        )
        
        # Save the complete mapping result to database
        try:
            mapping_result_data = {
                "content_id": request.content_id,
                "mapped_standards": [
                    {
                        "standard": {
                            "id": detail.standard.id,
                            "job_role": detail.standard.job_role,
                            "nos_code": detail.standard.nos_code,
                            "nos_name": detail.standard.nos_name,
                            "pc_code": detail.standard.pc_code,
                            "pc_description": detail.standard.pc_description,
                            "created_at": detail.standard.created_at.isoformat(),
                            "updated_at": detail.standard.updated_at.isoformat() if detail.standard.updated_at else None
                        },
                        "confidence_score": detail.confidence_score,
                        "reasoning": detail.reasoning,
                        "gap_analysis": detail.gap_analysis
                    }
                    for detail in mapped_standards
                ],
                "overall_confidence_score": avg_confidence,
                "overall_gap_analysis": overall_gap_analysis,
                "summary_used": course_content.summary
            }
            
            mapping_result = MappingResult(
                content_id=request.content_id,
                settings_id=request.settings_id,
                job_role_filter=request.job_role_filter,
                mapping_data=mapping_result_data,
                overall_confidence_score=f"{avg_confidence:.1f}" if avg_confidence else None,
                standards_count=len(mapped_standards)
            )
            
            db.add(mapping_result)
            db.commit()
            
        except Exception as e:
            # Log the error but don't fail the request
            print(f"Error saving mapping result to database: {str(e)}")
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error mapping content to standards: {str(e)}"
        )


@router.get("/standards/", response_model=List[dict])
async def get_available_standards(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get available occupational standards with optional search."""
    
    query = db.query(LexNormStandard)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            LexNormStandard.job_role.ilike(search_filter) |
            LexNormStandard.nos_name.ilike(search_filter) |
            LexNormStandard.pc_description.ilike(search_filter)
        )
    
    standards = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": standard.id,
            "job_role": standard.job_role,
            "nos_code": standard.nos_code,
            "nos_name": standard.nos_name,
            "pc_code": standard.pc_code,
            "pc_description": standard.pc_description
        }
        for standard in standards
    ]


@router.get("/standards/job-roles")
async def get_unique_job_roles(db: Session = Depends(get_db)):
    """Get unique job roles from occupational standards."""
    
    job_roles = db.query(LexNormStandard.job_role).distinct().all()
    return [{"job_role": role[0]} for role in job_roles]


@router.get("/results/")
async def get_mapping_results(
    skip: int = 0,
    limit: int = 100,
    content_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get saved mapping results with optional filtering by content."""
    
    query = db.query(MappingResult)
    
    if content_id:
        query = query.filter(MappingResult.content_id == content_id)
    
    results = query.order_by(MappingResult.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": result.id,
            "content_id": result.content_id,
            "settings_id": result.settings_id,
            "job_role_filter": result.job_role_filter,
            "overall_confidence_score": result.overall_confidence_score,
            "standards_count": result.standards_count,
            "created_at": result.created_at,
            "mapping_data": result.mapping_data
        }
        for result in results
    ]


@router.get("/results/{result_id}")
async def get_mapping_result_by_id(
    result_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific mapping result by ID."""
    
    result = db.query(MappingResult).filter(MappingResult.id == result_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Mapping result not found")
    
    return {
        "id": result.id,
        "content_id": result.content_id,
        "settings_id": result.settings_id,
        "job_role_filter": result.job_role_filter,
        "overall_confidence_score": result.overall_confidence_score,
        "standards_count": result.standards_count,
        "created_at": result.created_at,
        "mapping_data": result.mapping_data
    }


@router.post("/batch-map")
async def batch_map_contents(
    content_ids: List[int],
    settings_id: Optional[int] = None,
    job_role_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Batch map multiple course contents to standards."""
    
    results = []
    errors = []
    
    for content_id in content_ids:
        try:
            request = ContentMappingRequest(
                content_id=content_id,
                settings_id=settings_id,
                job_role_filter=job_role_filter
            )
            result = await map_content_to_standards(request, db)
            results.append({
                "content_id": content_id,
                "status": "success",
                "result": result
            })
        except Exception as e:
            errors.append({
                "content_id": content_id,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "successful_mappings": len(results),
        "failed_mappings": len(errors),
        "results": results,
        "errors": errors
    } 