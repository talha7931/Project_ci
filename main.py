"""
Root-level ASGI entry point for Render deployment.
Uvicorn is pointed at this file as:   uvicorn main:app
It simply re-exports the FastAPI `app` from backend/main.py.
"""
import sys
import os
from pathlib import Path

# Add the project root to sys.path so all internal imports resolve
# regardless of the working directory Render uses.
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.main import app  # noqa: F401  – re-export for Uvicorn

__all__ = ["app"]
