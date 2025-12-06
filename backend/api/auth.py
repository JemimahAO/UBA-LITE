"""
Authentication and authorization utilities and routes
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.database.db import get_db
from backend.database.models import User, UserProfile
import os
import shutil
from pathlib import Path
import uuid

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__default_rounds=12
)

BCRYPT_MAX_PASSWORD_LENGTH = 72  # bcrypt's internal limit

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

auth_router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_NOTIFICATION_PREFERENCES: Dict[str, bool] = {
    "high_risk_alerts": True,
    "training_updates": True,
    "system_updates": False,
}


# Schemas
class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool

    class Config:
        from_attributes = True


class UserAccountOut(UserOut):
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ProfileDetails(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class NotificationPreferences(BaseModel):
    high_risk_alerts: bool = True
    training_updates: bool = True
    system_updates: bool = False


class UserProfileOut(ProfileDetails):
    notification_preferences: NotificationPreferences = Field(default_factory=NotificationPreferences)
    updated_at: Optional[datetime] = None


class ProfileResponse(BaseModel):
    user: UserAccountOut
    profile: UserProfileOut


class ProfileUpdateRequest(ProfileDetails):
    email: Optional[EmailStr] = None


class PreferencesUpdateRequest(BaseModel):
    high_risk_alerts: Optional[bool] = None
    training_updates: Optional[bool] = None
    system_updates: Optional[bool] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str


# Helpers

def _truncate_password(password: str) -> str:
    if not isinstance(password, str):
        password = str(password)
    encoded = password.encode('utf-8')
    if len(encoded) > 72:
        encoded = encoded[:72]
        password = encoded.decode('utf-8', 'ignore')
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt with automatic truncation to 72 bytes."""
    # Convert to bytes and truncate if necessary
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > BCRYPT_MAX_PASSWORD_LENGTH:
        password_bytes = password_bytes[:BCRYPT_MAX_PASSWORD_LENGTH]
    
    # Verify using bcrypt directly
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt with automatic truncation to 72 bytes."""
    # Convert to bytes and truncate if necessary
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > BCRYPT_MAX_PASSWORD_LENGTH:
        password_bytes = password_bytes[:BCRYPT_MAX_PASSWORD_LENGTH]
    
    # Hash using bcrypt directly
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def _normalize_preferences(preferences: Optional[Dict[str, Any]]) -> Dict[str, bool]:
    normalized = {**DEFAULT_NOTIFICATION_PREFERENCES}
    if isinstance(preferences, dict):
        for key, value in preferences.items():
            if key in normalized:
                normalized[key] = bool(value)
    return normalized


def ensure_user_profile(db: Session, user: User) -> UserProfile:
    profile = user.profile
    if not profile:
        profile = UserProfile(
            user_id=user.id,
            notification_preferences=_normalize_preferences(DEFAULT_NOTIFICATION_PREFERENCES),
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        db.refresh(user)
    else:
        normalized = _normalize_preferences(profile.notification_preferences)
        if normalized != (profile.notification_preferences or {}):
            profile.notification_preferences = normalized
            db.add(profile)
            db.commit()
            db.refresh(profile)
    return profile


def build_profile_response(user: User, profile: Optional[UserProfile] = None) -> ProfileResponse:
    profile = profile or user.profile
    if not profile:
        raise ValueError("Profile not initialized for user")

    preferences = _normalize_preferences(profile.notification_preferences)

    return ProfileResponse(
        user=UserAccountOut(
            id=user.id,
            username=user.username,
            email=user.email,
            is_admin=bool(user.is_admin),
            is_active=bool(user.is_active),
            created_at=user.created_at,
        ),
        profile=UserProfileOut(
            full_name=profile.full_name,
            job_title=profile.job_title,
            department=profile.department,
            phone=profile.phone,
            location=profile.location,
            bio=profile.bio,
            avatar_url=profile.avatar_url,
            notification_preferences=NotificationPreferences(**preferences),
            updated_at=profile.updated_at,
        ),
    )


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user


# Routes
@auth_router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    raw_password = user_in.password or ""
    if len(raw_password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password cannot exceed 72 bytes in length. Please choose a shorter password.",
        )

    if db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=1,
        is_admin=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = UserProfile(
        user_id=user.id,
        notification_preferences=_normalize_preferences(DEFAULT_NOTIFICATION_PREFERENCES),
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer", user=user)


@auth_router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer", user=user)


@auth_router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@auth_router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = ensure_user_profile(db, current_user)
    db.refresh(current_user)
    db.refresh(profile)
    return build_profile_response(current_user, profile)


@auth_router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = ensure_user_profile(db, current_user)

    if payload.email and payload.email != current_user.email:
        existing_user = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = payload.email

    for field in [
        "full_name",
        "job_title",
        "department",
        "phone",
        "location",
        "bio",
        "avatar_url",
    ]:
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)

    db.add(current_user)
    db.add(profile)
    db.commit()
    db.refresh(current_user)
    db.refresh(profile)

    return build_profile_response(current_user, profile)


@auth_router.patch("/profile/preferences", response_model=ProfileResponse)
async def update_preferences(
    payload: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = ensure_user_profile(db, current_user)

    updated_preferences = _normalize_preferences(profile.notification_preferences)

    for key in ["high_risk_alerts", "training_updates", "system_updates"]:
        value = getattr(payload, key)
        if value is not None:
            updated_preferences[key] = bool(value)

    profile.notification_preferences = updated_preferences
    db.add(profile)
    db.commit()
    db.refresh(current_user)
    db.refresh(profile)

    return build_profile_response(current_user, profile)


@auth_router.post("/profile/change-password")
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=400, detail="New password confirmation does not match")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return {"message": "Password updated successfully"}


UPLOAD_DIR = Path("uploads/avatars")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@auth_router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload user avatar image"""
    # Create upload directory if it doesn't exist
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate unique filename
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Update user profile with avatar URL
    profile = ensure_user_profile(db, current_user)
    avatar_url = f"/uploads/avatars/{unique_filename}"
    
    # Delete old avatar file if exists
    if profile.avatar_url:
        old_file = Path(profile.avatar_url.lstrip("/"))
        if old_file.exists():
            try:
                old_file.unlink()
            except Exception:
                pass  # Ignore errors deleting old file

    profile.avatar_url = avatar_url
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
