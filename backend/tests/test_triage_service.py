"""
Tests for TriageExtractorService
=================================
Three scenarios covering the acceptance criteria:

1. **Standard panicked transcript** — location + injury present → all fields populated.
2. **Fragmented transcript, missing location** → ``missing_critical_info`` includes ``location``.
3. **Upstream API timeout / error** → safe fallback returned with all critical fields marked missing.

All tests mock the Groq client so they run offline and deterministically.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from backend.schemas.triage import ConsciousnessLevel, MissingField, TriageResponse
from backend.services.triage_service import TriageExtractorService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_client(response_json: dict) -> MagicMock:
    """Build a mock Groq client that returns *response_json* as the
    assistant's message content."""
    content_str = json.dumps(response_json)

    mock_message = SimpleNamespace(content=content_str)
    mock_choice = SimpleNamespace(message=mock_message)
    mock_response = SimpleNamespace(choices=[mock_choice])

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


def _make_error_client(exception: Exception) -> MagicMock:
    """Build a mock Groq client that raises *exception* on create()."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = exception
    return mock_client


# ---------------------------------------------------------------------------
# Test 1 — Standard panicked transcript with location and injury
# ---------------------------------------------------------------------------

class TestStandardTranscript:
    """A clear-ish panicked transcript that contains location, complaint,
    consciousness, and a hazard.  The service should populate every field."""

    TRANSCRIPT = (
        "Oh god oh god, there's been a crash on Highway 101 near exit 42! "
        "A woman is trapped in the car, she's screaming, I think her leg is broken. "
        "There's smoke coming from the engine, it might catch fire!"
    )

    LLM_RESPONSE = {
        "location": "Highway 101 near exit 42",
        "chief_complaint": "Trapped in car, leg injury",
        "consciousness": "responsive",
        "approx_patient_count": 1,
        "hazards": ["smoke from engine", "possible fire"],
        "missing_critical_info": [],
    }

    def test_extracts_all_fields(self) -> None:
        mock_client = _make_mock_client(self.LLM_RESPONSE)
        service = TriageExtractorService(groq_client=mock_client)

        result = service.extract(self.TRANSCRIPT)

        assert isinstance(result, TriageResponse)
        assert result.location == "Highway 101 near exit 42"
        assert result.chief_complaint == "Trapped in car, leg injury"
        assert result.consciousness == ConsciousnessLevel.RESPONSIVE
        assert result.approx_patient_count == 1
        assert len(result.hazards) == 2
        assert "smoke from engine" in result.hazards
        assert result.missing_critical_info == []

        # Verify the LLM was called with the transcript
        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args
        user_msg = call_kwargs.kwargs["messages"][1]["content"]
        assert user_msg == self.TRANSCRIPT


# ---------------------------------------------------------------------------
# Test 2 — Fragmented transcript, location missing
# ---------------------------------------------------------------------------

class TestFragmentedTranscriptMissingLocation:
    """Caller is panicking and never gives a location.  The LLM flags
    ``location`` inside ``missing_critical_info``."""

    TRANSCRIPT = (
        "Please help! Someone just collapsed, they're not moving, "
        "I don't know where I am, I just pulled over!"
    )

    LLM_RESPONSE = {
        "location": None,
        "chief_complaint": "Person collapsed, not moving",
        "consciousness": "unresponsive",
        "approx_patient_count": 1,
        "hazards": [],
        "missing_critical_info": ["location"],
    }

    def test_missing_location_flagged(self) -> None:
        mock_client = _make_mock_client(self.LLM_RESPONSE)
        service = TriageExtractorService(groq_client=mock_client)

        result = service.extract(self.TRANSCRIPT)

        assert isinstance(result, TriageResponse)
        assert result.location is None
        assert result.consciousness == ConsciousnessLevel.UNRESPONSIVE
        assert MissingField.LOCATION in result.missing_critical_info
        # chief_complaint and consciousness should NOT be missing
        assert MissingField.CHIEF_COMPLAINT not in result.missing_critical_info
        assert MissingField.CONSCIOUSNESS not in result.missing_critical_info


# ---------------------------------------------------------------------------
# Test 3 — Upstream API timeout / error → safe fallback
# ---------------------------------------------------------------------------

class TestUpstreamErrorFallback:
    """When the Groq API times out or raises any exception, the service
    must return a safe fallback object — never propagate the error."""

    TRANSCRIPT = "Help, there's a fire at the school!"

    def test_timeout_returns_fallback(self) -> None:
        mock_client = _make_error_client(TimeoutError("Groq API timed out"))
        service = TriageExtractorService(groq_client=mock_client)

        result = service.extract(self.TRANSCRIPT)

        assert isinstance(result, TriageResponse)
        assert result.consciousness == ConsciousnessLevel.UNCLEAR
        assert result.location is None
        assert result.chief_complaint is None
        assert result.approx_patient_count is None
        assert result.hazards == []
        assert set(result.missing_critical_info) == {
            MissingField.LOCATION,
            MissingField.CHIEF_COMPLAINT,
            MissingField.CONSCIOUSNESS,
        }

    def test_connection_error_returns_fallback(self) -> None:
        mock_client = _make_error_client(ConnectionError("Network unreachable"))
        service = TriageExtractorService(groq_client=mock_client)

        result = service.extract(self.TRANSCRIPT)

        assert isinstance(result, TriageResponse)
        assert result.consciousness == ConsciousnessLevel.UNCLEAR
        assert set(result.missing_critical_info) == {
            MissingField.LOCATION,
            MissingField.CHIEF_COMPLAINT,
            MissingField.CONSCIOUSNESS,
        }

    def test_empty_transcript_returns_fallback(self) -> None:
        mock_client = _make_mock_client({})  # should never be called
        service = TriageExtractorService(groq_client=mock_client)

        result = service.extract("")

        assert isinstance(result, TriageResponse)
        assert result.consciousness == ConsciousnessLevel.UNCLEAR
        # LLM should NOT have been called for empty input
        mock_client.chat.completions.create.assert_not_called()
