"""
Configuration settings for UBA-Lite application
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/uba_lite.db")

# Model storage directory
MODELS_DIR = BASE_DIR / "backend" / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Data directory
DATA_DIR = BASE_DIR / "data"

# Upload settings
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# Reports directory
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# ML Model settings
MODEL_CONTAMINATION = 0.1  # Isolation Forest contamination parameter
MODEL_N_ESTIMATORS = 100

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000
API_RELOAD = True

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# CORS settings - read from environment or use defaults
_cors_env = os.getenv("CORS_ORIGINS", "")
if _cors_env:
    CORS_ORIGINS = [origin.strip() for origin in _cors_env.split(",") if origin.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternate port)
        "http://localhost:8000",
        "http://localhost:8002",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        "*",  # Allow all during development
    ]

# Logging
LOG_LEVEL = "INFO"
