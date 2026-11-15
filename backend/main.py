import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.requests import Request
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
    version="1.0.0",
    redirect_slashes=False,
)

# CORS configuration.
# Browsers reject Access-Control-Allow-Origin: * combined with credentials.
# This API does not use cookies, so disable credentials when origins are wildcard.
allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] or ["*"]
allow_credentials = allowed_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PATHS = {"predict", "health", "model-info", "docs", "redoc", "openapi.json"}


def json_error(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail, "error": True})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []) if part != "body")
        msg = err.get("msg", "Invalid request")
        messages.append(f"{loc}: {msg}" if loc else msg)
    return json_error(status.HTTP_422_UNPROCESSABLE_ENTITY, "; ".join(messages) or "Invalid request body")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if not isinstance(detail, str):
        detail = str(detail)
    return json_error(exc.status_code, detail)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return json_error(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Inference error: {exc}")

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

def _spa_index():
    frontend_dist = ROOT_DIR / "frontend" / "dist"
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return None


@app.get("/", tags=["General"])
def root_endpoint():
    spa = _spa_index()
    if spa is not None:
        return spa

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
@app.get("/health/", response_model=HealthResponse, include_in_schema=False)
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
@app.get("/model-info/", response_model=ModelInfoResponse, include_in_schema=False)
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
@app.post("/predict/", response_model=URLPredictResponse, include_in_schema=False)
def predict_url(payload: URLPredictRequest):
    try:
        # Notice: url is never fetched, opened or executed. Only its raw string is analyzed.
        result = model_service.predict(payload.url)
        payload_out = URLPredictResponse(
            url=result["url"],
            predicted_class=int(result["predicted_class"]),
            label=str(result["label"]),
            confidence=float(result["confidence"]),
            probabilities={str(k): float(v) for k, v in result["probabilities"].items()},
            features=result["features"],
            model_name=str(result["model_name"]),
            disclaimer=PREDICTION_DISCLAIMER
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(payload_out))
    except HTTPException:
        raise
    except Exception as e:
        return json_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Inference error: {e}",
        )

# Serve static frontend if built
frontend_dist_dir = ROOT_DIR / "frontend" / "dist"
if frontend_dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist_dir / "assets"), name="assets")

    # Catch-all for React SPA routing (GET/HEAD only — never intercept POST /predict)
    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def catch_all(full_path: str):
        normalized = full_path.strip("/")
        if normalized.startswith("api/") or normalized in API_PATHS:
            return json_error(status.HTTP_404_NOT_FOUND, "Endpoint not found")
        file_path = frontend_dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        spa = _spa_index()
        if spa is not None:
            return spa
        return json_error(status.HTTP_404_NOT_FOUND, "Frontend build not found")


@app.api_route("/{full_path:path}", methods=["POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
async def unknown_method_path(full_path: str):
    # Avoid Starlette's empty 405 body when a GET-only SPA route matches the path.
    return json_error(status.HTTP_404_NOT_FOUND, f"No API endpoint for /{full_path}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)

