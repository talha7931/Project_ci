import os
from pathlib import Path
import joblib
import pandas as pd
from typing import Dict, Any, List
from feature_extractor import extract_url_features

BASE_DIR = Path(__file__).resolve().parent.parent

class ModelService:
    def __init__(self, model_path: str = None, config_path: str = None):
        self.model_path = Path(model_path) if model_path else (BASE_DIR / "best_url_model.pkl")
        self.config_path = Path(config_path) if config_path else (BASE_DIR / "model_config.pkl")
        self.model = None
        self.config = None
        self._load_artifacts()

    def _load_artifacts(self):
        # Support both uncompressed and compressed pkl for GitHub/Render portability
        if not self.model_path.exists():
            gz_path = self.model_path.with_name(self.model_path.name + ".gz")
            if gz_path.exists():
                self.model_path = gz_path
            else:
                raise FileNotFoundError(f"Model file not found at {self.model_path}")
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found at {self.config_path}")

        self.model = joblib.load(str(self.model_path))
        # Ensure single-threaded prediction for fast, deterministic server-side latency
        if hasattr(self.model, "n_jobs"):
            self.model.n_jobs = 1
        self.config = joblib.load(str(self.config_path))

    @property
    def feature_columns(self) -> List[str]:
        return self.config.get("feature_columns", [
            "url_length", "has_https", "has_ip", "dot_count", "hyphen_count", "keyword_count"
        ])

    @property
    def labels(self) -> Dict[int, str]:
        return self.config.get("labels", {0: "Legitimate", 1: "Malicious"})

    @property
    def suspicious_keywords(self) -> List[str]:
        return self.config.get("suspicious_keywords", [])

    def predict(self, url: str) -> Dict[str, Any]:
        # 1. Extract 6 features using identical logic
        features = extract_url_features(url)

        # 2. Build DataFrame matching model.feature_names_in_ exactly to avoid warnings
        cols = self.feature_columns
        input_df = pd.DataFrame([features])[cols]

        # 3. Model inference
        pred_class = int(self.model.predict(input_df)[0])
        probabilities = self.model.predict_proba(input_df)[0]

        # Class probabilities mapping
        # classes_ are [0, 1]
        classes = list(self.model.classes_)
        prob_dict = {
            self.labels.get(cls, str(cls)): float(probabilities[i])
            for i, cls in enumerate(classes)
        }

        confidence = float(prob_dict[self.labels[pred_class]])

        return {
            "url": url,
            "predicted_class": pred_class,
            "label": self.labels.get(pred_class, "Unknown"),
            "confidence": round(confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in prob_dict.items()},
            "features": features,
            "model_name": self.config.get("model_name", "Random Forest")
        }

# Singleton instance
model_service = ModelService()
