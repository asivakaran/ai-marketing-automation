"""Celery app + beat schedule. Tasks are stubs until their roadmap feature is built."""
import os

from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("autopilot", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    timezone="Europe/London",
    beat_schedule={
        # Feature 5 (roadmap): sync appointments to Google Calendar
        "calendar-sync-every-5-min": {"task": "tasks.calendar_sync.sync_all", "schedule": 300.0},
        # Feature 6: send due emails in sequences
        "email-sequences-hourly": {"task": "tasks.email_sequences.send_due", "schedule": 3600.0},
        # Feature 7: pull new Google reviews
        "review-sync-daily": {"task": "tasks.review_outreach.sync_reviews", "schedule": 86400.0},
    },
)
