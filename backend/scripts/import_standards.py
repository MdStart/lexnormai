#!/usr/bin/env python3
import sys
import os
import pandas as pd
import argparse
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import LexNormStandard, Base
from app.core.config import settings


def clean_and_forward_fill_data(df):
    """
    Clean the dataframe and forward fill missing values in hierarchical CSV format.
    
    In hierarchical CSV format, Job Role, NOS Code, and NOS Name are only filled
    when they change, creating empty cells that need to be forward-filled.
    """
    print("Cleaning and processing hierarchical CSV data...")
    
    # Create a copy to avoid modifying the original
    df_cleaned = df.copy()
    
    # Replace empty strings and whitespace-only strings with NaN
    df_cleaned = df_cleaned.replace(r'^\s*$', pd.NA, regex=True)
    
    # Forward fill the hierarchical columns (Job Role, NOS Code, NOS Name)
    hierarchical_columns = ['Job Role', 'NOS Code', 'NOS Name']
    
    for col in hierarchical_columns:
        if col in df_cleaned.columns:
            # Forward fill missing values using the newer syntax
            df_cleaned[col] = df_cleaned[col].ffill()
            print(f"Forward-filled {col} column")
    
    # Remove any rows where essential columns are still missing
    essential_columns = ['Job Role', 'NOS Code', 'NOS Name', 'PC code', 'PC Description']
    missing_columns = [col for col in essential_columns if col not in df_cleaned.columns]
    
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Drop rows where any essential column is still NaN after forward filling
    before_count = len(df_cleaned)
    df_cleaned = df_cleaned.dropna(subset=essential_columns)
    after_count = len(df_cleaned)
    
    if before_count != after_count:
        print(f"Removed {before_count - after_count} rows with missing essential data")
    
    # Strip whitespace from all string columns
    string_columns = ['Job Role', 'NOS Code', 'NOS Name', 'PC code', 'PC Description']
    for col in string_columns:
        df_cleaned[col] = df_cleaned[col].astype(str).str.strip()
    
    # Remove any duplicate rows
    before_dedup = len(df_cleaned)
    df_cleaned = df_cleaned.drop_duplicates()
    after_dedup = len(df_cleaned)
    
    if before_dedup != after_dedup:
        print(f"Removed {before_dedup - after_dedup} duplicate rows")
    
    print(f"Data cleaning completed. Final dataset has {len(df_cleaned)} records")
    return df_cleaned


def import_standards_from_csv(csv_file_path: str):
    """Import standards from CSV file, handling hierarchical format."""
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print(f"Reading CSV file: {csv_file_path}")
        
        # Read CSV with various encoding options
        encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings_to_try:
            try:
                # Use proper CSV parsing options to handle embedded commas
                df = pd.read_csv(
                    csv_file_path, 
                    encoding=encoding,
                    quotechar='"',
                    escapechar='\\',
                    skipinitialspace=True,
                    on_bad_lines='warn'  # Warn about problematic lines instead of failing
                )
                print(f"Successfully read CSV with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"Failed to read with {encoding} encoding: {e}")
                continue
        
        if df is None:
            raise ValueError("Could not read CSV file with any of the attempted encodings")
        
        print(f"Raw CSV data shape: {df.shape}")
        print(f"CSV columns: {list(df.columns)}")
        
        # Clean and process the data
        df_cleaned = clean_and_forward_fill_data(df)
        
        print(f"Processed data shape: {df_cleaned.shape}")
        print("Sample of processed data:")
        print(df_cleaned.head(10).to_string())
        
        # Clear existing data
        deleted_count = db.query(LexNormStandard).count()
        db.query(LexNormStandard).delete()
        print(f"Cleared {deleted_count} existing records")
        
        # Import processed data
        imported_count = 0
        error_count = 0
        
        for index, row in df_cleaned.iterrows():
            try:
                # Validate that we have non-empty values
                required_fields = {
                    'job_role': row['Job Role'],
                    'nos_code': row['NOS Code'],
                    'nos_name': row['NOS Name'],
                    'pc_code': row['PC code'],
                    'pc_description': row['PC Description']
                }
                
                # Check for empty or invalid values
                for field_name, value in required_fields.items():
                    if pd.isna(value) or str(value).strip() == '' or str(value).lower() in ['nan', 'none', 'null']:
                        raise ValueError(f"Empty or invalid {field_name}: '{value}'")
                
                # Create the standard record
                standard = LexNormStandard(
                    job_role=str(row['Job Role']).strip(),
                    nos_code=str(row['NOS Code']).strip(),
                    nos_name=str(row['NOS Name']).strip(),
                    pc_code=str(row['PC code']).strip(),
                    pc_description=str(row['PC Description']).strip()
                )
                
                db.add(standard)
                imported_count += 1
                
                # Commit every 100 records for better performance
                if imported_count % 100 == 0:
                    db.commit()
                    print(f"Imported {imported_count} records...")
                    
            except Exception as e:
                error_count += 1
                print(f"Error importing row {index + 1}: {e}")
                print(f"Row data: {dict(row)}")
                
                # Skip this row and continue
                continue
        
        # Final commit
        db.commit()
        
        print(f"\nImport Summary:")
        print(f"✓ Successfully imported: {imported_count} records")
        print(f"✗ Errors encountered: {error_count} records")
        print(f"📊 Total processed: {imported_count + error_count} records")
        
        # Verify the import
        total_in_db = db.query(LexNormStandard).count()
        print(f"🔍 Total records in database: {total_in_db}")
        
        # Show sample of imported data
        print("\nSample of imported standards:")
        sample_standards = db.query(LexNormStandard).limit(5).all()
        for i, standard in enumerate(sample_standards, 1):
            print(f"{i}. {standard.job_role} | {standard.nos_code} | {standard.pc_code}")
        
    except Exception as e:
        print(f"Error during import: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Setup argument parser
    parser = argparse.ArgumentParser(
        description="Import occupational standards from CSV file into LexNormAI database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python import_standards.py --file_path ../data/course_mapping_library.csv
  python import_standards.py --file_path /full/path/to/your/standards.csv
        """
    )
    
    parser.add_argument(
        '--file_path',
        required=True,
        type=str,
        help='Path to the CSV file containing occupational standards data'
    )
    
    # Parse arguments
    args = parser.parse_args()
    
    # Validate file path
    csv_file_path = Path(args.file_path)
    
    # Convert to absolute path if relative
    if not csv_file_path.is_absolute():
        # Make relative to script directory
        script_dir = Path(__file__).parent
        csv_file_path = script_dir / csv_file_path
    
    # Resolve any relative components (like ../)
    csv_file_path = csv_file_path.resolve()
    
    # Validate file exists
    if not csv_file_path.exists():
        print(f"❌ Error: CSV file does not exist: {csv_file_path}")
        print(f"📁 Current working directory: {Path.cwd()}")
        print(f"📁 Script directory: {Path(__file__).parent}")
        
        # Try to suggest available CSV files
        parent_dir = csv_file_path.parent
        if parent_dir.exists():
            csv_files = list(parent_dir.glob("*.csv"))
            if csv_files:
                print(f"\n💡 Available CSV files in {parent_dir}:")
                for csv_file in csv_files:
                    print(f"  - {csv_file.name}")
        
        sys.exit(1)
    
    # Validate it's a file (not a directory)
    if not csv_file_path.is_file():
        print(f"❌ Error: Path exists but is not a file: {csv_file_path}")
        sys.exit(1)
    
    # Validate file extension
    if csv_file_path.suffix.lower() != '.csv':
        print(f"⚠️  Warning: File does not have .csv extension: {csv_file_path.suffix}")
        response = input("Continue anyway? (y/n): ").lower().strip()
        if response not in ['y', 'yes']:
            print("❌ Import cancelled by user")
            sys.exit(1)
    
    # Validate file is readable
    try:
        with open(csv_file_path, 'r') as f:
            f.read(1)  # Try to read first character
    except PermissionError:
        print(f"❌ Error: Permission denied reading file: {csv_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: Cannot read file {csv_file_path}: {e}")
        sys.exit(1)
    
    print(f"📁 Using CSV file: {csv_file_path}")
    print(f"📊 File size: {csv_file_path.stat().st_size:,} bytes")
    
    try:
        import_standards_from_csv(str(csv_file_path))
        print("\n🎉 Import completed successfully!")
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        sys.exit(1) 