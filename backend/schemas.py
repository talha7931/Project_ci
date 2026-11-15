from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Any

class URLPredictRequest(BaseModel):
    url: str = Field(
        ...,
        description="The URL string to evaluate purely through lexical/syntactic feature analysis.",
        examples=["https://www.google.com", "http://192.168.1.1/login-bank-account-verify.html"]
    )

    @field_validator("url")
    @classmethod
    def validate_url_string(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("URL cannot be empty or solely whitespace.")
        if len(cleaned) > 2048:
            raise ValueError("URL exceeds maximum length of 2048 characters.")
        # Ensure it contains printable characters
        if not cleaned.isprintable():
            raise ValueError("URL contains non-printable characters.")
        return cleaned

class FeatureBreakdown(BaseModel):
    url_length: int = Field(..., description="Total character count of the URL string.")
    has_https: int = Field(..., description="Binary indicator (1 if scheme starts with https://, 0 otherwise).")
    has_ip: int = Field(..., description="Binary indicator (1 if authority contains an IPv4 or IPv6 address, 0 otherwise).")
    dot_count: int = Field(..., description="Frequency count of '.' characters in the URL.")
    hyphen_count: int = Field(..., description="Frequency count of '-' characters in the URL.")
    keyword_count: int = Field(..., description="Count of matched suspicious security/financial keywords.")

class URLPredictResponse(BaseModel):
    url: str
    predicted_class: int
    label: str
    confidence: float
    probabilities: Dict[str, float]
    features: FeatureBreakdown
    model_name: str
    disclaimer: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    scikit_learn_version: str
    features: List[str]

class ModelMetrics(BaseModel):
    model: str
    technique: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float

class ModelInfoResponse(BaseModel):
    selected_model: str
    ensemble_technique: str
    n_estimators: int
    feature_columns: List[str]
    suspicious_keywords: List[str]
    training_samples: int
    test_samples: int
    verified_metrics: List[ModelMetrics]
    disclaimer: str

