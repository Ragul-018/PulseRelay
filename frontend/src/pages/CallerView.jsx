import React, { useState, useCallback, useRef, useEffect } from 'react';
import VoiceButton from '../components/VoiceButton';
import SilentTapDrawer from '../components/SilentTapDrawer';
import SmsFallbackModal from '../components/SmsFallbackModal';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useWebSocket } from '../hooks/useWebSocket';

const API_PORT = import.meta.env.VITE_API_PORT || 8000;
const WS_URL = `ws://${window.location.hostname || 'localhost'}:${API_PORT}/ws/caller`;
const API_BASE = `http://${window.location.hostname || 'localhost'}:${API_PORT}`;

/**
 * CallerView — Ultra-minimalist de-escalation screen with Zero-Speech Silent Tap Override
 * & Low-Bandwidth SMS Fallback Generator.
 */
export default function CallerView() {
  const [status, setStatus] = useState('idle'); // idle | recording | transcribing | processing | done | silent_active | error
  const [transcript, setTranscript] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);

  // Modal & Drawer States
  const [isSilentDrawerOpen, setIsSilentDrawerOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [activeSilentCategory, setActiveSilentCategory] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Synchronized Dispatcher Unit State
  const [dispatchedUnit, setDispatchedUnit] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(0);

  // Countdown timer for dispatched unit
  useEffect(() => {
    if (!dispatchedUnit || etaSeconds <= 0) return;
    const interval = setInterval(() => {
      setEtaSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatchedUnit, etaSeconds]);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setIsSmsModalOpen(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automatically request GPS location on mount
  React.useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('GPS location access denied or unavailable:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const {
    isRecording,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useAudioRecorder();

  const {
    isSupported: isSpeechSupported,
    transcript: speechTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Sync live browser SpeechRecognition text into transcript state while recording
  useEffect(() => {
    if (isRecording && speechTranscript) {
      setTranscript(speechTranscript);
    }
  }, [speechTranscript, isRecording]);

  const handleMessage = useCallback((data) => {
    if (data.type === 'transcription') {
      // Whisper transcription came back
      setTranscript(data.transcript);
      setStatus('processing');
    } else if (data.type === 'triage_result') {
      setTriageResult(data.triage);
      setTranscript(data.transcript || transcript);
      setStatus('done');
    } else if (data.type === 'unit_dispatched') {
      // Real-time Unit Dispatched notification from Dispatcher
      setDispatchedUnit(data.unit);
      setEtaSeconds((data.unit?.eta_minutes || 3) * 60);
    } else if (data.type === 'status') {
      if (data.status === 'transcribing') {
        setStatus('transcribing');
      }
    } else if (data.type === 'error') {
      setErrorMsg(data.message || 'An error occurred');
      setStatus('error');
    }
  }, [transcript]);

  const { isConnected, sendMessage } = useWebSocket(WS_URL, {
    onMessage: handleMessage,
  });

  // -----------------------------------------------------------------------
  // Silent Tap Override flow (Non-verbal / Active threat)
  // -----------------------------------------------------------------------

  const handleSilentCategorySelect = async (category) => {
    setIsSilentDrawerOpen(false);
    setActiveSilentCategory(category);
    setStatus('silent_active');

    const silentTranscript = `[SILENT TAP OVERRIDE] Category: ${category.title} (${category.id})`;
    setTranscript(silentTranscript);

    const payloadTriage = {
      location: gpsCoords
        ? `GPS Pin: ${gpsCoords.latitude.toFixed(4)}, ${gpsCoords.longitude.toFixed(4)} (Chennai Sector)`
        : 'Chennai, Tamil Nadu, India (GPS Attached)',
      chief_complaint: category.chief_complaint,
      consciousness: category.consciousness,
      approx_patient_count: category.patient_count,
      hazards: category.hazards,
      missing_critical_info: [],
      is_silent_override: true,
      silent_category: category.id,
    };

    setTriageResult(payloadTriage);

    const incidentTimestamp = new Date().toISOString();

    // 1. Post Silent Triage to backend (broadcasts telemetry to Dispatchers)
    try {
      await fetch(`${API_BASE}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: silentTranscript,
          latitude: gpsCoords?.latitude || 13.0827,
          longitude: gpsCoords?.longitude || 80.2707,
          silent_triage: payloadTriage,
        }),
      });
    } catch (err) {
      console.warn('Backend connection offline, SMS fallback ready:', err);
    }

    // 2. Automatically send unit dispatch request for the specific silent emergency clicked
    const silentUnitMapping = {
      INTRUDER: {
        unit_id: 'TN-POLICE-4',
        unit_name: 'Chennai Police Rapid Unit 4',
        unit_type: 'Patrol / CPR Unit',
        eta_minutes: 2,
        speed_mph: 55,
      },
      FIRE: {
        unit_id: 'TN-FIRE-5',
        unit_name: 'TN Fire & Rescue Engine 5',
        unit_type: 'Heavy Rescue Engine',
        eta_minutes: 4,
        speed_mph: 50,
      },
      BLEEDING: {
        unit_id: '108-ALS-101',
        unit_name: '108 ALS Ambulance 101',
        unit_type: '108 Advanced Life Support',
        eta_minutes: 3,
        speed_mph: 48,
      },
      CHOKING: {
        unit_id: '108-ALS-101',
        unit_name: '108 ALS Ambulance 101',
        unit_type: '108 Advanced Life Support',
        eta_minutes: 3,
        speed_mph: 48,
      },
    };

    const targetUnit = silentUnitMapping[category.id] || silentUnitMapping.BLEEDING;

    try {
      const dispatchRes = await fetch(`${API_BASE}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_timestamp: incidentTimestamp,
          unit_id: targetUnit.unit_id,
          unit_name: targetUnit.unit_name,
          unit_type: targetUnit.unit_type,
          eta_minutes: targetUnit.eta_minutes,
          speed_mph: targetUnit.speed_mph,
        }),
      });

      if (dispatchRes.ok) {
        setDispatchedUnit(targetUnit);
        setEtaSeconds(targetUnit.eta_minutes * 60);
      }
    } catch (err) {
      console.warn('Silent auto-dispatch request warning:', err);
    }
  };

  // -----------------------------------------------------------------------
  // Voice recording flow (Dual engine: Live WebSpeech + Whisper backend)
  // -----------------------------------------------------------------------

  const handleVoiceToggle = async () => {
    if (isRecording) {
      // 1. Stop live browser listening and audio recorder
      if (isSpeechSupported) {
        stopListening();
      }
      const audioBlob = await stopRecording();
      const liveCapturedTranscript = speechTranscript || transcript;

      setStatus('transcribing');
      setErrorMsg('');

      let resolvedTranscript = liveCapturedTranscript;

      // 2. Try backend Groq Whisper for maximum precision audio transcription
      if (audioBlob && audioBlob.size > 100) {
        try {
          const formData = new FormData();
          const ext = audioBlob.extension || '.webm';
          formData.append('file', audioBlob, `recording${ext}`);
          if (gpsCoords) {
            formData.append('latitude', gpsCoords.latitude);
            formData.append('longitude', gpsCoords.longitude);
          }

          const response = await fetch(`${API_BASE}/api/transcribe`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.transcript && result.transcript.trim()) {
              resolvedTranscript = result.transcript;
              setTranscript(result.transcript);

              if (result.triage) {
                setTriageResult(result.triage);
                setStatus('done');
                return;
              }
            }
          }
        } catch (err) {
          console.warn('Backend Whisper transcription request failed, using WebSpeech fallback:', err);
        }
      }

      // 3. Fallback to live captured transcript if audio upload failed or returned empty
      if (resolvedTranscript && resolvedTranscript.trim()) {
        setTranscript(resolvedTranscript);
        setStatus('processing');

        try {
          const response = await fetch(`${API_BASE}/api/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: resolvedTranscript,
              latitude: gpsCoords?.latitude,
              longitude: gpsCoords?.longitude,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            setTriageResult(result.triage);
            setStatus('done');
          } else {
            // Show transcript even if triage extraction encounters error
            setStatus('done');
          }
        } catch (err) {
          console.error('Triage extraction error:', err);
          setStatus('done');
        }
      } else {
        setErrorMsg(recorderError || 'No speech detected. Please speak clearly or type your emergency message.');
        setStatus('error');
      }
    } else {
      // Start recording & listening
      setTranscript('');
      setTriageResult(null);
      setErrorMsg('');

      if (isSpeechSupported) {
        resetTranscript();
        startListening();
      }

      const started = await startRecording();
      if (started) {
        setStatus('recording');
      } else {
        if (isSpeechSupported) stopListening();
        setStatus('error');
        setErrorMsg(recorderError || 'Microphone access failed. Please check permissions.');
      }
    }
  };

  // -----------------------------------------------------------------------
  // Text input flow (fallback)
  // -----------------------------------------------------------------------

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setStatus('processing');
    setTranscript(textInput.trim());
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textInput.trim(),
          latitude: gpsCoords?.latitude,
          longitude: gpsCoords?.longitude,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();
      setTriageResult(result.triage);
      setStatus('done');
      setTextInput('');
    } catch (err) {
      console.error('Triage error:', err);
      setErrorMsg('Failed to process. Please try again.');
      setStatus('error');
    }
  };

  // -----------------------------------------------------------------------
  // UI state
  // -----------------------------------------------------------------------

  const getInstruction = () => {
    switch (status) {
      case 'idle':
        return { main: 'Tell us what happened', sub: 'Tap the microphone and describe the emergency' };
      case 'recording':
        return { main: 'We\'re listening', sub: 'Take a breath. Speak when you\'re ready.' };
      case 'transcribing':
        return { main: 'Processing your voice...', sub: 'Converting your speech to text.' };
      case 'processing':
        return { main: 'Analyzing...', sub: 'We\'re extracting critical information now.' };
      case 'done':
        return { main: 'Help is on the way', sub: 'Stay on the line. Stay safe.' };
      case 'error':
        return { main: 'Let\'s try again', sub: errorMsg || 'Something went wrong. You can also type your message.' };
      default:
        return { main: 'Tell us what happened', sub: 'Tap the microphone and describe the emergency' };
    }
  };

  const instruction = getInstruction();

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background breathing glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: status === 'done'
            ? 'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.08) 0%, transparent 60%)'
            : status === 'recording'
            ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.06) 0%, transparent 60%)'
            : status === 'error'
            ? 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.06) 0%, transparent 60%)'
            : 'radial-gradient(circle at 50% 50%, rgba(92, 124, 250, 0.06) 0%, transparent 60%)',
          animation: 'breathe 4s ease-in-out infinite',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pulse-500 to-pulse-700 flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-400 tracking-wider">PULSERELAY</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Silent Tap Quick Button */}
          <button
            onClick={() => setIsSilentDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-all shadow-md"
          >
            <span>🤫</span>
            <span className="hidden sm:inline">Silent Emergency</span>
          </button>

          {/* SMS Low Signal Button */}
          <button
            onClick={() => setIsSmsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 text-xs font-semibold transition-all shadow-md"
          >
            <span>📡</span>
            <span className="hidden sm:inline">SMS Fallback</span>
          </button>

          <a href="/dispatcher" className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1">
            Dispatcher →
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg w-full mt-10">

        {/* Live Synchronized Unit Dispatched Banner */}
        {dispatchedUnit && (
          <div className="w-full bg-gradient-to-r from-emerald-950 via-gray-900 to-surface-900 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl animate-slide-up space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl animate-pulse">
                  🚑
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {dispatchedUnit.name || 'Emergency Unit'} Dispatched
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    {dispatchedUnit.type || 'First Responders'} — En Route to Location
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-gray-400 uppercase">Live ETA</div>
                <div className="text-base font-bold text-emerald-300">
                  {Math.floor(etaSeconds / 60)}:{(etaSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20 pt-2">
              <p className="text-xs text-gray-300 italic">
                "Stay calm. First responders are navigating to your GPS coordinates."
              </p>
              <a
                href="/track"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all"
              >
                <span>📱</span>
                <span>Open Live Uber-Style Tracking</span>
              </a>
            </div>
          </div>
        )}

        {/* Status icon for "done" state */}
        {status === 'done' && (
          <div className="animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-2">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        )}

        {/* Main instruction */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="caller-instruction">
            {status === 'silent_active' ? 'Silent Emergency Alert Sent' : instruction.main}
          </h1>
          <p className="caller-sub">
            {status === 'silent_active'
              ? 'Dispatchers notified with your location. Stay safe & silent.'
              : instruction.sub}
          </p>
        </div>

        {/* Silent Tap Active Survival Card */}
        {status === 'silent_active' && activeSilentCategory && (
          <div className="w-full bg-gray-900/90 border border-red-500/40 rounded-3xl p-6 shadow-2xl animate-slide-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeSilentCategory.icon}</span>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {activeSilentCategory.title}
                  </h3>
                  <p className="text-xs text-red-400 font-semibold">
                    🚨 SILENT DISPATCH ALERT ACTIVE
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                Non-Verbal
              </span>
            </div>

            {/* Survival step-by-step instructions */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Immediate Survival Actions:
              </h4>
              {activeSilentCategory.guidelines.map((guide) => (
                <div key={guide.step} className="flex items-start gap-3 bg-black/40 p-3 rounded-xl border border-gray-800">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs font-bold">
                    {guide.step}
                  </span>
                  <p className="text-xs text-gray-200 leading-relaxed pt-0.5">
                    {guide.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setIsSmsModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>📡</span>
                <span>Send SMS Backup to 911 (Low Signal)</span>
              </button>

              <button
                onClick={() => setStatus('idle')}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-center pt-1"
              >
                ← Return to Main Voice Screen
              </button>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {status === 'recording' && (
          <div className="w-full glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-6 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                <span className="w-1.5 h-7 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                <span className="w-1.5 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
              </div>
              <span className="text-sm font-medium text-red-400 uppercase tracking-wider">
                Recording audio...
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Tap the button again when you're done speaking.
            </p>
          </div>
        )}

        {/* Transcribing / Processing indicator */}
        {(status === 'transcribing' || status === 'processing') && (
          <div className="w-full glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <span className="status-dot processing" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                {status === 'transcribing' ? 'Transcribing with Whisper...' : 'Extracting triage data...'}
              </span>
            </div>
            {transcript && (
              <p className="text-gray-300 leading-relaxed text-lg">
                "{transcript}"
              </p>
            )}
            {!transcript && (
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-pulse-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-pulse-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-pulse-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        )}

        {/* Triage result summary for caller */}
        {status === 'done' && triageResult && (
          <div className="w-full glass-card p-6 animate-slide-up border-emerald-500/20">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
              Report received
            </h2>
            {transcript && (
              <p className="text-gray-400 text-sm mb-3 italic">"{transcript}"</p>
            )}
            <div className="space-y-2">
              {triageResult.location && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-cyan-400">📍</span>
                  <span>{triageResult.location}</span>
                </div>
              )}
              {triageResult.chief_complaint && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-amber-400">⚡</span>
                  <span>{triageResult.chief_complaint}</span>
                </div>
              )}
              {triageResult.approx_patient_count != null && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-purple-400">👤</span>
                  <span>{triageResult.approx_patient_count} patient{triageResult.approx_patient_count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice button — always shows except when done or silent */}
        {status !== 'done' && status !== 'silent_active' && status !== 'transcribing' && status !== 'processing' && (
          <VoiceButton
            isListening={isRecording}
            onToggle={handleVoiceToggle}
            disabled={status === 'transcribing' || status === 'processing'}
          />
        )}

        {/* Quick Silent Tap Drawer Trigger Card */}
        {status === 'idle' && (
          <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-gray-900 border border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer shadow-lg"
               onClick={() => setIsSilentDrawerOpen(true)}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤫</span>
              <div>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Cannot Speak or In Active Danger?
                </h4>
                <p className="text-xs text-gray-400">
                  Tap for Zero-Speech Silent Override pictograms
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-400">Tap →</span>
          </div>
        )}

        {/* Recorder error */}
        {recorderError && (
          <div className="w-full glass-card p-4 border-red-500/20 animate-fade-in">
            <p className="text-sm text-red-400">{recorderError}</p>
          </div>
        )}

        {/* Text input — fallback */}
        {(status === 'idle' || status === 'error') && (
          <div className="w-full">
            <details open={status === 'error'}>
              <summary className="text-center text-sm text-gray-600 cursor-pointer hover:text-gray-400 transition-colors mb-4">
                {status === 'error' ? 'Type your emergency instead' : 'Can\'t speak? Type instead'}
              </summary>
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <div className="glass-card p-1">
                  <textarea
                    id="text-input"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Describe the emergency — what happened, where are you..."
                    className="w-full bg-transparent text-gray-200 placeholder-gray-600 p-4 rounded-xl resize-none focus:outline-none text-sm"
                    rows={3}
                  />
                </div>
                <button
                  id="submit-text"
                  type="submit"
                  disabled={!textInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pulse-600 to-pulse-700 text-white font-semibold hover:from-pulse-500 hover:to-pulse-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Send Report
                </button>
              </form>
            </details>
          </div>
        )}

        {/* Reset button after done */}
        {status === 'done' && (
          <button
            id="new-report-btn"
            onClick={() => {
              setStatus('idle');
              setTriageResult(null);
              setTranscript('');
              setErrorMsg('');
              setActiveSilentCategory(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4"
          >
            Report another emergency
          </button>
        )}

        {/* Error retry */}
        {status === 'error' && (
          <button
            onClick={() => {
              setStatus('idle');
              setErrorMsg('');
            }}
            className="text-sm text-pulse-400 hover:text-pulse-300 transition-colors underline underline-offset-4"
          >
            Try voice again
          </button>
        )}
      </div>

      {/* Emergency fallback footer */}
      <div className="absolute bottom-0 left-0 right-0 py-3 text-center bg-gray-950/80 border-t border-gray-900">
        <p className="text-xs text-gray-500">
          In extreme danger, call{' '}
          <a
            href="tel:911"
            className="text-red-400 font-bold hover:text-red-300 transition-colors"
          >
            911
          </a>
          {' '}or tap{' '}
          <button
            onClick={() => setIsSmsModalOpen(true)}
            className="text-amber-400 font-bold hover:underline"
          >
            SMS Fallback
          </button>
        </p>
      </div>

      {/* Zero-Speech Silent Tap Drawer */}
      <SilentTapDrawer
        isOpen={isSilentDrawerOpen}
        onClose={() => setIsSilentDrawerOpen(false)}
        onSelectCategory={handleSilentCategorySelect}
      />

      {/* Low Bandwidth SMS Fallback Modal */}
      <SmsFallbackModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        gpsCoords={gpsCoords}
        triageCategory={activeSilentCategory?.id || 'CRISIS'}
        consciousness={triageResult?.consciousness || 'unclear'}
        transcript={transcript}
      />
    </div>
  );
}
