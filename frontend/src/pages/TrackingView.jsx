import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import LiveDispatchMap from '../components/map/LiveDispatchMap';
import { useWebSocket } from '../hooks/useWebSocket';

const API_PORT = import.meta.env.VITE_API_PORT || 8000;
const WS_URL = `ws://${window.location.hostname || 'localhost'}:${API_PORT}/ws/caller`;

const SAMPLE_TRACKING_INCIDENT = {
  id: 'inc-demo-892',
  timestamp: new Date().toISOString(),
  transcript: "Emergency call: car collision near Anna Salai Thousand Lights Chennai. Driver unresponsive.",
  triage: {
    location: "Anna Salai, Thousand Lights, Chennai",
    chief_complaint: "Motor Vehicle Accident — Unresponsive Driver",
    consciousness: "unresponsive",
  },
  gps_location: { latitude: 13.0604, longitude: 80.2496 },
  unit: {
    id: '108-ALS-101',
    name: '108 ALS Ambulance 101',
    type: '108 Advanced Life Support',
    icon: '🚐',
    stationPos: [13.0827, 80.2707],
    eta_minutes: 3,
    speed_mph: 48,
  },
  target_hospital: {
    id: 'HOSP-APOLLO-GREAMS',
    name: 'Apollo Main Hospital (Greams Road)',
    address: '21 Greams Lane, Thousand Lights, Chennai',
    icu_beds_available: 8,
  },
};

/**
 * TrackingView — Live Uber-Style Emergency Vehicle Tracking Page (`/track/:incidentId`).
 */
export default function TrackingView() {
  const { incidentId } = useParams();

  const [incident, setIncident] = useState(SAMPLE_TRACKING_INCIDENT);
  const [dispatchedUnit, setDispatchedUnit] = useState(SAMPLE_TRACKING_INCIDENT.unit);
  const [targetHospital, setTargetHospital] = useState(SAMPLE_TRACKING_INCIDENT.target_hospital);
  const [etaSeconds, setEtaSeconds] = useState(180); // 3 minutes
  const [isCopied, setIsCopied] = useState(false);
  const [unitStatus, setUnitStatus] = useState('EN_ROUTE'); // EN_ROUTE | ON_SCENE

  // Fetch incident data from API on mount
  useEffect(() => {
    let isMounted = true;
    const fetchIncidentData = async () => {
      try {
        const targetId = incidentId || 'latest';
        const res = await fetch(`http://${window.location.hostname || 'localhost'}:${API_PORT}/api/incidents/${targetId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.incident) {
            setIncident(data.incident);
            if (data.incident.unit) setDispatchedUnit(data.incident.unit);
            if (data.incident.target_hospital) setTargetHospital(data.incident.target_hospital);
          }
        }
      } catch (err) {
        // Fallback to sample data
      }
    };
    fetchIncidentData();
    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  // WebSocket for real-time unit dispatch updates
  const handleWsMessage = (data) => {
    if (data.type === 'unit_dispatched') {
      if (data.unit) {
        setDispatchedUnit(data.unit);
        setEtaSeconds((data.unit.eta_minutes || 3) * 60);
      }
      if (data.target_hospital) {
        setTargetHospital(data.target_hospital);
      }
      setUnitStatus('EN_ROUTE');
    }
  };

  useWebSocket(WS_URL, { onMessage: handleWsMessage });

  // Countdown timer effect
  useEffect(() => {
    if (etaSeconds <= 0) {
      setUnitStatus('ON_SCENE');
      return;
    }
    const interval = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev <= 1) {
          setUnitStatus('ON_SCENE');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [etaSeconds]);

  const formatCountdown = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyShareLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const callerLat = incident?.gps_location?.latitude || 13.0604;
  const callerLng = incident?.gps_location?.longitude || 80.2496;
  const unitOrigin = dispatchedUnit?.stationPos || [13.0827, 80.2707];

  return (
    <div className="min-h-screen bg-mesh text-gray-100 font-sans pb-12">
      {/* Navbar Header */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-surface-900/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pulse-500 to-pulse-700 flex items-center justify-center shadow-lg shadow-pulse-500/30">
              <span className="text-xl">🚑</span>
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-wider block leading-none">PULSERELAY</span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider">LIVE EMERGENCY TRACKING</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/caller"
              className="px-3 py-1.5 rounded-lg bg-surface-800 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1"
            >
              <span>← Back to Caller</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status Header Banner */}
        <div className="bg-surface-900/90 border border-pulse-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">
                {dispatchedUnit?.icon || '🚑'}
              </span>
              <div>
                <h1 className="text-lg font-black text-white uppercase tracking-wide">
                  {dispatchedUnit?.name || '108 Emergency Ambulance Unit'}
                </h1>
                <p className="text-xs text-pulse-400 font-mono font-bold">
                  {dispatchedUnit?.type || '108 Advanced Life Support'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-mono uppercase">ESTIMATED ARRIVAL</div>
              <div className="text-2xl font-black font-mono text-emerald-400 animate-pulse">
                {unitStatus === 'ON_SCENE' ? 'ARRIVED ON SCENE' : formatCountdown(etaSeconds)}
              </div>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="status-dot online" />
              <span className="font-bold text-emerald-400 font-mono">
                {unitStatus === 'ON_SCENE' ? '🟢 AGENTS ON SCENE' : '⚡ EN ROUTE WITH GPS TRACKING'}
              </span>
            </div>

            <button
              onClick={handleCopyShareLink}
              className="px-3 py-1.5 rounded-lg bg-pulse-600/30 border border-pulse-500/40 text-pulse-300 hover:bg-pulse-600/50 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>📱</span>
              <span>{isCopied ? '✓ Link Copied!' : 'Share Live Tracking SMS Link'}</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Map Box */}
        <div className="bg-surface-900/90 border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Live Geodesic Telemetry Map & Routing
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              GPS: {callerLat.toFixed(4)}, {callerLng.toFixed(4)}
            </span>
          </div>

          {/* Embedded Leaflet Live Dispatch Map */}
          <div className="rounded-xl overflow-hidden border border-cyan-500/30 h-80 relative shadow-inner">
            <LiveDispatchMap
              origin={unitOrigin}
              destination={[callerLat, callerLng]}
              isDispatched={true}
              unitIcon={dispatchedUnit?.icon || '🚑'}
              onArrival={() => setUnitStatus('ON_SCENE')}
            />
          </div>
        </div>

        {/* Two-Column Telemetry & Target Hospital */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Hospital Telemetry Card */}
          <div className="bg-surface-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-xl">🏥</span>
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Assigned Emergency Destination Hospital
                </h3>
                <p className="text-sm font-bold text-white">
                  {targetHospital?.name || 'Apollo Main Hospital (Greams Road)'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-gray-300 flex items-center gap-1.5">
                <span>📍</span>
                <span>{targetHospital?.address || '21 Greams Lane, Thousand Lights, Chennai'}</span>
              </p>

              <div className="flex items-center justify-between bg-surface-950/80 p-2.5 rounded-lg border border-white/5 font-mono">
                <span className="text-gray-400">ICU Bed Telemetry:</span>
                <span className="font-bold text-emerald-400">
                  🟢 {targetHospital?.icu_beds_available ?? 8} ICU Beds Reserved
                </span>
              </div>
            </div>
          </div>

          {/* Caller De-escalation & Direct Contact Card */}
          <div className="bg-surface-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-xl">🛡️</span>
              <div>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  First Responder Instructions
                </h3>
                <p className="text-sm font-bold text-white">
                  Help is on the way. Stay calm.
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Keep your phone line clear for dispatch callbacks.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>If safe, turn on porch lights or wave to signal the ambulance.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Do not move unresponsive patients unless there is active fire or hazard.</span>
              </li>
            </ul>

            <div className="pt-1">
              <a
                href="tel:108"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <span>📞</span>
                <span>Call Emergency Dispatch Direct (108)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
