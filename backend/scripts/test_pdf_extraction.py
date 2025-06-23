#!/usr/bin/env python3
"""
Test script for PDF and DOCX extraction functionality
"""

import os
import sys
import io
from pathlib import Path

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_pdf_extraction():
    """Test PDF extraction functionality."""
    try:
        from PyPDF2 import PdfReader
        print("✓ PyPDF2 imported successfully")
        
        # Create a simple test PDF content (this is just for demonstration)
        # In a real test, you'd use an actual PDF file
        print("PDF extraction library is available and ready to use")
        return True
        
    except ImportError as e:
        print(f"✗ PyPDF2 import failed: {e}")
        return False

def test_docx_extraction():
    """Test DOCX extraction functionality."""
    try:
        from docx import Document
        print("✓ python-docx imported successfully")
        
        # Test creating a document object
        print("DOCX extraction library is available and ready to use")
        return True
        
    except ImportError as e:
        print(f"✗ python-docx import failed: {e}")
        return False

def create_sample_files():
    """Create sample files for testing."""
    test_dir = Path(__file__).parent / "test_files"
    test_dir.mkdir(exist_ok=True)
    
    # Create sample text file
    sample_txt = test_dir / "sample.txt"
    with open(sample_txt, 'w', encoding='utf-8') as f:
        f.write("""Sample Course Content

This is a test document for the LexNormAI system.

Learning Objectives:
1. Understanding basic concepts
2. Practical application
3. Assessment and evaluation

Course Content:
The course covers fundamentals of data analysis, including:
- Data collection methods
- Statistical analysis techniques
- Visualization tools
- Report generation

This content should be processed by the AI system to identify relevant occupational standards.
""")
    
    print(f"✓ Created sample text file: {sample_txt}")
    
    # Create sample markdown file
    sample_md = test_dir / "sample.md"
    with open(sample_md, 'w', encoding='utf-8') as f:
        f.write("""# Software Development Course

## Course Overview
This course covers modern software development practices.

## Learning Outcomes
- Understand programming fundamentals
- Learn version control systems
- Master testing methodologies
- Deploy applications

## Technologies Covered
- Python programming
- Git and GitHub
- Testing frameworks
- Cloud deployment

## Assessment Methods
1. Coding assignments (40%)
2. Project work (40%)
3. Written examination (20%)
""")
    
    print(f"✓ Created sample markdown file: {sample_md}")
    return test_dir

def main():
    """Main test function."""
    print("LexNormAI File Processing Test")
    print("=" * 40)
    
    # Test library imports
    pdf_available = test_pdf_extraction()
    docx_available = test_docx_extraction()
    
    if not (pdf_available and docx_available):
        print("\n⚠ Some libraries are missing. Install them with:")
        print("pip install PyPDF2==3.0.1 python-docx==1.1.0")
        return False
    
    # Create sample files
    print("\nCreating sample test files...")
    test_dir = create_sample_files()
    
    print(f"\n✓ Test files created in: {test_dir}")
    print("\nNext steps:")
    print("1. Install missing dependencies if any")
    print("2. Start the FastAPI server: python run_server.py")
    print("3. Test file upload through the web interface")
    print("4. Upload the sample files created in the test_files directory")
    
    return True

if __name__ == "__main__":
    main() 