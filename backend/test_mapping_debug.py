#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import CourseContent, LexNormStandard
from app.services.gemini_service import gemini_service

async def test_mapping():
    db = SessionLocal()
    
    try:
        # Get a sample course content
        content = db.query(CourseContent).filter(CourseContent.summary.isnot(None)).first()
        if not content:
            print("No content with summary found!")
            return
        
        print(f"Testing with content: {content.title}")
        print(f"Summary length: {len(content.summary) if content.summary else 0}")
        
        # Get all standards
        standards = db.query(LexNormStandard).all()
        print(f"Total standards available: {len(standards)}")
        
        # Test mapping
        print("\n=== Starting AI Mapping ===")
        results = await gemini_service.map_content_to_standards(
            summary=content.summary,
            standards=standards,
            custom_prompt=""
        )
        
        print(f"\n=== Mapping Results ===")
        print(f"Number of results: {len(results)}")
        
        if results:
            for i, result in enumerate(results, 1):
                print(f"\nResult {i}:")
                print(f"  Job Role: {result.get('job_role')}")
                print(f"  NOS Code: {result.get('nos_code')}")
                print(f"  PC Code: {result.get('pc_code')}")
                print(f"  Confidence: {result.get('confidence_score')}")
                
                # Check if this exists in database
                nos_code = result.get('nos_code')
                pc_code = result.get('pc_code')
                
                # Try exact match
                exact_match = db.query(LexNormStandard).filter(
                    LexNormStandard.nos_code == nos_code,
                    LexNormStandard.pc_code == pc_code
                ).first()
                
                # Try nos_code only match
                nos_match = db.query(LexNormStandard).filter(
                    LexNormStandard.nos_code == nos_code
                ).first()
                
                print(f"  Exact match found: {exact_match is not None}")
                print(f"  NOS match found: {nos_match is not None}")
                
        else:
            print("No results returned from Gemini!")
    
    except Exception as e:
        print(f"Error during test: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_mapping()) 