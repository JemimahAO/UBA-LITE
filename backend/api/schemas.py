"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


# ============ Log Upload Schemas ============
class LogUploadRequest(BaseModel):
    """Request schema for uploading logs"""
    log_type: str = Field(..., description="Type of log (e.g., 'large_file_transfer')")
    logs: List[Dict[str, Any]] = Field(..., description="List of log entries")


class LogUploadResponse(BaseModel):
    """Response schema for log upload"""
    message: str
    log_type: str
    count: int
    log_ids: List[int]


# ============ Model Training Schemas ============
class TrainModelRequest(BaseModel):
    """Request schema for training a model"""
    model_name: str = Field(..., description="Name/type of model to train")
    log_type: str = Field(..., description="Type of logs to train on")
    contamination: Optional[float] = Field(0.1, description="Contamination parameter")
    n_estimators: Optional[int] = Field(100, description="Number of estimators")


class TrainModelResponse(BaseModel):
    """Response schema for model training"""
    message: str
    model_name: str
    model_path: str
    training_data_count: int
    trained_at: datetime


# ============ Anomaly Detection Schemas ============
class DetectAnomaliesRequest(BaseModel):
    """Request schema for detecting anomalies"""
    model_name: str = Field(..., description="Name of trained model to use")
    logs: List[Dict[str, Any]] = Field(..., description="Logs to analyze")


class AnomalyResult(BaseModel):
    """Individual anomaly result"""
    log_data: Dict[str, Any]
    anomaly_score: float
    is_anomaly: bool
    risk_level: str
    risk_score: float
    explanation: Optional[str] = None


class DetectAnomaliesResponse(BaseModel):
    """Response schema for anomaly detection"""
    message: str
    total_logs: int
    anomalies_found: int
    results: List[AnomalyResult]


class DetectStoredLogsRequest(BaseModel):
    """Request schema for running detection against stored logs"""
    log_type: str = Field(..., description="Type of logs to analyze")
    model_name: Optional[str] = Field(None, description="Specific trained model to use (defaults to log_type)")
    contamination: Optional[float] = Field(0.1, description="Fallback contamination when training a model")
    n_estimators: Optional[int] = Field(100, description="Fallback number of estimators when training a model")
    all_models: Optional[bool] = Field(
        False,
        description="If true, run detection across all available models instead of a single model.",
    )


class DetectStoredLogsResponse(BaseModel):
    """Response schema for stored log detection runs"""
    message: str
    total_logs: int
    anomalies_found: int
    model_name: str
    processed_files: int


# ============ Results Retrieval Schemas ============
class DetectionResultSchema(BaseModel):
    """Schema for detection result"""
    id: int
    log_entry_id: int
    model_type: str
    anomaly_score: float
    is_anomaly: int
    risk_level: str
    risk_score: float
    detected_at: datetime

    class Config:
        from_attributes = True


class GetResultsResponse(BaseModel):
    """Response schema for getting results"""
    total: int
    results: List[DetectionResultSchema]


class DetectionSessionSchema(BaseModel):
    """Aggregated detection session info returned to clients"""
    session_id: int
    log_entry_id: int
    detected_at: datetime
    file_name: str
    model_type: str
    anomaly_count: int
    total_events: int
    risk_high: int
    risk_medium: int
    risk_low: int
    risk_average: float
    description: str
    status: str
    notes: Optional[str] = None
    anomalies: List[DetectionResultSchema]


class DetectionSessionsResponse(BaseModel):
    """Response for listing detection sessions"""
    total: int
    sessions: List[DetectionSessionSchema]


class DetectionStatusUpdateRequest(BaseModel):
    """Update detection session status"""
    status: str
    notes: Optional[str] = None


class DetectionStatusUpdateResponse(BaseModel):
    """Response after updating a detection session status"""
    session: DetectionSessionSchema


class DetectionReportResponse(BaseModel):
    """Response after requesting report generation"""
    report_id: int
    session_id: int
    file_path: str
    created_at: datetime
    message: str


# ============ Model Management Schemas ============
class ModelInfo(BaseModel):
    """Information about a trained model"""
    id: int
    model_name: str
    model_type: str
    training_data_count: int
    trained_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class GetModelsResponse(BaseModel):
    """Response schema for listing models"""
    total: int
    models: List[ModelInfo]


# ============ Health Check Schema ============
class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    timestamp: datetime


# ============ Analytics Schemas ============
class AnalyticsStatsResponse(BaseModel):
    """Aggregate statistics for dashboard"""
    total_users: int
    total_logs: int
    total_detections: int
    anomalies_detected: int
    high_risk_users: int
    models_trained: int
    anomalies_past_week: int


class TrendPoint(BaseModel):
    """Time-series point for anomalies vs normal activities"""
    date: str
    anomalies: int
    normal: int


class AnalyticsTrendsResponse(BaseModel):
    """Response for anomalies trend over time"""
    range_days: int
    points: List[TrendPoint]


class UserRiskScore(BaseModel):
    """Aggregated risk metrics per user"""
    user_id: str
    total_events: int
    anomalies: int
    high_risk_events: int
    last_seen: Optional[datetime]
    risk_score: float


class UserRiskScoresResponse(BaseModel):
    """Response containing per-user risk scores"""
    total_users: int
    items: List[UserRiskScore]


# ============ File Upload Response ============
class FileUploadResponse(BaseModel):
    """Response for file upload"""
    message: str
    filename: str
    log_type: str
    rows_processed: int
    log_ids: List[int]
