import React, { useState } from 'react';
import FleetDispatchSimulation from './FleetDispatchSimulation';
import HospitalCapacityMatrix from './HospitalCapacityMatrix';

/**
 * TriageCard — Dispatcher triage telemetry detail view.
 *
 * Displays full 4 Ws, interactive OpenStreetMap, severity badges, hazards,
 * missing telemetry action list, and quick action controls.
 *
 * @param {object} props
 * @param {object} props.data - The incident telemetry object.
 * @param {boolean} props.isLatest - Whether this is the active live call.
 * @param {number} props.incidentIndex - Incident sequence number.
 */
export default function TriageCard({
  data,
  isLatest = false,
  incidentIndex = 1,
  dispatchRecord = null,
  busyUnitIds = new Set(),
  onDispatchSuccess,
  onClearIncident,
  isCleared = false,
}) {
  const [selectedHospital, setSelectedHospital] = useState(null);

  if (!data) return null;

  const { triage, timestamp, transcript, gps_location } = data;

  const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const consciousnessConfig = {
    responsive:   { badge: 'badge-responsive',   icon: '🟢', label: 'RESPONSIVE', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    unresponsive: { badge: 'badge-unresponsive', icon: '🔴', label: 'UNRESPONSIVE - CRITICAL', bg: 'bg-red-500/15 border-red-500/40' },
    unclear:      { badge: 'badge-unclear',       icon: '🟡', label: 'UNCLEAR - VERIFY', bg: 'bg-amber-500/10 border-amber-500/30' },
  };

  const consciousness = consciousnessConfig[triage.consciousness] || consciousnessConfig.unclear;

  const lat = gps_location?.latitude;
  const lng = gps_location?.longitude;
  const hasGps = lat != null && lng != null;

  return (
    <div className="glass-card p-6 space-y-6 border-white/10 shadow-2xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-bold text-pulse-400">
            INCIDENT #{incidentIndex}
          </span>
          {isLatest && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-pulse-500/20 text-pulse-300 border border-pulse-500/40 animate-pulse">
              <span className="status-dot online" />
              LIVE CALL
            </span>
          )}
          <span className={consciousness.badge}>
            {consciousness.icon} {consciousness.label}
          </span>
          {(triage?.is_silent_override || transcript?.includes('SILENT TAP OVERRIDE')) && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/30 text-red-300 border border-red-500/50 animate-pulse shadow-lg">
              🤫 SILENT OVERRIDE (NON-VERBAL)
            </span>
          )}
        </div>

        <div className="text-right font-mono">
          <div className="text-xs text-gray-400">{formattedDate}</div>
          <div className="text-base text-gray-200 font-semibold">{formattedTime}</div>
        </div>
      </div>

      {/* Primary Location & Map Box */}
      <div className="bg-surface-900/80 p-4 rounded-xl border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Incident Location (Where)
            </span>
          </div>

          {hasGps && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-semibold underline underline-offset-2 transition-colors"
            >
              <span>Open in Google Maps</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-lg font-bold text-white tracking-wide">
            📍 {triage.location || (hasGps ? `GPS Pin: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Location Pending')}
          </p>

          {hasGps && (
            <div className="flex items-center gap-2 text-xs text-cyan-300/90 font-mono">
              <span className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40">
                🛰️ GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
          )}
        </div>

        {/* Embedded Map */}
        {hasGps && (
          <div className="mt-3 rounded-lg overflow-hidden border border-cyan-500/30 h-44 relative">
            <iframe
              title="Incident Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.008},${lng + 0.008},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}`}
              className="brightness-95 contrast-125 grayscale-[15%]"
            />
          </div>
        )}
      </div>

      {/* 4 Ws Operational Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WHAT — Chief Complaint */}
        <div className="bg-surface-800/60 p-4 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What (Complaint)</span>
          </div>
          <p className={`text-base font-semibold ${triage.chief_complaint ? 'text-gray-100' : 'text-gray-500 italic'}`}>
            {triage.chief_complaint || 'No complaint extracted'}
          </p>
        </div>

        {/* WHO — Patient Count */}
        <div className="bg-surface-800/60 p-4 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Who (Patient Count)</span>
          </div>
          <p className="text-base font-semibold text-gray-100">
            {triage.approx_patient_count !== null && triage.approx_patient_count !== undefined
              ? `👤 ${triage.approx_patient_count} patient${triage.approx_patient_count !== 1 ? 's' : ''}`
              : 'Unknown count'}
          </p>
        </div>

        {/* STATUS */}
        <div className="bg-surface-800/60 p-4 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Consciousness</span>
          </div>
          <div>
            <span className={consciousness.badge}>
              {consciousness.icon} {triage.consciousness}
            </span>
          </div>
        </div>
      </div>

      {/* Hazards & Missing Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hazards */}
        <div className="bg-surface-800/40 p-4 rounded-xl border border-red-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Hazards & Risks</span>
          </div>
          {triage.hazards && triage.hazards.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {triage.hazards.map((hazard, i) => (
                <span key={i} className="hazard-chip">
                  ⚠️ {hazard}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No environmental hazards identified</p>
          )}
        </div>

        {/* Missing Info */}
        <div className="bg-surface-800/40 p-4 rounded-xl border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Action Required / Missing Info</span>
          </div>
          {triage.missing_critical_info && triage.missing_critical_info.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {triage.missing_critical_info.map((field, i) => (
                <span key={i} className="missing-badge">
                  ❓ Ask for {field.replace('_', ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-400 font-medium">✓ All critical telemetry fields present</p>
          )}
        </div>
      </div>

      {/* Regional Hospital Bed & ICU Capacity Matrix */}
      <HospitalCapacityMatrix
        incidentGps={gps_location}
        chiefComplaint={triage?.chief_complaint}
        selectedHospitalId={selectedHospital?.id}
        onSelectHospital={(hosp) => setSelectedHospital(hosp)}
      />

      {/* Fleet Dispatch Simulation & Telemetry */}
      <FleetDispatchSimulation
        incidentData={data}
        dispatchRecord={dispatchRecord}
        busyUnitIds={busyUnitIds}
        selectedHospital={selectedHospital}
        onDispatchSuccess={onDispatchSuccess}
        onClearIncident={onClearIncident}
        isCleared={isCleared}
      />

      {/* Original Speech Transcript */}
      <details className="bg-surface-900/60 rounded-xl p-4 border border-white/5">
        <summary className="text-xs font-semibold text-gray-400 cursor-pointer hover:text-white transition-colors flex items-center gap-2">
          <svg className="w-4 h-4 text-pulse-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          Original Caller Speech Transcript
        </summary>
        <p className="mt-3 text-sm text-gray-300 leading-relaxed font-mono bg-black/40 rounded-lg p-3 border border-white/5">
          "{transcript}"
        </p>
      </details>
    </div>
  );
}
