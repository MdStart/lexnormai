from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://mdmacpro:@localhost:5432/lexnorm"
    
    # Google Gemini API
    gemini_api_key: str = "AIzaSyBcHooXTutezazNXzMxUyaRA3dDBQVW-Uc"
    
    # Application
    app_name: str = "LexNormAI"
    debug: bool = True
    secret_key: str = "12ru1v3fduy3fv3rc3"
    
    # CORS
    allowed_origins: List[str] = ["http://localhost:3001", "http://127.0.0.1:3001"]
    
    # Upload settings
    max_upload_size: int = 504857600  # 10MB
    upload_dir: str = "uploads/"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings() 