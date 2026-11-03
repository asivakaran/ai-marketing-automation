"""
AutoPilot Marketing OS — Python workers (FastAPI + Celery).

The weekend features (chat, SMS alerts, inbound SMS) run entirely in Next.js.
These workers exist for the deeper roadmap: calendar sync, campaign sends,
review outreach, voice. Run them only when you build those features.

    uvicorn app:app --port 8000
    celery -A celery_app worker -B -l info
"""
import os

from fastapi import FastAPI

app = FastAPI(title="AutoPilot Workers", version="0.1.0")

WORKER_API_URL = os.environ.get("WORKER_API_URL", "http://localhost:3000")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": "autopilot-workers",
        "worker_api_url": WORKER_API_URL,
        "redis": REDIS_URL,
    }


@app.get("/")
def root() -> dict:
    return {
        "service": "autopilot-workers",
        "endpoints": ["/health"],
        "note": "Chat + SMS run in Next.js (see web/). Celery tasks land here with Features 5-11.",
    }
