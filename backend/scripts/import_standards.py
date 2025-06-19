#!/usr/bin/env python3
import sys
import os
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import LexNormStandard, Base
from app.core.config import settings


def import_standards_from_csv(csv_file_path: str):
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print(f"Reading CSV file: {csv_file_path}")
        df = pd.read_csv(csv_file_path)
        
        required_columns = ['Job Role', 'NOS Code', 'NOS Name', 'PC code', 'PC Description']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        print(f"Found {len(df)} records")
        
        db.query(LexNormStandard).delete()
        
        imported_count = 0
        for index, row in df.iterrows():
            try:
                standard = LexNormStandard(
                    job_role=str(row['Job Role']).strip(),
                    nos_code=str(row['NOS Code']).strip(),
                    nos_name=str(row['NOS Name']).strip(),
                    pc_code=str(row['PC code']).strip(),
                    pc_description=str(row['PC Description']).strip()
                )
                
                db.add(standard)
                imported_count += 1
                
                if imported_count % 100 == 0:
                    db.commit()
                    print(f"Imported {imported_count} records...")
                    
            except Exception as e:
                print(f"Error importing row {index}: {e}")
                continue
        
        db.commit()
        print(f"Successfully imported {imported_count} standards")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    csv_path = "../../data/course_mapping_library.csv"
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file_path = os.path.join(script_dir, csv_path)
    
    if not os.path.exists(csv_file_path):
        print(f"CSV file not found: {csv_file_path}")
        sys.exit(1)
    
    import_standards_from_csv(csv_file_path)
    print("Import completed!") 