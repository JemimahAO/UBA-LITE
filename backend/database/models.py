"""
Database models for UBA-Lite
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.database.db import Base


class LogEntry(Base):
    """Store uploaded log entries"""
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    log_type = Column(String, index=True)  # e.g., 'large_file_transfer', 'file_access'
    data = Column(JSON)  # Store the full log data as JSON
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to detection results
    detection_results = relationship("DetectionResult", back_populates="log_entry")


class DetectionResult(Base):
    """Store anomaly detection results"""
    __tablename__ = "detection_results"

    id = Column(Integer, primary_key=True, index=True)
    log_entry_id = Column(Integer, ForeignKey("log_entries.id"))
    model_type = Column(String, index=True)
    anomaly_score = Column(Float)
    is_anomaly = Column(Integer)  # -1 for anomaly, 1 for normal
    risk_level = Column(String)  # 'low', 'medium', 'high'
    risk_score = Column(Float)
    explanation = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to log entry
    log_entry = relationship("LogEntry", back_populates="detection_results")


class TrainedModel(Base):
    """Store metadata about trained models"""
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True)
    model_type = Column(String)  # e.g., 'isolation_forest'
    model_path = Column(String)  # Path to serialized model file
    training_data_count = Column(Integer)
    contamination = Column(Float)
    n_estimators = Column(Integer)
    accuracy_metrics = Column(JSON, nullable=True)
    trained_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)  # 1 for active, 0 for inactive


class DetectionSessionStatus(Base):
    """Track manual status updates for detection sessions"""
    __tablename__ = "detection_session_statuses"

    session_id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="Investigating")
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DetectionReport(Base):
    """PDF report references for detection sessions"""
    __tablename__ = "detection_reports"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class UploadedFile(Base):
    """Track all uploaded files"""
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    log_type = Column(String)
    rows_processed = Column(Integer)
    file_size = Column(Integer)  # in bytes
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="uploaded")  # uploaded, processed, failed


class User(Base):
    """User authentication (optional for later)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Integer, default=1)
    is_admin = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class UserProfile(Base):
    """Extended user profile details and preferences"""
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    department = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    notification_preferences = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")
