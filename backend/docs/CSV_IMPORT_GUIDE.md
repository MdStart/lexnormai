# CSV Import Guide for LexNormAI

This guide explains how to import occupational standards data from CSV files into the LexNormAI system.

## 📋 Supported CSV Formats

The import script supports two CSV formats:

### 1. Standard Format
Each row contains complete data for all columns:

```csv
Job Role,NOS Code,NOS Name,PC code,PC Description
Software Developer,SSC/N0515,Develop Software Applications,PC1.,Understand requirements and design
Software Developer,SSC/N0515,Develop Software Applications,PC2.,Write clean and efficient code
Data Analyst,SSC/N1703,Analyze and Interpret Data,PC1.,Collect and organize data
Data Analyst,SSC/N1703,Analyze and Interpret Data,PC2.,Apply statistical methods
```

### 2. Hierarchical Format
Job Role, NOS Code, and NOS Name are only filled when they change:

```csv
Job Role,NOS Code,NOS Name,PC code,PC Description
Software Developer,SSC/N0515,Develop Software Applications,PC1.,Understand requirements and design
,,,PC2.,Write clean and efficient code
,,,PC3.,Test applications for functionality
Data Analyst,SSC/N1703,Analyze and Interpret Data,PC1.,Collect and organize data
,,,PC2.,Apply statistical methods
```

## 🔧 Required Columns

The CSV file must contain these exact column headers:

- **Job Role**: The occupation or job title
- **NOS Code**: National Occupational Standard code
- **NOS Name**: Name/title of the standard
- **PC code**: Performance Criteria code
- **PC Description**: Description of the performance criteria

## 🚀 How to Import

### Basic Import
```bash
cd backend
python scripts/import_standards.py --file_path ../data/course_mapping_library.csv
```
This imports the default sample CSV file.

### Custom CSV Import
```bash
python scripts/import_standards.py --file_path path/to/your/file.csv
```

### Import with Full Path
```bash
python scripts/import_standards.py --file_path /full/path/to/your/file.csv
```

### Get Help
```bash
python scripts/import_standards.py --help
```

## 🔍 Features

### Automatic Data Cleaning
- **Forward Filling**: Missing values in hierarchical format are automatically filled
- **Whitespace Trimming**: Leading/trailing spaces are removed
- **Duplicate Removal**: Duplicate records are automatically detected and removed
- **Encoding Detection**: Automatically tries multiple encodings (UTF-8, Latin-1, CP1252, ISO-8859-1)

### Data Validation
- **Required Fields**: Ensures all critical fields are present
- **Empty Value Detection**: Identifies and reports empty or invalid values
- **Structure Validation**: Validates CSV structure and column headers

### Error Handling
- **Row-level Errors**: Skips invalid rows and continues processing
- **Detailed Logging**: Shows progress and detailed error messages
- **Rollback Protection**: Database rollback on critical errors

## 📊 Verification

After importing, verify your data:

```bash
python scripts/verify_import.py
```

This will show:
- Total number of records imported
- Breakdown by job roles and NOS codes
- Sample of imported data
- Data quality checks
- Duplicate detection results

## 📝 Example CSV Files

### Complete Example (Hierarchical Format)
```csv
Job Role,NOS Code,NOS Name,PC code,PC Description
"Data Quality Analyst,Business Intelligence Analyst,Data Scientist",SSC/N8101,Import data as per specifications,PC1.,identify the objective of the analysis
,,,PC2.,define the type of data to be imported
,,,PC3.,define the volume of data to be imported
Software Developer,SSC/N0515,Develop Software Applications,PC1.,understand software requirements
,,,PC2.,write clean and efficient code
,,,PC3.,test software applications
```

### Tips for CSV Preparation

1. **Use Quotes for Multi-value Fields**: If a job role contains commas, wrap it in quotes
2. **Consistent Naming**: Use consistent naming conventions for job roles and codes
3. **Complete PC Descriptions**: Ensure performance criteria descriptions are meaningful
4. **No Special Characters**: Avoid special characters that might cause encoding issues

## 🛠️ Troubleshooting

### Common Issues

**"CSV file not found"**
- Check the file path is correct
- Ensure the file exists and is accessible
- Use absolute paths if relative paths don't work

**"Missing required columns"**
- Verify column headers match exactly: Job Role, NOS Code, NOS Name, PC code, PC Description
- Check for extra spaces in column headers
- Ensure CSV uses commas as separators

**"Encoding errors"**
- Save your CSV as UTF-8 encoding
- If using Excel, use "CSV UTF-8" format when saving

**"Empty or invalid data"**
- Check for completely empty rows
- Ensure at least the first row of each job role group has complete data
- Remove any extra commas at the end of rows

### Getting Help

If you encounter issues:

1. Check the import logs for specific error messages
2. Run the verification script to check data quality
3. Use a smaller sample CSV file to test first
4. Ensure your database connection is working

## 📈 Best Practices

1. **Backup First**: Always backup your database before importing new data
2. **Test with Samples**: Test with a small sample CSV first
3. **Verify Results**: Always run the verification script after import
4. **Clean Data**: Pre-clean your CSV data to avoid import errors
5. **Use Hierarchical Format**: Use hierarchical format for better readability when you have many PC entries per NOS

## 🔄 Re-importing Data

The import script automatically clears existing data before importing new data. This means:
- Each import replaces all existing standards
- If you want to add data, merge it with existing CSV first
- Consider backing up your data before re-importing

---

For more help, see the main README.md or check the API documentation at `http://localhost:8000/docs` when the server is running. 