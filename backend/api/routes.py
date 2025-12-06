"""
API routes for JIREH UBA-LITE
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
import pandas as pd
import json
import joblib
from datetime import datetime, timedelta
from pathlib import Path

from backend.api.schemas import (
    LogUploadRequest, LogUploadResponse,
    TrainModelRequest, TrainModelResponse,
    DetectAnomaliesRequest, DetectAnomaliesResponse, AnomalyResult,
    DetectStoredLogsRequest, DetectStoredLogsResponse,
    GetResultsResponse, GetModelsResponse, FileUploadResponse,
    AnalyticsStatsResponse, AnalyticsTrendsResponse, UserRiskScoresResponse,
    DetectionSessionsResponse, DetectionSessionSchema,
    DetectionStatusUpdateRequest, DetectionStatusUpdateResponse,
    DetectionReportResponse
)
from backend.database.db import get_db
from backend.database.models import LogEntry, DetectionResult, TrainedModel, DetectionSessionStatus, DetectionReport, UploadedFile, User
from backend.ml.training import train_model_for_type, detect_anomalies_with_model, get_available_model_types
from backend.config import MODELS_DIR, UPLOAD_DIR, REPORTS_DIR
from backend.utils.file_parser import parse_uploaded_file, get_supported_formats
from backend.api.auth import get_current_user

router = APIRouter()


def _upsert_trained_model(
    db: Session,
    model_name: str,
    model_path: Path,
    training_data_count: int,
    contamination: float,
    n_estimators: int,
):
    """Create or update a TrainedModel row for a given model_name.

    This prevents UNIQUE constraint errors when retraining an existing model
    or when auto-training from detection flows.
    """
    now = datetime.utcnow()
    existing = db.query(TrainedModel).filter_by(model_name=model_name).first()

    if existing:
        existing.model_type = "isolation_forest"
        existing.model_path = str(model_path)
        existing.training_data_count = training_data_count
        existing.contamination = contamination
        existing.n_estimators = n_estimators
        existing.trained_at = now
        existing.is_active = 1
        db.commit()
        db.refresh(existing)
        return existing

    trained_model = TrainedModel(
        model_name=model_name,
        model_type="isolation_forest",
        model_path=str(model_path),
        training_data_count=training_data_count,
        contamination=contamination,
        n_estimators=n_estimators,
        trained_at=now,
        is_active=1,
    )
    db.add(trained_model)
    db.commit()
    db.refresh(trained_model)
    return trained_model


def _serialize_detection_result(result: DetectionResult) -> dict:
    return {
        "id": result.id,
        "log_entry_id": result.log_entry_id,
        "model_type": result.model_type,
        "anomaly_score": result.anomaly_score,
        "is_anomaly": result.is_anomaly,
        "risk_level": result.risk_level,
        "risk_score": result.risk_score,
        "detected_at": result.detected_at,
    }


def _extract_file_name(log_entry: LogEntry) -> str:
    data = log_entry.data if isinstance(log_entry.data, dict) else {}
    if data:
        for key in ("file_name", "filename", "source_file", "file", "name"):
            value = data.get(key)
            if value:
                return str(value)
    return f"Log Entry #{log_entry.id}"


def _build_session_payload(
    session_id: int,
    log_entry: LogEntry,
    results: List[DetectionResult],
    status_row: Optional[DetectionSessionStatus],
) -> dict:
    if not results:
        return {
            "session_id": session_id,
            "log_entry_id": log_entry.id,
            "detected_at": log_entry.created_at,
            "file_name": _extract_file_name(log_entry),
            "model_type": log_entry.log_type or "unknown",
            "anomaly_count": 0,
            "total_events": 0,
            "risk_high": 0,
            "risk_medium": 0,
            "risk_low": 0,
            "risk_average": 0.0,
            "description": "No anomalies recorded.",
            "status": status_row.status if status_row else "Investigating",
            "notes": status_row.notes if status_row else None,
            "anomalies": [],
        }

    anomalies = [result for result in results if result.is_anomaly == -1]
    total_events = len(results)
    anomaly_count = len(anomalies)
    risk_counts = {"high": 0, "medium": 0, "low": 0}
    for result in anomalies:
        level = (result.risk_level or "").lower()
        if level in risk_counts:
            risk_counts[level] += 1

    risk_average = 0.0
    if anomaly_count:
        risk_average = round(
            sum(result.risk_score or 0 for result in anomalies) / anomaly_count,
            2,
        )

    detected_at = max((result.detected_at for result in results if result.detected_at), default=log_entry.created_at)
    model_type = results[0].model_type or log_entry.log_type or "unknown"

    description = (
        f"Detected {anomaly_count} anomalies across {total_events} events using {model_type}."
        if anomaly_count
        else f"No anomalies flagged for {model_type}."
    )

    return {
        "session_id": session_id,
        "log_entry_id": log_entry.id,
        "detected_at": detected_at,
        "file_name": _extract_file_name(log_entry),
        "model_type": model_type,
        "anomaly_count": anomaly_count,
        "total_events": total_events,
        "risk_high": risk_counts["high"],
        "risk_medium": risk_counts["medium"],
        "risk_low": risk_counts["low"],
        "risk_average": risk_average,
        "description": description,
        "status": status_row.status if status_row else "Investigating",
        "notes": status_row.notes if status_row else None,
        "anomalies": [_serialize_detection_result(result) for result in anomalies],
    }


def _load_session_data(db: Session, session_id: int):
    rows = (
        db.query(DetectionResult, LogEntry)
        .join(LogEntry, DetectionResult.log_entry_id == LogEntry.id)
        .filter(LogEntry.id == session_id)
        .order_by(DetectionResult.detected_at.desc())
        .all()
    )

    if not rows:
        return None

    log_entry = rows[0][1]
    results = [row[0] for row in rows]
    return log_entry, results


def _assemble_sessions(db: Session, user_id: Optional[int] = None) -> List[dict]:
    query = (
        db.query(DetectionResult, LogEntry)
        .join(LogEntry, DetectionResult.log_entry_id == LogEntry.id)
    )
    
    if user_id is not None:
        # Filter by user's uploaded files
        query = query.join(
            UploadedFile,
            (UploadedFile.log_type == LogEntry.log_type) & (UploadedFile.uploaded_by == user_id)
        ).distinct()
    
    rows = query.order_by(DetectionResult.detected_at.desc()).all()

    if not rows:
        return []

    status_map = {
        status.session_id: status
        for status in db.query(DetectionSessionStatus).all()
    }

    grouped: dict[int, dict[str, object]] = {}
    for result, log_entry in rows:
        session_id = log_entry.id
        bucket = grouped.setdefault(session_id, {"log_entry": log_entry, "results": []})
        bucket["results"].append(result)

    sessions = [
        _build_session_payload(session_id, data["log_entry"], data["results"], status_map.get(session_id))
        for session_id, data in grouped.items()
    ]

    sessions.sort(key=lambda payload: payload["detected_at"], reverse=True)
    return sessions


def _dump_report_file(session_id: int, payload: dict) -> Path:
    REPORTS_DIR.mkdir(exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_path = REPORTS_DIR / f"detection_report_{session_id}_{timestamp}.json"
    with open(file_path, "w", encoding="utf-8") as report_file:
        json.dump(payload, report_file, default=lambda o: o.isoformat() if isinstance(o, datetime) else str(o), indent=2)
    return file_path


# ============ Utility Endpoints ============
@router.get("/supported_formats")
async def get_supported_file_formats():
    """
    Get list of supported file formats for upload
    Used to populate dropdown in frontend
    """
    return {
        "formats": get_supported_formats(),
        "descriptions": {
            "csv": "Comma-separated values (.csv)",
            "json": "JSON array or JSON lines (.json, .jsonl)",
            "log": "Log files (.log)",
            "txt": "Text files (.txt)",
            "tsv": "Tab-separated values (.tsv)",
            "ndjson": "Newline-delimited JSON (.ndjson)"
        }
    }


@router.get("/log_types")
async def get_available_log_types():
    """
    Get list of available log/threat types
    Used to populate dropdown in frontend
    """
    log_types = get_available_model_types()
    
    return {
        "log_types": log_types,
        "descriptions": {
            "large_file_transfer": "Large File Transfer Detection",
            "file_access": "Unauthorized File Access",
            "database_access": "Database Access Anomalies",
            "privileged_access": "Privileged Access Misuse",
            "legacy_system_access": "Legacy System Access",
            "department_access": "Cross-Departmental Access",
            "unauthorized_software": "Unauthorized Software Installation",
            "hacking_tools": "Hacking Tools Usage",
            "command_line_access": "Suspicious Command Line Activity",
            "mass_deletion": "Mass File Deletion",
            "security_log_modification": "Security Log Tampering",
            "database_record_alteration": "Database Record Alteration"
        }
    }


# ============ Log Upload Endpoints ============
@router.post("/upload_logs", response_model=LogUploadResponse)
async def upload_logs(request: LogUploadRequest, db: Session = Depends(get_db)):
    """
    Upload logs via JSON
    """
    log_ids = []
    
    for log in request.logs:
        log_entry = LogEntry(
            user_id=log.get("user_id"),
            log_type=request.log_type,
            data=log,
            timestamp=datetime.fromisoformat(log.get("timestamp")) if log.get("timestamp") else datetime.utcnow()
        )
        db.add(log_entry)
        db.flush()
        log_ids.append(log_entry.id)
    
    db.commit()
    
    return LogUploadResponse(
        message="Logs uploaded successfully",
        log_type=request.log_type,
        count=len(request.logs),
        log_ids=log_ids
    )


@router.post("/upload_file", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    log_type: str = Query(..., description="Type of log"),
    file_format: Optional[str] = Query(None, description="File format (auto-detect if not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload logs via CSV, JSON, .log, .txt, or other supported formats
    
    Supported formats: csv, json, log, txt, tsv, jsonl, ndjson
    """
    try:
        # Save file temporarily
        file_path = UPLOAD_DIR / file.filename
        file_size = 0
        with open(file_path, "wb") as f:
            content = await file.read()
            file_size = len(content)
            f.write(content)
        
        # Parse file using enhanced parser
        df = parse_uploaded_file(file_path, file_format)
        
        # Store in database
        log_ids = []
        for _, row in df.iterrows():
            log_entry = LogEntry(
                user_id=row.get("user_id", "unknown"),
                log_type=log_type,
                data=row.to_dict(),
                timestamp=pd.to_datetime(row.get("timestamp")) if "timestamp" in row else datetime.utcnow()
            )
            db.add(log_entry)
            db.flush()
            log_ids.append(log_entry.id)
        
        # Track uploaded file
        uploaded_file = UploadedFile(
            filename=file.filename,
            log_type=log_type,
            rows_processed=len(df),
            file_size=file_size,
            uploaded_by=current_user.id,
            uploaded_at=datetime.utcnow(),
            status="uploaded"
        )
        db.add(uploaded_file)
        
        db.commit()
        
        return FileUploadResponse(
            message="File uploaded successfully",
            filename=file.filename,
            log_type=log_type,
            rows_processed=len(df),
            log_ids=log_ids
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/uploaded_files")
async def get_uploaded_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of uploaded files for the current user"""
    try:
        from backend.database.models import UploadedFile
        files = (
            db.query(UploadedFile)
            .filter_by(uploaded_by=current_user.id)
            .order_by(UploadedFile.uploaded_at.desc())
            .all()
        )
        
        return {
            "files": [
                {
                    "id": f.id,
                    "filename": f.filename,
                    "log_type": f.log_type,
                    "rows_processed": f.rows_processed,
                    "file_size": f.file_size,
                    "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                    "status": f.status
                }
                for f in files
            ],
            "total": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching files: {str(e)}")


@router.post("/detect/logs", response_model=DetectStoredLogsResponse)
async def detect_stored_logs(request: DetectStoredLogsRequest, db: Session = Depends(get_db)):
    """Run anomaly detection against stored logs for a given log type.

    Supports either a single model (default behaviour) or, when
    ``all_models`` is true, runs detection across all available
    model types defined in the ML training module.
    """
    try:
        # Fetch logs for detection (shared for all models)
        logs = db.query(LogEntry).filter_by(log_type=request.log_type).all()
        if not logs:
            raise HTTPException(status_code=404, detail=f"No logs found for type: {request.log_type}")

        df_base = pd.DataFrame([log.data for log in logs])
        df_base = df_base.dropna(how="all")
        numeric_columns = df_base.select_dtypes(include=["float64", "int64"]).columns
        df_base[numeric_columns] = df_base[numeric_columns].fillna(0)
        string_columns = df_base.select_dtypes(include=["object"]).columns
        for col in string_columns:
            df_base[col] = df_base[col].fillna("unknown")

        if df_base.empty:
            raise HTTPException(status_code=400, detail="No valid data after cleaning.")

        log_ids = [log.id for log in logs]

        # Decide which models to run
        if getattr(request, "all_models", False):
            model_names = get_available_model_types()
            # When requesting all models, clear previous results for these logs
            if log_ids:
                db.query(DetectionResult).filter(DetectionResult.log_entry_id.in_(log_ids)).delete(
                    synchronize_session=False
                )
        else:
            model_name = request.model_name or request.log_type
            model_names = [model_name]

        total_anomalies = 0
        total_results = 0
        per_model_stats = {}
        last_model_name = None

        for model_name in model_names:
            try:
                trained_model = (
                    db.query(TrainedModel)
                    .filter_by(model_name=model_name, is_active=1)
                    .first()
                )

                if not trained_model:
                    # Train a model for this type if one does not exist yet
                    df_train = df_base.copy()
                    model = train_model_for_type(
                        df_train,
                        model_name,
                        contamination=request.contamination or 0.1,
                        n_estimators=request.n_estimators or 100,
                    )

                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    model_filename = f"{model_name}_{timestamp}.pkl"
                    model_path = MODELS_DIR / model_filename
                    joblib.dump(model, model_path)

                    trained_model = _upsert_trained_model(
                        db,
                        model_name=model_name,
                        model_path=model_path,
                        training_data_count=len(df_train),
                        contamination=request.contamination or 0.1,
                        n_estimators=request.n_estimators or 100,
                    )

                model = joblib.load(trained_model.model_path)

                # Work on a copy for this specific model
                df = df_base.copy()

                results_df = detect_anomalies_with_model(model, df, trained_model.model_name)

                # For single-model runs, clear previous results for just this model/log set
                if log_ids and not getattr(request, "all_models", False):
                    db.query(DetectionResult).filter(
                        DetectionResult.log_entry_id.in_(log_ids),
                        DetectionResult.model_type == trained_model.model_name,
                    ).delete(synchronize_session=False)

                anomalies_count_model = 0
                total_results_model = 0

                for index, row in results_df.iterrows():
                    log_entry = logs[index]
                    anomaly_score = float(row.get("anomaly_score", 0) or 0)
                    is_anomaly = int(row.get("anomaly", 1))

                    if is_anomaly == -1:
                        anomalies_count_model += 1

                    if anomaly_score < -0.5:
                        risk_level = "high"
                        risk_score = 0.9
                    elif anomaly_score < -0.2:
                        risk_level = "medium"
                        risk_score = 0.6
                    else:
                        risk_level = "low"
                        risk_score = 0.3

                    detection_result = DetectionResult(
                        log_entry_id=log_entry.id,
                        model_type=trained_model.model_name,
                        anomaly_score=anomaly_score,
                        is_anomaly=is_anomaly,
                        risk_level=risk_level,
                        risk_score=risk_score,
                        explanation=row.get("explanation"),
                    )
                    db.add(detection_result)
                    total_results_model += 1

                if total_results_model:
                    per_model_stats[trained_model.model_name] = {
                        "total": total_results_model,
                        "anomalies": anomalies_count_model,
                    }

                total_anomalies += anomalies_count_model
                total_results += total_results_model
                last_model_name = trained_model.model_name

            except Exception:
                # If one model fails, skip it but continue with others
                continue

        # Update uploaded files status
        processed_files = (
            db.query(UploadedFile)
            .filter_by(log_type=request.log_type, status="uploaded")
            .update({"status": "processed"})
        )

        db.commit()

        if getattr(request, "all_models", False):
            if per_model_stats:
                summary_parts = [
                    f"{name} ({stats['anomalies']} / {stats['total']} anomalies)"
                    for name, stats in per_model_stats.items()
                ]
                message = (
                    "Detection completed across multiple models: "
                    + "; ".join(summary_parts)
                )
            else:
                message = "Detection completed across multiple models with no usable results."

            model_name_field = "multiple"
        else:
            message = "Detection completed"
            model_name_field = last_model_name or (request.model_name or request.log_type)

        return DetectStoredLogsResponse(
            message=message,
            total_logs=total_results,
            anomalies_found=total_anomalies,
            model_name=model_name_field,
            processed_files=processed_files or 0,
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error running detection: {exc}")


# ============ Model Training Endpoints ============
@router.post("/train_model", response_model=TrainModelResponse)
async def train_model(request: TrainModelRequest, db: Session = Depends(get_db)):
    """
    Train a machine learning model on uploaded logs
    """
    try:
        # Fetch logs from database
        logs = db.query(LogEntry).filter_by(log_type=request.log_type).all()
        
        if not logs:
            raise HTTPException(status_code=404, detail=f"No logs found for type: {request.log_type}")
        
        # Convert to DataFrame
        df = pd.DataFrame([log.data for log in logs])
        
        # Clean data: handle NaN values
        # Drop rows with all NaN values
        df = df.dropna(how='all')
        
        # Fill remaining NaN values with appropriate defaults
        # For numeric columns, fill with 0
        numeric_columns = df.select_dtypes(include=['float64', 'int64']).columns
        df[numeric_columns] = df[numeric_columns].fillna(0)
        
        # For string columns, fill with empty string or 'unknown'
        string_columns = df.select_dtypes(include=['object']).columns
        for col in string_columns:
            df[col] = df[col].fillna('unknown')
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid data after cleaning. Please check your log file format.")
        
        # Train model
        model = train_model_for_type(
            df,
            request.model_name,
            contamination=request.contamination,
            n_estimators=request.n_estimators,
        )

        # Save model
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_filename = f"{request.model_name}_{timestamp}.pkl"
        model_path = MODELS_DIR / model_filename
        joblib.dump(model, model_path)

        # Store or update model metadata (upsert to avoid UNIQUE constraint errors)
        trained_model = _upsert_trained_model(
            db,
            model_name=request.model_name,
            model_path=model_path,
            training_data_count=len(df),
            contamination=request.contamination,
            n_estimators=request.n_estimators,
        )

        return TrainModelResponse(
            message=f"Model '{request.model_name}' trained successfully",
            model_name=request.model_name,
            model_path=str(model_path),
            training_data_count=len(df),
            trained_at=trained_model.trained_at
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")


# ============ Anomaly Detection Endpoints ============
@router.post("/detect_anomalies", response_model=DetectAnomaliesResponse)
async def detect_anomalies(request: DetectAnomaliesRequest, db: Session = Depends(get_db)):
    """
    Detect anomalies in provided logs using a trained model
    """
    try:
        # Load model
        trained_model = db.query(TrainedModel).filter_by(model_name=request.model_name, is_active=1).first()
        
        if not trained_model:
            raise HTTPException(status_code=404, detail=f"Model '{request.model_name}' not found or inactive")
        
        model = joblib.load(trained_model.model_path)
        
        # Convert logs to DataFrame
        df = pd.DataFrame(request.logs)
        
        # Clean data: handle NaN values (same as training)
        df = df.dropna(how='all')
        numeric_columns = df.select_dtypes(include=['float64', 'int64']).columns
        df[numeric_columns] = df[numeric_columns].fillna(0)
        string_columns = df.select_dtypes(include=['object']).columns
        for col in string_columns:
            df[col] = df[col].fillna('unknown')
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid data after cleaning.")
        
        # Detect anomalies
        results_df = detect_anomalies_with_model(model, df, request.model_name)
        
        # Process results
        anomaly_results = []
        anomalies_count = 0
        
        for idx, row in results_df.iterrows():
            is_anomaly = row['anomaly'] == -1
            if is_anomaly:
                anomalies_count += 1
            
            # Calculate risk level
            anomaly_score = row.get('anomaly_score', 0)
            if anomaly_score < -0.5:
                risk_level = "high"
                risk_score = 0.9
            elif anomaly_score < -0.2:
                risk_level = "medium"
                risk_score = 0.6
            else:
                risk_level = "low"
                risk_score = 0.3
            
            anomaly_results.append(AnomalyResult(
                log_data=row.to_dict(),
                anomaly_score=float(anomaly_score) if pd.notna(anomaly_score) else 0.0,
                is_anomaly=is_anomaly,
                risk_level=risk_level,
                risk_score=risk_score
            ))
        
        return DetectAnomaliesResponse(
            message="Anomaly detection completed",
            total_logs=len(request.logs),
            anomalies_found=anomalies_count,
            results=anomaly_results
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting anomalies: {str(e)}")


# ============ Results Retrieval Endpoints ============
@router.get("/results", response_model=GetResultsResponse)
async def get_results(
    limit: int = Query(100, description="Maximum number of results"),
    skip: int = Query(0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """
    Retrieve past detection results
    """
    results = db.query(DetectionResult).order_by(DetectionResult.detected_at.desc()).offset(skip).limit(limit).all()
    total = db.query(DetectionResult).count()
    
    return GetResultsResponse(
        total=total,
        results=results
    )


@router.get("/results/{result_id}")
async def get_result_by_id(result_id: int, db: Session = Depends(get_db)):
    """
    Get a specific detection result by ID
    """
    result = db.query(DetectionResult).filter_by(id=result_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return result


# ============ Detection Session Management ============
@router.get("/detections/sessions", response_model=DetectionSessionsResponse)
async def list_detection_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregate detection results into SOC sessions for current user's uploads"""
    sessions_payload = _assemble_sessions(db, user_id=current_user.id)
    sessions = [DetectionSessionSchema(**payload) for payload in sessions_payload]
    return DetectionSessionsResponse(total=len(sessions), sessions=sessions)


@router.patch("/detections/sessions/{session_id}/status", response_model=DetectionStatusUpdateResponse)
async def update_detection_session_status(
    session_id: int,
    request: DetectionStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """Persist analyst status for a detection session"""
    session_data = _load_session_data(db, session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    log_entry, results = session_data

    status_row = db.query(DetectionSessionStatus).filter_by(session_id=session_id).first()
    if not status_row:
        status_row = DetectionSessionStatus(session_id=session_id)
        db.add(status_row)

    status_row.status = request.status
    status_row.notes = request.notes
    db.commit()
    db.refresh(status_row)

    session_payload = _build_session_payload(session_id, log_entry, results, status_row)
    return DetectionStatusUpdateResponse(session=DetectionSessionSchema(**session_payload))


@router.post("/detections/sessions/{session_id}/report", response_model=DetectionReportResponse)
async def generate_detection_report(session_id: int, db: Session = Depends(get_db)):
    """Generate and persist a lightweight JSON report for a detection session"""
    session_data = _load_session_data(db, session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    log_entry, results = session_data
    status_row = db.query(DetectionSessionStatus).filter_by(session_id=session_id).first()
    session_payload = _build_session_payload(session_id, log_entry, results, status_row)

    report_path = _dump_report_file(session_id, session_payload)

    report_record = DetectionReport(session_id=session_id, file_path=str(report_path))
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    return DetectionReportResponse(
        report_id=report_record.id,
        session_id=session_id,
        file_path=str(report_path),
        created_at=report_record.created_at,
        message="Report generated successfully",
    )


# ============ Model Management Endpoints ============
@router.get("/models", response_model=GetModelsResponse)
async def get_models(db: Session = Depends(get_db)):
    """
    List all trained models
    """
    models = db.query(TrainedModel).order_by(TrainedModel.trained_at.desc()).all()
    
    return GetModelsResponse(
        total=len(models),
        models=[
            {
                "id": m.id,
                "model_name": m.model_name,
                "model_type": m.model_type,
                "training_data_count": m.training_data_count,
                "trained_at": m.trained_at,
                "is_active": bool(m.is_active)
            }
            for m in models
        ]
    )


@router.get("/models/{model_name}")
async def get_model_info(model_name: str, db: Session = Depends(get_db)):
    """
    Get information about a specific model
    """
    model = db.query(TrainedModel).filter_by(model_name=model_name, is_active=1).first()
    
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    
    return model


# ============ Analytics Endpoints ============
@router.get("/analytics/stats", response_model=AnalyticsStatsResponse)
async def get_analytics_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return aggregate statistics for dashboard KPIs (scoped to current user's uploads)"""
    # Get log entry IDs from current user's uploaded files
    user_log_types = (
        db.query(UploadedFile.log_type)
        .filter_by(uploaded_by=current_user.id)
        .distinct()
        .all()
    )
    user_log_type_list = [lt[0] for lt in user_log_types]
    
    if not user_log_type_list:
        # User has no uploads yet
        return AnalyticsStatsResponse(
            total_users=0,
            total_logs=0,
            total_detections=0,
            anomalies_detected=0,
            high_risk_users=0,
            models_trained=0,
            anomalies_past_week=0,
        )
    
    # Count only users who have log entries from this user's uploaded log types
    total_users = (
        db.query(func.count(func.distinct(LogEntry.user_id)))
        .filter(LogEntry.log_type.in_(user_log_type_list))
        .scalar() or 0
    )

    total_logs = (
        db.query(func.count(LogEntry.id))
        .filter(LogEntry.log_type.in_(user_log_type_list))
        .scalar() or 0
    )
    
    total_detections = (
        db.query(func.count(DetectionResult.id))
        .join(LogEntry, DetectionResult.log_entry_id == LogEntry.id)
        .filter(LogEntry.log_type.in_(user_log_type_list))
        .scalar() or 0
    )
    
    anomalies_detected = (
        db.query(func.count(DetectionResult.id))
        .join(LogEntry, DetectionResult.log_entry_id == LogEntry.id)
        .filter(
            DetectionResult.is_anomaly == -1,
            LogEntry.log_type.in_(user_log_type_list)
        )
        .scalar()
        or 0
    )

    high_risk_users = (
        db.query(func.count(func.distinct(LogEntry.user_id)))
        .join(DetectionResult, DetectionResult.log_entry_id == LogEntry.id)
        .filter(
            DetectionResult.is_anomaly == -1,
            DetectionResult.risk_level == "high",
            LogEntry.log_type.in_(user_log_type_list)
        )
        .scalar()
        or 0
    )

    models_trained = db.query(func.count(TrainedModel.id)).scalar() or 0

    week_ago = datetime.utcnow() - timedelta(days=7)
    anomalies_past_week = (
        db.query(func.count(DetectionResult.id))
        .join(LogEntry, DetectionResult.log_entry_id == LogEntry.id)
        .filter(
            DetectionResult.is_anomaly == -1,
            DetectionResult.detected_at >= week_ago,
            LogEntry.log_type.in_(user_log_type_list)
        )
        .scalar()
        or 0
    )

    return AnalyticsStatsResponse(
        total_users=int(total_users),
        total_logs=int(total_logs),
        total_detections=int(total_detections),
        anomalies_detected=int(anomalies_detected),
        high_risk_users=int(high_risk_users),
        models_trained=int(models_trained),
        anomalies_past_week=int(anomalies_past_week),
    )


@router.get("/analytics/trends", response_model=AnalyticsTrendsResponse)
async def get_anomaly_trends(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return anomalies vs normal counts grouped by day for last N days (scoped to current user's uploads)"""
    # Get user's log types
    user_log_types = (
        db.query(UploadedFile.log_type)
        .filter_by(uploaded_by=current_user.id)
        .distinct()
        .all()
    )
    user_log_type_list = [lt[0] for lt in user_log_types]
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)

    date_expr = func.date(DetectionResult.detected_at)
    anomalies_expr = func.sum(case((DetectionResult.is_anomaly == -1, 1), else_=0))
    normal_expr = func.sum(case((DetectionResult.is_anomaly != -1, 1), else_=0))

    query = (
        db.query(date_expr.label("date"), anomalies_expr.label("anomalies"), normal_expr.label("normal"))
        .join(LogEntry, DetectionResult.log_entry_id == LogEntry.id)
        .filter(DetectionResult.detected_at >= datetime.combine(start_date, datetime.min.time()))
    )
    
    if user_log_type_list:
        query = query.filter(LogEntry.log_type.in_(user_log_type_list))
    
    rows = query.group_by(date_expr).order_by(date_expr).all()

    counts_by_date = {row.date: {"anomalies": row.anomalies or 0, "normal": row.normal or 0} for row in rows}

    points = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        values = counts_by_date.get(day.isoformat(), counts_by_date.get(day, {"anomalies": 0, "normal": 0}))
        points.append(
            {
                "date": day.isoformat(),
                "anomalies": int(values.get("anomalies", 0)),
                "normal": int(values.get("normal", 0)),
            }
        )

    return AnalyticsTrendsResponse(range_days=days, points=points)


@router.get("/analytics/user-risks", response_model=UserRiskScoresResponse)
async def get_user_risk_scores(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return per-user risk metrics summarizing anomalies and high-risk events (scoped to current user's uploads)"""
    # Get user's log types
    user_log_types = (
        db.query(UploadedFile.log_type)
        .filter_by(uploaded_by=current_user.id)
        .distinct()
        .all()
    )
    user_log_type_list = [lt[0] for lt in user_log_types]
    
    anomaly_case = case((DetectionResult.is_anomaly == -1, 1), else_=0)
    high_risk_case = case((DetectionResult.risk_level == "high", 1), else_=0)

    query = (
        db.query(
            LogEntry.user_id.label("user_id"),
            func.count(LogEntry.id).label("total_events"),
            func.coalesce(func.sum(anomaly_case), 0).label("anomalies"),
            func.coalesce(func.sum(high_risk_case), 0).label("high_risk_events"),
            func.coalesce(func.max(DetectionResult.detected_at), func.max(LogEntry.timestamp)).label("last_seen"),
        )
        .outerjoin(DetectionResult, DetectionResult.log_entry_id == LogEntry.id)
    )
    
    if user_log_type_list:
        query = query.filter(LogEntry.log_type.in_(user_log_type_list))
    
    query = (
        query.group_by(LogEntry.user_id)
        .order_by(func.coalesce(func.sum(anomaly_case), 0).desc())
        .limit(limit)
    )

    items = []
    for row in query:
        total_events = int(row.total_events or 0)
        anomalies = int(row.anomalies or 0)
        high_risk_events = int(row.high_risk_events or 0)
        risk_score = 0.0
        if total_events > 0:
            risk_score = round(min(1.0, (anomalies * 0.6 + high_risk_events * 0.4) / total_events), 2)

        items.append(
            {
                "user_id": row.user_id or "unknown",
                "total_events": total_events,
                "anomalies": anomalies,
                "high_risk_events": high_risk_events,
                "last_seen": row.last_seen,
                "risk_score": risk_score,
            }
        )

    total_users = db.query(func.count(func.distinct(LogEntry.user_id))).scalar() or 0

    return UserRiskScoresResponse(total_users=int(total_users), items=items)
