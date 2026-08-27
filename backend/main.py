"""
PulseRelay — FastAPI Backend
=============================
REST + WebSocket API for the PulseRelay emergency triage relay system.

Endpoints
---------
POST /api/triage          — One-shot transcript → TriageResponse.
POST /api/transcribe      — Audio file → transcribed text (Whisper).
WS   /ws/dispatch         — Real-time relay: broadcasts triage to dispatchers.
WS   /ws/caller            — Caller WebSocket: accepts text OR audio bytes.
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pathlib import Path

# Load .env from project root or backend/ directory
_this_dir = Path(__file__).resolve().parent
load_dotenv(_this_dir / ".env")       # backend/.env
load_dotenv(_this_dir.parent / ".env")  # project root .env

from backend.schemas.triage import MissingField, TriageResponse, build_fallback_response
from backend.services.triage_service import TriageExtractorService
from backend.services.transcription_service import TranscriptionService
from backend.services.location_service import LocationService
from backend.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Manages WebSocket connections for fan-out broadcasting."""

    def __init__(self) -> None:
        self.dispatcher_connections: List[WebSocket] = []
        self.caller_connections: List[WebSocket] = []
        self._incident_history: List[dict] = []

    async def connect_dispatcher(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.dispatcher_connections.append(websocket)
        # Send existing incident history on connect
        history = self.get_history()
        if history:
            await websocket.send_json({
                "type": "history",
                "incidents": history,
            })
        logger.info("Dispatcher connected. Total: %d", len(self.dispatcher_connections))

    async def connect_caller(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.caller_connections.append(websocket)
        logger.info("Caller connected. Total: %d", len(self.caller_connections))

    def disconnect_dispatcher(self, websocket: WebSocket) -> None:
        self.dispatcher_connections.remove(websocket)
        logger.info("Dispatcher disconnected. Total: %d", len(self.dispatcher_connections))

    def disconnect_caller(self, websocket: WebSocket) -> None:
        self.caller_connections.remove(websocket)
        logger.info("Caller disconnected. Total: %d", len(self.caller_connections))

    async def broadcast_to_dispatchers(self, data: dict) -> None:
        """Send triage data to all connected dispatcher clients and persist to database."""
        self._incident_history.append(data)
        if supabase_service and supabase_service.is_configured:
            supabase_service.save_incident(data)

        disconnected = []
        for connection in self.dispatcher_connections:
            try:
                await connection.send_json({"type": "triage_update", **data})
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.dispatcher_connections.remove(conn)

    async def send_to_caller(self, websocket: WebSocket, data: dict) -> None:
        """Send triage response back to the caller."""
        try:
            await websocket.send_json(data)
        except Exception:
            logger.exception("Failed to send to caller.")

    async def broadcast_to_callers(self, data: dict) -> None:
        """Send dispatch status to all connected caller clients."""
        disconnected = []
        for connection in self.caller_connections:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.caller_connections.remove(conn)

    def get_history(self) -> List[dict]:
        if supabase_service and supabase_service.is_configured:
            db_history = supabase_service.get_incidents(limit=50)
            if db_history:
                return db_history
        return self._incident_history[-50:]


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

manager = ConnectionManager()
triage_service: TriageExtractorService | None = None
transcription_service: TranscriptionService | None = None
supabase_service: SupabaseService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global triage_service, transcription_service, supabase_service
    triage_service = TriageExtractorService()
    transcription_service = TranscriptionService()
    supabase_service = SupabaseService()
    logger.info("PulseRelay backend started (Triage + Whisper transcription + Supabase).")
    yield
    logger.info("PulseRelay backend shutting down.")


# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PulseRelay",
    description="Emergency Voice-to-Triage Relay API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class GPSLocation(BaseModel):
    latitude: float
    longitude: float


class TranscriptRequest(BaseModel):
    transcript: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    silent_triage: Optional[dict] = None


class TriageAPIResponse(BaseModel):
    triage: TriageResponse
    timestamp: str
    transcript: str
    gps_location: Optional[GPSLocation] = None


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "PulseRelay",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "triage": "POST /api/triage",
            "transcribe": "POST /api/transcribe",
            "caller_ws": "WS /ws/caller",
            "dispatch_ws": "WS /ws/dispatch",
        },
    }


@app.post("/api/triage", response_model=TriageAPIResponse)
async def extract_triage(request: TranscriptRequest):
    """One-shot triage extraction from a transcript string or silent override payload."""
    if request.silent_triage and isinstance(request.silent_triage, dict):
        st = request.silent_triage
        result = TriageResponse(
            location=st.get("location"),
            chief_complaint=st.get("chief_complaint", "Silent Emergency Alert"),
            consciousness=st.get("consciousness", "responsive"),
            approx_patient_count=st.get("approx_patient_count", 1),
            hazards=st.get("hazards", []),
            missing_critical_info=[],
            is_silent_override=True,
            silent_category=st.get("silent_category"),
        )
    else:
        result = triage_service.extract(request.transcript)

    timestamp = datetime.now(timezone.utc).isoformat()

    location_str, gps_dict = LocationService.resolve_location(
        extracted_location=result.location,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    result.location = location_str

    if MissingField.LOCATION in result.missing_critical_info:
        result.missing_critical_info.remove(MissingField.LOCATION)

    gps = None
    if gps_dict:
        gps = GPSLocation(latitude=gps_dict["latitude"], longitude=gps_dict["longitude"])

    payload = {
        "triage": result.model_dump(),
        "timestamp": timestamp,
        "transcript": request.transcript,
        "gps_location": gps.model_dump() if gps else None,
    }

    # Broadcast to dispatchers
    await manager.broadcast_to_dispatchers(payload)

    return TriageAPIResponse(
        triage=result,
        timestamp=timestamp,
        transcript=request.transcript,
        gps_location=gps,
    )


class DispatchRequest(BaseModel):
    incident_timestamp: Optional[str] = None
    unit_id: str
    unit_name: str
    unit_type: str
    eta_minutes: int
    speed_mph: Optional[int] = 48


@app.post("/api/dispatch")
async def authorize_dispatch(request: DispatchRequest):
    """Authorize and broadcast unit dispatch status to callers and dispatchers."""
    payload = {
        "type": "unit_dispatched",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "incident_timestamp": request.incident_timestamp,
        "unit": {
            "id": request.unit_id,
            "name": request.unit_name,
            "type": request.unit_type,
            "eta_minutes": request.eta_minutes,
            "speed_mph": request.speed_mph,
        },
    }
    await manager.broadcast_to_callers(payload)
    await manager.broadcast_to_dispatchers(payload)
    logger.info("Unit %s (%s) authorized and dispatched.", request.unit_id, request.unit_type)
    return {"status": "dispatched", "payload": payload}


@app.get("/api/incidents")
async def get_incidents():
    """Return recent incident history."""
    return {"incidents": manager.get_history()}


from fastapi import Form


@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    """
    Transcribe an uploaded audio file using Groq Whisper.
    Returns the transcript text + triage extraction + GPS location.
    """
    audio_bytes = await file.read()
    transcript = transcription_service.transcribe_bytes(
        audio_bytes, filename=file.filename or "audio.webm"
    )

    if not transcript:
        return {"transcript": "", "error": "Transcription failed or returned empty."}

    # Also run triage extraction on the transcript
    result = triage_service.extract(transcript)
    timestamp = datetime.now(timezone.utc).isoformat()

    location_str, gps_dict = LocationService.resolve_location(
        extracted_location=result.location,
        latitude=latitude,
        longitude=longitude,
    )
    result.location = location_str

    if MissingField.LOCATION in result.missing_critical_info:
        result.missing_critical_info.remove(MissingField.LOCATION)

    payload = {
        "triage": result.model_dump(),
        "timestamp": timestamp,
        "transcript": transcript,
        "gps_location": gps_dict,
    }

    # Broadcast to dispatchers
    await manager.broadcast_to_dispatchers(payload)

    return {
        "transcript": transcript,
        "triage": result.model_dump(),
        "timestamp": timestamp,
        "gps_location": gps_dict,
    }


# ---------------------------------------------------------------------------
# WebSocket Endpoints
# ---------------------------------------------------------------------------

@app.websocket("/ws/caller")
async def caller_websocket(websocket: WebSocket):
    """
    Caller WebSocket — receives text OR binary audio data.

    Text messages  → treated as transcript, sent directly to triage.
    Binary messages → transcribed via Whisper first, then sent to triage.
    """
    await manager.connect_caller(websocket)
    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            transcript = None

            if "text" in message:
                # Direct text transcript
                transcript = message["text"]
                logger.info("Received text transcript from caller: %s", transcript[:100])

            elif "bytes" in message:
                # Binary audio data → transcribe with Whisper
                audio_bytes = message["bytes"]
                logger.info("Received audio data from caller: %d bytes", len(audio_bytes))

                # Notify caller that we're transcribing
                await manager.send_to_caller(websocket, {
                    "type": "status",
                    "status": "transcribing",
                    "message": "Transcribing your audio...",
                })

                transcript = transcription_service.transcribe_bytes(audio_bytes)

                if not transcript:
                    await manager.send_to_caller(websocket, {
                        "type": "error",
                        "message": "Could not transcribe audio. Please try again or type your message.",
                    })
                    continue

                # Send transcription back to caller
                await manager.send_to_caller(websocket, {
                    "type": "transcription",
                    "transcript": transcript,
                })

            if not transcript:
                continue

            # Extract triage from transcript
            result = triage_service.extract(transcript)
            timestamp = datetime.now(timezone.utc).isoformat()

            location_str, gps_dict = LocationService.resolve_location(
                extracted_location=result.location
            )
            result.location = location_str

            if MissingField.LOCATION in result.missing_critical_info:
                result.missing_critical_info.remove(MissingField.LOCATION)

            payload = {
                "triage": result.model_dump(),
                "timestamp": timestamp,
                "transcript": transcript,
                "gps_location": gps_dict,
            }

            # Send back to caller
            await manager.send_to_caller(websocket, {
                "type": "triage_result",
                **payload,
            })

            # Broadcast to all dispatchers
            await manager.broadcast_to_dispatchers(payload)

    except WebSocketDisconnect:
        manager.disconnect_caller(websocket)
    except Exception:
        logger.exception("Caller WebSocket error.")
        manager.disconnect_caller(websocket)


@app.websocket("/ws/dispatch")
async def dispatch_websocket(websocket: WebSocket):
    """
    Dispatcher WebSocket — receives real-time triage broadcasts.
    Dispatchers are read-only consumers; they don't send transcripts.
    """
    await manager.connect_dispatcher(websocket)
    try:
        while True:
            # Keep connection alive; dispatchers may send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect_dispatcher(websocket)
    except Exception:
        logger.exception("Dispatcher WebSocket error.")
        manager.disconnect_dispatcher(websocket)
