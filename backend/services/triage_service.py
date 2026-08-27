"""
PulseRelay Triage Extractor Service
====================================
Accepts raw bystander transcript text, calls an LLM (Groq) with a strict
system prompt, and returns a validated ``TriageResponse``.

Safety contract
---------------
* **Non-diagnostic** — the system prompt explicitly forbids clinical output.
* **Timeout-safe** — any upstream failure returns a safe fallback object so
  the dispatcher UI always has something to render.
* **Deterministic shape** — output is always a ``TriageResponse``, never raw
  unstructured text.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

from groq import Groq
from pydantic import ValidationError

from backend.schemas.triage import (
    TriageResponse,
    build_fallback_response,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a deterministic emergency triage data extractor for a crisis response system. "
    "Extract structured facts from an urgent, fragmented bystander transcript. "
    "You must never diagnose, prescribe, give medical advice, or invent details. "
    "Fields: location, chief_complaint (<8 words), consciousness ('responsive' | 'unresponsive' | 'unclear'), "
    "approx_patient_count (number | null), hazards (string[]), "
    "missing_critical_info (('location' | 'chief_complaint' | 'consciousness')[]). "
    "Return strictly valid JSON."
)

DEFAULT_MODEL = "openai/gpt-oss-20b"
DEFAULT_TIMEOUT_SECONDS = 5


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class TriageExtractorService:
    """
    Stateless service that converts a raw transcript string into a
    structured ``TriageResponse`` via the Groq LLM API.

    Parameters
    ----------
    api_key : str | None
        Groq API key.  Falls back to the ``GROQ_API_KEY`` env var.
    model : str
        Model identifier to use for the chat completion.
    timeout : float
        Maximum seconds to wait for an LLM response before falling back.
    groq_client : Groq | None
        Optional pre-configured Groq client (useful for testing / DI).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        groq_client: Optional[Groq] = None,
    ) -> None:
        self.model = model
        self.timeout = timeout

        if groq_client is not None:
            self._client = groq_client
        else:
            resolved_key = api_key or os.getenv("GROQ_API_KEY", "")
            self._client = Groq(api_key=resolved_key)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(self, transcript: str) -> TriageResponse:
        """
        Extract triage data from *transcript*.

        Returns a ``TriageResponse`` on success, or a safe fallback on
        any upstream error (timeout, malformed JSON, validation failure).
        """
        if not transcript or not transcript.strip():
            logger.warning("Empty transcript received — returning fallback.")
            return build_fallback_response()

        try:
            raw_json = self._call_llm(transcript)
            return self._parse(raw_json)
        except Exception:
            logger.exception("Triage extraction failed — returning fallback.")
            return build_fallback_response()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _call_llm(self, transcript: str) -> str:
        """Send the transcript to Groq and return the raw content string."""
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
            temperature=0,
            response_format={"type": "json_object"},
            timeout=self.timeout,
        )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("LLM returned empty content.")
        return content

    def _parse(self, raw_json: str) -> TriageResponse:
        """Parse and validate raw JSON into a ``TriageResponse``."""
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            logger.error("LLM returned invalid JSON: %s", exc)
            raise

        if isinstance(data, dict):
            if data.get("consciousness") not in ("responsive", "unresponsive", "unclear"):
                data["consciousness"] = "unclear"
            if not data.get("urgency"):
                data["urgency"] = "UNKNOWN"

        try:
            return TriageResponse.model_validate(data)
        except ValidationError as exc:
            logger.error("Pydantic validation failed: %s", exc)
            raise
