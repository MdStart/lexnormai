# LexNormAI

AI-powered course content tagging system that maps educational content to relevant occupation/labor code standards by country using LLM technology.

## 🚀 Features

- **AI-Powered Content Analysis**: Uses Google Gemini AI to analyze and summarize course content
- **Smart Mapping**: Maps course content to occupational standards (NOS, ISCO, SOC, etc.)
- **Multi-Country Support**: Configure different countries and their specific occupational standards
- **File Upload Support**: Supports text files, PDFs, and markdown documents
- **Interactive Dashboard**: Modern web interface built with Next.js and Tailwind CSS
- **Export Functionality**: Export mapping results to CSV format

## 🏗️ Architecture

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn UI** components
- **Lucide React** icons

### Backend
- **FastAPI** with Python
- **PostgreSQL** database
- **SQLAlchemy** ORM with Alembic migrations
- **Google Gemini API** for AI processing
- **Pydantic** for data validation

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **PostgreSQL** 12+
- **Google Gemini API key**

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lexnormai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env

# Edit .env with your configurations:
# - DATABASE_URL: Your PostgreSQL connection string
# - GEMINI_API_KEY: Your Google Gemini API key
# - Other settings as needed
```

### 3. Database Setup

You can set up the database using one of these methods:

#### Option A: Using SQL Script (Direct)
```bash
# Create database and tables using SQL script
psql -U your_username -h localhost -f scripts/create_tables.sql

# Or if you need to create the database first:
createdb lexnormai_db
psql -U your_username -d lexnormai_db -f scripts/create_tables.sql
```

#### Option B: Using Python Script (Recommended)
```bash
# Create database and tables using Python script
python scripts/create_database.py
```

#### Option C: Using Alembic Migrations
```bash
# Run database migrations
alembic upgrade head
```

#### Import Sample Data
```bash
# Import sample occupational standards
python scripts/import_standards.py
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python run_server.py
```

The backend API will be available at `http://localhost:8000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📖 Usage Guide

### 1. Configure Settings
- Navigate to **Settings** page
- Select your country (default: India)
- Choose occupational standard type (default: NOS-National Occupational Standard)
- Configure LLM model and custom prompts if needed

### 2. Upload Course Content
- Go to **Upload** page
- Upload text files, PDFs, or enter content manually
- Provide a descriptive title for your content

### 3. Generate AI Summaries
- Visit **Content** page to view all uploaded content
- Click the lightning bolt icon to generate AI summaries
- Summaries are required for mapping to standards

### 4. Map Content to Standards
- Navigate to **AI Mapping** page
- Select content with generated summary
- Choose settings configuration (optional)
- Run AI mapping to find relevant occupational standards
- Export results as CSV

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/lexnormai_db
GEMINI_API_KEY=your_gemini_api_key_here
APP_NAME=LexNormAI
DEBUG=True
SECRET_KEY=your_secret_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=uploads/
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=LexNormAI
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 📊 Database Schema

### Core Tables

- **course_content**: Stores uploaded course materials and AI-generated summaries
- **lex_norm_standard**: Contains occupational standards library (imported from CSV)
- **lexnorm_settings**: Configuration settings for AI mapping preferences

### Database Scripts

- `scripts/create_tables.sql`: SQL script to create all required tables
- `scripts/create_database.py`: Python script to create database and tables automatically
- `scripts/import_standards.py`: Script to import occupational standards from CSV

## 🧪 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation powered by FastAPI's automatic OpenAPI generation.

### Key Endpoints

- `POST /api/v1/content/upload` - Upload course content files
- `POST /api/v1/content/{id}/generate-summary` - Generate AI summary
- `POST /api/v1/mapping/map-content` - Map content to standards
- `GET /api/v1/settings/` - Manage configuration settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page for existing solutions
2. Create a new issue with detailed information about the problem
3. Include relevant logs and configuration details

## 🔮 Roadmap

- [ ] Support for additional LLM providers (OpenAI, Claude, etc.)
- [ ] Batch processing for multiple files
- [ ] Advanced analytics and reporting
- [ ] Integration with learning management systems
- [ ] Support for additional occupational standard formats
- [ ] Multi-language content support

---

**LexNormAI** - Bridging the gap between educational content and occupational standards through AI.
