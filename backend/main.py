"""Main FastAPI application entry point"""
import os
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.config import CORS_ORIGINS, LOG_LEVEL, API_HOST, API_PORT, API_RELOAD
from backend.api.routes import router
from backend.api.auth import (
    auth_router,
    get_password_hash,
    DEFAULT_NOTIFICATION_PREFERENCES,
    _normalize_preferences,
)
from backend.database.db import engine, Base, SessionLocal
from backend.database.models import User, UserProfile

# Configure logging
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="JIREH UBA-LITE API",
    description="Log-Based Insider Threat Detection System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.on_event("startup")
def ensure_demo_user() -> None:
    """Create a default demo user if none exists.

    This avoids having to re-register after each redeploy or DB reset.
    Credentials (can be overridden via Render env vars):
      - username: DEMO_USERNAME (default: "demo")
      - email:    DEMO_EMAIL    (default: "demo@example.com")
      - password: DEMO_PASSWORD (default: "Demo1234!")
    """
    db: Session = SessionLocal()
    try:
        username = os.getenv("DEMO_USERNAME", "demo")
        email = os.getenv("DEMO_EMAIL", "demo@example.com")
        password = os.getenv("DEMO_PASSWORD", "Demo1234!")

        existing = db.query(User).filter(User.username == username).first()
        if existing:
            return

        hashed = get_password_hash(password)
        user = User(
            username=username,
            email=email,
            hashed_password=hashed,
            is_active=1,
            is_admin=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Initialize a basic profile with default notification preferences
        prefs = _normalize_preferences(DEFAULT_NOTIFICATION_PREFERENCES)
        profile = UserProfile(
            user_id=user.id,
            notification_preferences=prefs,
        )
        db.add(profile)
        db.commit()
        logger.info(
            "Demo user initialized: username='%s', email='%s'", username, email
        )
    except Exception as exc:  # pragma: no cover - best-effort helper
        logger.warning("Failed to initialize demo user: %s", exc)
    finally:
        db.close()


# Include API routes
app.include_router(auth_router, prefix="/api")
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "JIREH UBA-LITE API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "uba-lite-api"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=API_RELOAD
    )
