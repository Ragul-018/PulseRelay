import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for recording audio via the MediaRecorder API.
 *
 * Records audio from the user's microphone and returns it as a Blob
 * that can be sent to the backend for Whisper transcription.
 *
 * @returns {object}
 *   - isRecording: boolean
 *   - startRecording: () => Promise<void>
 *   - stopRecording: () => Promise<Blob | null>
 *   - error: string | null
 *   - audioBlob: Blob | null
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const resolveStopRef = useRef(null);
  const isStartingRef = useRef(false);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    isStartingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Safely determine supported format
      let options = {};
      let extension = '.webm';

      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
          extension = '.webm';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
          extension = '.webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
          extension = '.mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options = { mimeType: 'audio/wav' };
          extension = '.wav';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.extension = extension;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        blob.extension = extension;
        setAudioBlob(blob);
        setIsRecording(false);
        isStartingRef.current = false;

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Resolve the promise returned by stopRecording
        if (resolveStopRef.current) {
          resolveStopRef.current(blob);
          resolveStopRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        setError('Recording error occurred');
        setIsRecording(false);
        isStartingRef.current = false;
      };

      // Collect data every 250ms for smoother chunks
      mediaRecorder.start(250);
      setIsRecording(true);
      isStartingRef.current = false;
      return true;
    } catch (err) {
      isStartingRef.current = false;
      setIsRecording(false);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(err.message || 'Failed to start recording');
      }
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        resolveStopRef.current = resolve;
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          setIsRecording(false);
          resolve(null);
        }
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        resolve(null);
      }
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    audioBlob,
  };
}
