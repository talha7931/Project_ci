import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import sklearn

# Ensure root directory is in sys.path so feature_extractor can be imported
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.schemas import (
    URLPredictRequest,
    URLPredictResponse,
    HealthResponse,
    ModelInfoResponse,
    ModelMetrics
)
from backend.service import model_service

app = FastAPI(
    title="URL Sentinel API",
    description="Intelligent Malicious URL Detection using Random Forest Ensemble Learning",
    version="1.0.0"
)

# CORS configuration
allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VERIFIED_METRICS = [
    ModelMetrics(
        model="Random Forest",
        technique="Bagging (Bootstrap Aggregating)",
        accuracy=0.7958,
        precision=0.7354,
        recall=0.6023,
        f1_score=0.6622,
        roc_auc=0.8490
    ),
    ModelMetrics(
        model="AdaBoost",
        technique="Boosting (Adaptive Boosting)",
        accuracy=0.7738,
        precision=0.6945,
        recall=0.5699,
        f1_score=0.6261,
        roc_auc=0.8068
    )
]

PREDICTION_DISCLAIMER = (
    "This assessment is a statistical machine-learning prediction generated solely from lexical "
    "and syntactic URL characteristics. It does not perform active network queries, DNS inspection, "
    "or payload analysis, and should not be considered an absolute guarantee of URL safety."
)

@app.get("/", tags=["General"])
def root_endpoint():
    # If frontend static build exists, serve its index.html
    frontend_dist = ROOT_DIR / "frontend" / "dist"
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return {
        "service": "URL Sentinel API",
        "description": "Intelligent Malicious URL Detection System",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "model_info": "/model-info",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse, tags=["Diagnostics"])
def health_check():
    is_loaded = model_service.model is not None and model_service.config is not None
    return HealthResponse(
        status="healthy" if is_loaded else "degraded",
        model_loaded=is_loaded,
        model_name=model_service.config.get("model_name", "Random Forest") if is_loaded else "Not Loaded",
        scikit_learn_version=sklearn.__version__,
        features=model_service.feature_columns
    )

@app.get("/model-info", response_model=ModelInfoResponse, tags=["Model Info"])
def model_info():
    return ModelInfoResponse(
        selected_model="Random Forest Classifier",
        ensemble_technique="Bagging (Bootstrap Aggregation with 100 Trees)",
        n_estimators=100,
        feature_columns=model_service.feature_columns,
        suspicious_keywords=model_service.suspicious_keywords,
        training_samples=448779,
        test_samples=96167,
        verified_metrics=VERIFIED_METRICS,
        disclaimer=PREDICTION_DISCLAIMER
    )

@app.post("/predict", response_model=URLPredictResponse, tags=["Prediction"])
def predict_url(payload: URLPredictRequest):
    try:
        # Notice: url is never fetched, opened or executed. Only its raw string is analyzed.
        result = model_service.predict(payload.url)
        return URLPredictResponse(
            url=result["url"],
            predicted_class=result["predicted_class"],
            label=result["label"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            features=result["features"],
            model_name=result["model_name"],
            disclaimer=PREDICTION_DISCLAIMER
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

# Serve static frontend if built
frontend_dist_dir = ROOT_DIR / "frontend" / "dist"
if frontend_dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist_dir / "assets"), name="assets")

    # Catch-all for React SPA routing
    @app.get("/{full_path:path}", include_in_schema=False)
    async def catch_all(full_path: str):
        # Don't intercept API paths
        if full_path.startswith("api/") or full_path in ["predict", "health", "model-info", "docs", "openapi.json"]:
            raise HTTPException(status_code=404, detail="Endpoint not found")
        file_path = frontend_dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist_dir / "index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)

