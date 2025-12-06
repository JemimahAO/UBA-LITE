"""
Machine Learning package
"""
from backend.ml.models import *
from backend.ml.training import train_model_for_type, detect_anomalies_with_model

__all__ = ["train_model_for_type", "detect_anomalies_with_model"]
