"""
PulseRelay Supabase Database Service
====================================
Persists emergency incidents and triage telemetry to Supabase PostgreSQL via PostgREST,
and retrieves historical telemetry for the Dispatcher UI. Supports both classic JWT anon
keys and new Supabase publishable keys (sb_publishable_...).
"""

from __future__ import annotations

import os
import logging
from typing import List, Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service to handle persistence and retrieval of incidents via Supabase REST API."""

    def __init__(self) -> None:
        self.url: Optional[str] = os.getenv("SUPABASE_URL")
        self.key: Optional[str] = os.getenv("SUPABASE_KEY")

        if self.url and self.url.endswith("/"):
            self.url = self.url.rstrip("/")

        if self.url and self.key:
            self.endpoint = f"{self.url}/rest/v1/incidents"
            self.headers = {
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }
            logger.info("SupabaseService initialized for %s", self.url)
        else:
            self.endpoint = None
            self.headers = {}
            logger.warning("Supabase URL or Key missing. Running in in-memory mode.")

    @property
    def is_configured(self) -> bool:
        return bool(self.endpoint and self.key)

    def save_incident(self, payload: Dict[str, Any]) -> bool:
        """
        Save an emergency incident payload to Supabase 'incidents' table.
        Payload format:
        {
            "triage": {...},
            "timestamp": "2026-08-27T10:34:00Z",
            "transcript": "...",
            "gps_location": {...}
        }
        """
        if not self.is_configured:
            return False

        try:
            triage_data = payload.get("triage", {})
            consciousness = triage_data.get("consciousness", "unclear")
            urgency = triage_data.get("urgency", "UNKNOWN")

            record = {
                "timestamp": payload.get("timestamp"),
                "transcript": payload.get("transcript"),
                "triage": triage_data,
                "gps_location": payload.get("gps_location"),
                "consciousness": consciousness,
                "urgency": urgency,
            }

            with httpx.Client(timeout=5.0) as client:
                res = client.post(self.endpoint, headers=self.headers, json=record)
                if res.status_code in (200, 201):
                    logger.info("Successfully saved incident to Supabase.")
                    return True
                else:
                    logger.warning("Supabase save failed (%d): %s", res.status_code, res.text)
                    return False
        except Exception as e:
            logger.error("Failed to save incident to Supabase: %s", e)
            return False

    def get_incidents(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch recent incidents from Supabase 'incidents' table."""
        if not self.is_configured:
            return []

        try:
            url = f"{self.endpoint}?select=*&order=created_at.desc&limit={limit}"
            with httpx.Client(timeout=5.0) as client:
                res = client.get(url, headers=self.headers)
                if res.status_code == 200:
                    records = res.json()
                    formatted = []
                    for item in records:
                        formatted.append({
                            "id": item.get("id"),
                            "timestamp": item.get("timestamp"),
                            "transcript": item.get("transcript"),
                            "triage": item.get("triage", {}),
                            "gps_location": item.get("gps_location"),
                            "created_at": item.get("created_at"),
                        })
                    return formatted
                else:
                    logger.warning("Supabase fetch failed (%d): %s", res.status_code, res.text)
                    return []
        except Exception as e:
            logger.error("Failed to fetch incidents from Supabase: %s", e)
            return []
