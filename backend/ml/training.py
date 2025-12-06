"""
ML model training orchestration
Wraps the existing models.py functions with unified interface
"""
import pandas as pd
from backend.ml.models import (
    train_large_file_transfer_model, detect_anomalies,
    train_file_access_model, detect_file_access_anomalies,
    train_database_access_model, detect_database_access_anomalies,
    train_privileged_access_model, detect_privileged_access_anomalies,
    train_legacy_system_access_model, detect_legacy_system_access_anomalies,
    train_department_access_model, detect_department_access_anomalies,
    train_unauthorized_software_installation_model, detect_unauthorized_software_installation,
    train_hacking_tools_model, detect_hacking_tools,
    train_command_line_access_model, detect_command_line_access,
    train_mass_deletion_model, detect_mass_deletion_anomalies,
    train_security_log_modification_model, detect_security_log_modification_anomalies,
    train_database_record_alteration_model, detect_database_record_alteration_anomalies
)

# Mapping of model names to training functions
MODEL_TRAINERS = {
    "large_file_transfer": train_large_file_transfer_model,
    "file_access": train_file_access_model,
    "database_access": train_database_access_model,
    "privileged_access": train_privileged_access_model,
    "legacy_system_access": train_legacy_system_access_model,
    "department_access": train_department_access_model,
    "unauthorized_software": train_unauthorized_software_installation_model,
    "hacking_tools": train_hacking_tools_model,
    "command_line_access": train_command_line_access_model,
    "mass_deletion": train_mass_deletion_model,
    "security_log_modification": train_security_log_modification_model,
    "database_record_alteration": train_database_record_alteration_model,
}

# Mapping of model names to detection functions
MODEL_DETECTORS = {
    "large_file_transfer": detect_anomalies,
    "file_access": detect_file_access_anomalies,
    "database_access": detect_database_access_anomalies,
    "privileged_access": detect_privileged_access_anomalies,
    "legacy_system_access": detect_legacy_system_access_anomalies,
    "department_access": detect_department_access_anomalies,
    "unauthorized_software": detect_unauthorized_software_installation,
    "hacking_tools": detect_hacking_tools,
    "command_line_access": detect_command_line_access,
    "mass_deletion": detect_mass_deletion_anomalies,
    "security_log_modification": detect_security_log_modification_anomalies,
    "database_record_alteration": detect_database_record_alteration_anomalies,
}


def train_model_for_type(df: pd.DataFrame, model_type: str, contamination: float = 0.1, n_estimators: int = 100):
    """
    Train a model for a specific threat type
    
    Args:
        df: DataFrame with training data
        model_type: Type of model to train
        contamination: Contamination parameter for Isolation Forest
        n_estimators: Number of estimators
    
    Returns:
        Trained model object
    """
    if model_type not in MODEL_TRAINERS:
        raise ValueError(f"Unknown model type: {model_type}. Available: {list(MODEL_TRAINERS.keys())}")
    
    trainer_func = MODEL_TRAINERS[model_type]
    
    # Call the appropriate training function
    model = trainer_func(df)
    
    return model


def detect_anomalies_with_model(model, df: pd.DataFrame, model_type: str):
    """
    Detect anomalies using a trained model
    
    Args:
        model: Trained model object
        df: DataFrame with data to analyze
        model_type: Type of model being used
    
    Returns:
        DataFrame with anomaly predictions
    """
    if model_type not in MODEL_DETECTORS:
        raise ValueError(f"Unknown model type: {model_type}. Available: {list(MODEL_DETECTORS.keys())}")
    
    detector_func = MODEL_DETECTORS[model_type]
    
    # Call the appropriate detection function
    results = detector_func(model, df)
    
    return results


def get_available_model_types():
    """Get list of available model types"""
    return list(MODEL_TRAINERS.keys())
