#!/usr/bin/env python3
"""
Script to verify imported standards data
"""

import os
import sys
from collections import Counter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import LexNormStandard
from app.core.config import settings


def verify_imported_data():
    """Verify and summarize the imported standards data."""
    
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get total count
        total_count = db.query(LexNormStandard).count()
        print(f"📊 Total Standards in Database: {total_count}")
        
        if total_count == 0:
            print("❌ No data found in database. Please run the import script first.")
            return False
        
        # Get all standards
        all_standards = db.query(LexNormStandard).all()
        
        # Analyze job roles
        job_roles = [s.job_role for s in all_standards]
        job_role_counts = Counter(job_roles)
        
        print(f"\n🎯 Job Roles Found ({len(job_role_counts)} unique):")
        for role, count in job_role_counts.most_common():
            print(f"  • {role}: {count} performance criteria")
        
        # Analyze NOS codes
        nos_codes = [s.nos_code for s in all_standards]
        nos_code_counts = Counter(nos_codes)
        
        print(f"\n📋 NOS Codes Found ({len(nos_code_counts)} unique):")
        for code, count in nos_code_counts.most_common():
            print(f"  • {code}: {count} performance criteria")
        
        # Show sample data
        print(f"\n📝 Sample Standards (first 10):")
        sample_standards = db.query(LexNormStandard).limit(10).all()
        
        for i, standard in enumerate(sample_standards, 1):
            print(f"\n{i}. Job Role: {standard.job_role}")
            print(f"   NOS Code: {standard.nos_code}")
            print(f"   NOS Name: {standard.nos_name}")
            print(f"   PC Code: {standard.pc_code}")
            print(f"   PC Description: {standard.pc_description[:100]}...")
        
        # Check for data quality issues
        print(f"\n🔍 Data Quality Check:")
        
        # Check for empty values
        empty_job_roles = db.query(LexNormStandard).filter(
            (LexNormStandard.job_role == '') | 
            (LexNormStandard.job_role.is_(None))
        ).count()
        
        empty_nos_codes = db.query(LexNormStandard).filter(
            (LexNormStandard.nos_code == '') | 
            (LexNormStandard.nos_code.is_(None))
        ).count()
        
        empty_pc_codes = db.query(LexNormStandard).filter(
            (LexNormStandard.pc_code == '') | 
            (LexNormStandard.pc_code.is_(None))
        ).count()
        
        if empty_job_roles == 0 and empty_nos_codes == 0 and empty_pc_codes == 0:
            print("  ✓ No empty critical fields found")
        else:
            print(f"  ⚠ Found empty fields:")
            if empty_job_roles > 0:
                print(f"    - {empty_job_roles} empty job roles")
            if empty_nos_codes > 0:
                print(f"    - {empty_nos_codes} empty NOS codes")
            if empty_pc_codes > 0:
                print(f"    - {empty_pc_codes} empty PC codes")
        
        # Check for duplicate records
        duplicate_count = total_count - db.query(
            LexNormStandard.job_role,
            LexNormStandard.nos_code,
            LexNormStandard.pc_code
        ).distinct().count()
        
        if duplicate_count == 0:
            print("  ✓ No duplicate records found")
        else:
            print(f"  ⚠ Found {duplicate_count} duplicate records")
        
        # Summary by NOS Name
        nos_names = [s.nos_name for s in all_standards]
        nos_name_counts = Counter(nos_names)
        
        print(f"\n📚 NOS Names ({len(nos_name_counts)} unique):")
        for name, count in nos_name_counts.most_common():
            print(f"  • {name}: {count} performance criteria")
        
        print(f"\n✅ Data verification completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("LexNormAI Standards Data Verification")
    print("=" * 50)
    
    try:
        verify_imported_data()
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        sys.exit(1) 