from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...core.database import get_db
from ...models.models import LexNormSettings
from ...schemas.schemas import (
    LexNormSettingsCreate,
    LexNormSettingsUpdate,
    LexNormSettingsResponse
)

router = APIRouter()


@router.post("/", response_model=LexNormSettingsResponse)
async def create_settings(
    settings: LexNormSettingsCreate,
    db: Session = Depends(get_db)
):
    """Create new settings configuration."""
    db_settings = LexNormSettings(**settings.dict())
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    return db_settings


@router.get("/", response_model=List[LexNormSettingsResponse])
async def get_all_settings(db: Session = Depends(get_db)):
    """Get all settings configurations."""
    settings = db.query(LexNormSettings).all()
    return settings


@router.get("/{settings_id}", response_model=LexNormSettingsResponse)
async def get_settings(settings_id: int, db: Session = Depends(get_db)):
    """Get specific settings configuration by ID."""
    settings = db.query(LexNormSettings).filter(LexNormSettings.id == settings_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings


@router.put("/{settings_id}", response_model=LexNormSettingsResponse)
async def update_settings(
    settings_id: int,
    settings_update: LexNormSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update settings configuration."""
    db_settings = db.query(LexNormSettings).filter(LexNormSettings.id == settings_id).first()
    if not db_settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    update_data = settings_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_settings, field, value)
    
    db.commit()
    db.refresh(db_settings)
    return db_settings


@router.delete("/{settings_id}")
async def delete_settings(settings_id: int, db: Session = Depends(get_db)):
    """Delete settings configuration."""
    db_settings = db.query(LexNormSettings).filter(LexNormSettings.id == settings_id).first()
    if not db_settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    db.delete(db_settings)
    db.commit()
    return {"message": "Settings deleted successfully"}


@router.get("/defaults/countries")
async def get_available_countries():
    """Get list of available countries."""
    # This can be expanded to include more countries
    countries = [
        {"code": "IN", "name": "India"},
        {"code": "US", "name": "United States"},
        {"code": "UK", "name": "United Kingdom"},
        {"code": "AU", "name": "Australia"},
        {"code": "CA", "name": "Canada"}
    ]
    return countries


@router.get("/defaults/standards")
async def get_available_standards():
    """Get list of available occupational standards."""
    standards = [
        {"code": "NOS", "name": "NOS-National Occupational Standard"},
        {"code": "ISCO", "name": "International Standard Classification of Occupations"},
        {"code": "SOC", "name": "Standard Occupational Classification"},
        {"code": "ANZSCO", "name": "Australian and New Zealand Standard Classification of Occupations"}
    ]
    return standards 