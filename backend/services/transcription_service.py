"""
PulseRelay Transcription Service
=================================
Uses Groq's Whisper API (whisper-large-v3-turbo) for fast, reliable
speech-to-text transcription from audio data.

This replaces browser-native Web Speech API which has limited
browser support and requires an internet connection to Google servers.
"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

from groq import Groq

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "whisper-large-v3-turbo"


class TranscriptionService:
    """
    Transcribes audio data using Groq's Whisper API.

    Parameters
    ----------
    api_key : str | None
        Groq API key. Falls back to ``GROQ_API_KEY`` env var.
    model : str
        Whisper model identifier.
    groq_client : Groq | None
        Optional pre-configured Groq client (for testing / DI).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        groq_client: Optional[Groq] = None,
    ) -> None:
        self.model = model

        if groq_client is not None:
            self._client = groq_client
        else:
            resolved_key = api_key or os.getenv("GROQ_API_KEY", "")
            self._client = Groq(api_key=resolved_key)

    def transcribe_bytes(self, audio_bytes: bytes, filename: str = "audio.webm") -> str:
        """
        Transcribe raw audio bytes.

        Parameters
        ----------
        audio_bytes : bytes
            Raw audio data (WebM, WAV, MP3, etc.).
        filename : str
            Filename hint for the audio format.

        Returns
        -------
        str
            The transcribed text, or empty string on failure.
        """
        if not audio_bytes or len(audio_bytes) < 300:
            logger.warning("Empty or truncated audio data received (%d bytes).", len(audio_bytes) if audio_bytes else 0)
            return ""

        try:
            # Determine appropriate suffix for temp file
            suffix = Path(filename).suffix
            if not suffix or suffix.lower() not in [".webm", ".mp4", ".wav", ".m4a", ".ogg", ".mp3"]:
                suffix = ".webm"

            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as audio_file:
                    transcription = self._client.audio.transcriptions.create(
                        file=(f"recording{suffix}", audio_file),
                        model=self.model,
                        language="en",
                        response_format="text",
                    )

                result = transcription.strip() if isinstance(transcription, str) else str(transcription).strip()
                logger.info("Transcription result (%d chars): %s", len(result), result[:100])
                return result

            finally:
                # Clean up temp file
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

        except Exception as e:
            logger.exception("Groq Whisper transcription failed: %s", e)
            return ""

    def transcribe_file(self, file_path: str) -> str:
        """
        Transcribe an audio file from disk.

        Parameters
        ----------
        file_path : str
            Path to the audio file.

        Returns
        -------
        str
            The transcribed text, or empty string on failure.
        """
        try:
            with open(file_path, "rb") as f:
                audio_bytes = f.read()
            return self.transcribe_bytes(audio_bytes, filename=Path(file_path).name)
        except Exception:
            logger.exception("Failed to read audio file: %s", file_path)
            return ""
