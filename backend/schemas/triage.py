"""
PulseRelay Triage Schema
========================
Pydantic v2 models for the structured triage extraction output.

Fields are designed to capture the 4 Ws (Who, What, Where, Hazards)
from panicked bystander transcripts without any clinical diagnosis.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ConsciousnessLevel(str, Enum):
    """Observed consciousness state — never a clinical assessment."""
    RESPONSIVE = "responsive"
    UNRESPONSIVE = "unresponsive"
    UNCLEAR = "unclear"


class MissingField(str, Enum):
    """Critical fields that may be absent from the transcript."""
    LOCATION = "location"
    CHIEF_COMPLAINT = "chief_complaint"
    CONSCIOUSNESS = "consciousness"


class TriageResponse(BaseModel):
    """
    Structured triage payload extracted from a bystander transcript.

    Every field is operationally relevant to dispatchers and first
    responders.  The model enforces tight constraints so downstream
    consumers can rely on deterministic shapes.
    """

    location: Optional[str] = Field(
        default=None,
        description="Best-effort location string extracted from the transcript.",
    )

    chief_complaint: Optional[str] = Field(
        default=None,
        max_length=80,
        description=(
            "Concise (<8 word) description of the primary incident or injury. "
            "Must never contain clinical diagnoses."
        ),
    )

    consciousness: ConsciousnessLevel = Field(
        default=ConsciousnessLevel.UNCLEAR,
        description="Observed consciousness level of the patient(s).",
    )

    approx_patient_count: Optional[int] = Field(
        default=None,
        ge=0,
        description="Estimated number of patients, or null if unknown.",
    )

    hazards: List[str] = Field(
        default_factory=list,
        description="List of environmental or situational hazards mentioned.",
    )

    missing_critical_info: List[MissingField] = Field(
        default_factory=list,
        description="Critical triage fields that could not be determined from the transcript.",
    )

    is_silent_override: Optional[bool] = Field(
        default=False,
        description="True if caller used non-verbal silent tap override.",
    )

    silent_category: Optional[str] = Field(
        default=None,
        description="Pictogram category for silent override (e.g. INTRUDER, CHOKING, BLEEDING, FIRE).",
    )


# ---------------------------------------------------------------------------
# Convenience constructors
# ---------------------------------------------------------------------------

def build_fallback_response() -> TriageResponse:
    """
    Return a safe fallback triage object used when the upstream LLM call
    fails or times out.  All critical fields are marked as missing.
    """
    return TriageResponse(
        location=None,
        chief_complaint=None,
        consciousness=ConsciousnessLevel.UNCLEAR,
        approx_patient_count=None,
        hazards=[],
        missing_critical_info=[
            MissingField.LOCATION,
            MissingField.CHIEF_COMPLAINT,
            MissingField.CONSCIOUSNESS,
        ],
    )
