#!/usr/bin/env python3
"""
Database creation script for LexNormAI
This script creates all the required tables and initial data.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def create_database():
    """Create the database if it doesn't exist."""
    # Parse DATABASE_URL to get connection parameters
    database_url = os.getenv("DATABASE_URL", "postgresql://mdmacpro:@localhost:5432/lexnorm")
    if not database_url:
        print("Error: DATABASE_URL not found in environment variables")
        return False
    
    # Extract database name from URL
    # Format: postgresql://username:password@host:port/database_name
    try:
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        
        # Connection parameters
        host = parsed.hostname
        port = parsed.port or 5432
        username = parsed.username
        password = parsed.password
        database_name = parsed.path[1:]  # Remove leading '/'
        
        # Connect to PostgreSQL server (without specifying database)
        admin_conn = psycopg2.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database='postgres'  # Connect to default postgres database
        )
        admin_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        admin_cursor = admin_conn.cursor()
        
        # Check if database exists
        admin_cursor.execute(
            "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
            (database_name,)
        )
        
        if not admin_cursor.fetchone():
            print(f"Creating database: {database_name}")
            admin_cursor.execute(f'CREATE DATABASE "{database_name}"')
            print(f"Database '{database_name}' created successfully!")
        else:
            print(f"Database '{database_name}' already exists.")
        
        admin_cursor.close()
        admin_conn.close()
        return True
        
    except Exception as e:
        print(f"Error creating database: {e}")
        return False

def execute_sql_file():
    """Execute the SQL file to create tables."""
    try:
        # Get the SQL file path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        sql_file_path = os.path.join(script_dir, "create_tables.sql")
        
        if not os.path.exists(sql_file_path):
            print(f"Error: SQL file not found at {sql_file_path}")
            return False
        
        # Connect to the database
        database_url = os.getenv("DATABASE_URL", "postgresql://mdmacpro:@localhost:5432/lexnorm")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Read and execute SQL file
        print("Reading SQL file...")
        with open(sql_file_path, 'r') as file:
            sql_content = file.read()
        
        # Split the SQL into individual statements (basic splitting)
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        print(f"Executing {len(statements)} SQL statements...")
        
        for i, statement in enumerate(statements):
            # Skip comments and empty statements
            if statement.startswith('--') or not statement.strip():
                continue
                
            # Skip psql specific commands
            if statement.strip().startswith('\\'):
                continue
                
            try:
                cursor.execute(statement)
                conn.commit()
                print(f"✓ Statement {i+1} executed successfully")
            except Exception as e:
                print(f"⚠ Warning executing statement {i+1}: {e}")
                conn.rollback()
        
        print("Database tables created successfully!")
        
        # Verify tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\nCreated tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error executing SQL file: {e}")
        return False

def main():
    """Main function to create database and tables."""
    print("LexNormAI Database Setup")
    print("=" * 40)
    
    # Create database
    if create_database():
        print("✓ Database creation completed")
    else:
        print("✗ Database creation failed")
        return
    
    # Create tables
    if execute_sql_file():
        print("✓ Table creation completed")
        print("\nDatabase setup completed successfully!")
        print("\nNext steps:")
        print("1. Run: python scripts/import_standards.py (to import occupational standards)")
        print("2. Start the FastAPI server: python run_server.py")
    else:
        print("✗ Table creation failed")

if __name__ == "__main__":
    main() 