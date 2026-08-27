import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TriageCard from '../components/TriageCard';
import { useWebSocket } from '../hooks/useWebSocket';

const API_PORT = import.meta.env.VITE_API_PORT || 8000;
const WS_URL = `ws://${window.location.hostname || 'localhost'}:${API_PORT}/ws/dispatch`;

/**
 * DispatcherView — Professional Master-Detail Emergency Triage Console.
 *
 * Architecture:
 * - Master Incident Feed (Left): High-density filterable queue of incoming emergency calls.
 * - Detail Telemetry Card (Right): Full 4 Ws, interactive map, hazards, transcript & dispatch actions for selected incident.
 */
const SAMPLE_INCIDENT = {
  timestamp: '2026-08-27T10:50:00Z',
  transcript: "Vehicle collision on Anna Salai near Thousand Lights, Chennai. Driver is unresponsive and bleeding from head. Gasoline leak reported.",
  triage: {
    location: "Anna Salai, Thousand Lights, Chennai, Tamil Nadu",
    chief_complaint: "Vehicle Collision — Severe Bleeding & Unresponsive Driver",
    consciousness: "unresponsive",
    approx_patient_count: 2,
    hazards: ["Fuel Leak", "Traffic Obstruction", "Trapped Victim"],
    missing_critical_info: [],
  },
  gps_location: { latitude: 13.0604, longitude: 80.2496 },
};

export default function DispatcherView() {
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = localStorage.getItem('pulserelay_incident_objects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [SAMPLE_INCIDENT];
  });

  const [selectedId, setSelectedId] = useState(SAMPLE_INCIDENT.timestamp);
  const [filter, setFilter] = useState('ALL');

  // Per-Incident Dispatch Registry State: { [incidentTimestamp]: { unit, status, dispatchedAt } }
  const [dispatchedRegistry, setDispatchedRegistry] = useState(() => {
    try {
      const saved = localStorage.getItem('pulserelay_dispatched_registry');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [clearedIncidentIds, setClearedIncidentIds] = useState(() => {
    try {
      const saved = localStorage.getItem('pulserelay_cleared_incidents');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pulserelay_cleared_incidents', JSON.stringify(Array.from(clearedIncidentIds)));
    } catch (e) {}
  }, [clearedIncidentIds]);

  useEffect(() => {
    try {
      localStorage.setItem('pulserelay_dispatched_registry', JSON.stringify(dispatchedRegistry));
    } catch (e) {}
  }, [dispatchedRegistry]);

  useEffect(() => {
    try {
      localStorage.setItem('pulserelay_incident_objects', JSON.stringify(incidents));
    } catch (e) {}
  }, [incidents]);

  const mergeIncidents = useCallback((incomingList) => {
    if (!Array.isArray(incomingList)) return;
    setIncidents((prev) => {
      const map = new Map();
      prev.forEach((inc) => {
        if (inc && inc.timestamp) map.set(inc.timestamp, inc);
      });
      incomingList.forEach((inc) => {
        if (inc && inc.timestamp) map.set(inc.timestamp, inc);
      });
      return Array.from(map.values());
    });
  }, []);

  const handleDispatchUnit = useCallback((incidentTimestamp, unit) => {
    setDispatchedRegistry((prev) => ({
      ...prev,
      [incidentTimestamp]: {
        unit,
        status: 'EN_ROUTE',
        dispatchedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const handleClearIncident = useCallback((incidentTimestamp) => {
    setClearedIncidentIds((prev) => {
      const next = new Set(prev);
      next.add(incidentTimestamp);
      return next;
    });

    // Notify backend so all connected dispatchers receive the event_cleared broadcast
    const ports = [API_PORT, 8000, 8001];
    for (const port of ports) {
      try {
        fetch(`http://${window.location.hostname || 'localhost'}:${port}/api/clear_incident`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incident_timestamp: incidentTimestamp }),
        }).catch(() => {});
      } catch (e) {}
    }

    // Release unit from registry so it returns to available fleet pool
    setDispatchedRegistry((prev) => {
      const copy = { ...prev };
      delete copy[incidentTimestamp];
      return copy;
    });
  }, []);

  // Compute active busy unit IDs
  const busyUnitIds = useMemo(() => {
    const ids = new Set();
    Object.entries(dispatchedRegistry).forEach(([ts, entry]) => {
      if (!clearedIncidentIds.has(ts) && entry?.unit?.id) {
        ids.add(entry.unit.id);
      }
    });
    return ids;
  }, [dispatchedRegistry, clearedIncidentIds]);

  const [stats, setStats] = useState({
    total: 1,
    responsive: 0,
    unresponsive: 1,
    unclear: 0,
  });

  const handleMessage = useCallback((data) => {
    if (data.type === 'triage_update') {
      mergeIncidents([data]);

      // Auto-select latest incident
      setSelectedId(data.timestamp);

      // Update stats
      setStats((prev) => {
        const consciousness = data.triage?.consciousness || 'unclear';
        return {
          total: prev.total + 1,
          responsive: prev.responsive + (consciousness === 'responsive' ? 1 : 0),
          unresponsive: prev.unresponsive + (consciousness === 'unresponsive' ? 1 : 0),
          unclear: prev.unclear + (consciousness === 'unclear' ? 1 : 0),
        };
      });
    } else if (data.type === 'history') {
      if (data.cleared_timestamps && Array.isArray(data.cleared_timestamps)) {
        setClearedIncidentIds((prev) => {
          const next = new Set(prev);
          data.cleared_timestamps.forEach((ts) => next.add(ts));
          return next;
        });
      }
      if (data.incidents && Array.isArray(data.incidents)) {
        mergeIncidents(data.incidents);

        const reversed = [...data.incidents].reverse();
        if (reversed.length > 0) {
          setSelectedId(reversed[0].timestamp);
        }

        // Recompute stats
        const newStats = { total: 0, responsive: 0, unresponsive: 0, unclear: 0 };
        reversed.forEach((inc) => {
          newStats.total++;
          const c = inc.triage?.consciousness || 'unclear';
          if (c === 'responsive') newStats.responsive++;
          else if (c === 'unresponsive') newStats.unresponsive++;
          else newStats.unclear++;
        });
        setStats(newStats);
      }
    } else if (data.type === 'incident_cleared') {
      if (data.incident_timestamp) {
        setClearedIncidentIds((prev) => {
          const next = new Set(prev);
          next.add(data.incident_timestamp);
          return next;
        });
      }
    }
  }, [mergeIncidents]);

  const { isConnected } = useWebSocket(WS_URL, {
    onMessage: handleMessage,
  });

  // Fetch initial incidents via REST API on mount
  React.useEffect(() => {
    const fetchIncidents = async () => {
      const ports = [API_PORT, 8000, 8001];
      for (const port of ports) {
        try {
          const res = await fetch(`http://${window.location.hostname || 'localhost'}:${port}/api/incidents`);
          if (res.ok) {
            const data = await res.json();
            if (data.cleared_timestamps && Array.isArray(data.cleared_timestamps)) {
              setClearedIncidentIds((prev) => {
                const next = new Set(prev);
                data.cleared_timestamps.forEach((ts) => next.add(ts));
                return next;
              });
            }
            if (data.incidents && Array.isArray(data.incidents) && data.incidents.length > 0) {
              mergeIncidents(data.incidents);

              const reversed = [...data.incidents].reverse();
              setSelectedId(reversed[0].timestamp);

              const newStats = { total: 0, responsive: 0, unresponsive: 0, unclear: 0 };
              reversed.forEach((inc) => {
                newStats.total++;
                const c = inc.triage?.consciousness || 'unclear';
                if (c === 'responsive') newStats.responsive++;
                else if (c === 'unresponsive') newStats.unresponsive++;
                else newStats.unclear++;
              });
              setStats(newStats);
              break;
            }
          }
        } catch (e) {
          // Continue trying next port
        }
      }
    };
    fetchIncidents();
  }, []);

  // Demo Incident Generator for immediate dispatcher testing
  const handleGenerateDemoIncident = async () => {
    const demoPayload = {
      transcript: "Emergency! Car crash on Anna Salai, T. Nagar Signal, Chennai. Driver is unresponsive and trapped. Possible fuel leak.",
      triage: {
        location: "Anna Salai, T. Nagar, Chennai, Tamil Nadu",
        chief_complaint: "Motor Vehicle Accident — Unresponsive Driver",
        consciousness: "unresponsive",
        approx_patient_count: 2,
        hazards: ["Active Fuel Leak", "Trapped Victim", "Traffic Obstruction"],
        missing_critical_info: [],
      },
      gps_location: { latitude: 13.0418, longitude: 80.2341 },
      timestamp: new Date().toISOString(),
    };

    try {
      const ports = [API_PORT, 8000, 8001];
      for (const port of ports) {
        try {
          await fetch(`http://${window.location.hostname || 'localhost'}:${port}/api/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: demoPayload.transcript,
              latitude: 13.0418,
              longitude: 80.2341,
            }),
          });
          break;
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Demo fetch failed:", e);
    }

    // Immediately insert into local state as fallback
    setIncidents((prev) => [demoPayload, ...prev]);
    setSelectedId(demoPayload.timestamp);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      unresponsive: prev.unresponsive + 1,
    }));
  };

  // Filtered incidents queue — sorted newest first
  const filteredIncidents = useMemo(() => {
    const sortByNewest = (arr) =>
      [...arr].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filter === 'CLEARED') {
      return sortByNewest(incidents.filter((inc) => clearedIncidentIds.has(inc.timestamp)));
    }

    const activeCalls = incidents.filter((inc) => !clearedIncidentIds.has(inc.timestamp));

    if (filter === 'ALL' || filter === 'ACTIVE') return sortByNewest(activeCalls);
    return sortByNewest(activeCalls.filter((inc) => {
      const c = inc.triage?.consciousness || 'unclear';
      return c.toUpperCase() === filter;
    }));
  }, [incidents, filter, clearedIncidentIds]);


  // Selected incident object
  const selectedIncident = useMemo(() => {
    if (!filteredIncidents.length) return null;
    return filteredIncidents.find((inc) => inc.timestamp === selectedId) || filteredIncidents[0];
  }, [filteredIncidents, selectedId]);

  const selectedIndex = useMemo(() => {
    if (!selectedIncident) return 1;
    const index = filteredIncidents.findIndex((inc) => inc.timestamp === selectedIncident.timestamp);
    return index !== -1 ? index + 1 : 1;
  }, [filteredIncidents, selectedIncident]);

  return (
    <div className="min-h-screen bg-mesh text-gray-100 font-sans">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-surface-900/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pulse-500 to-pulse-700 flex items-center justify-center shadow-lg shadow-pulse-500/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <span className="text-base font-extrabold text-white tracking-widest block leading-none">PULSERELAY</span>
                <span className="text-[10px] text-pulse-400 font-mono tracking-wider">COMMAND & CONTROL</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Demo Crisis Trigger Button */}
            <button
              onClick={handleGenerateDemoIncident}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pulse-600/30 border border-pulse-500/50 text-pulse-300 hover:bg-pulse-600/50 text-xs font-bold transition-all shadow-md animate-pulse"
            >
              <span>⚡</span>
              <span>Trigger Demo Incident</span>
            </button>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-800 border border-white/10">
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
              <span className={`text-xs font-bold font-mono ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {isConnected ? 'LIVE RELAY ONLINE' : 'DISCONNECTED'}
              </span>
            </div>

            <a
              href="/caller"
              className="text-xs text-gray-400 hover:text-white font-medium transition-colors flex items-center gap-1"
            >
              <span>Caller Interface</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Total Emergency Calls"
            value={stats.total}
            icon="📊"
            color="text-pulse-400"
            border="border-pulse-500/30"
          />
          <StatTile
            label="Critical (Unresponsive)"
            value={stats.unresponsive}
            icon="🔴"
            color="text-red-400"
            border="border-red-500/30"
          />
          <StatTile
            label="Unclear (Needs Verification)"
            value={stats.unclear}
            icon="🟡"
            color="text-amber-400"
            border="border-amber-500/30"
          />
          <StatTile
            label="Responsive"
            value={stats.responsive}
            icon="🟢"
            color="text-emerald-400"
            border="border-emerald-500/30"
          />
        </div>

        {/* Master-Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Master Incident Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Filter Bar */}
            <div className="glass-card-light p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Emergency Queue ({filteredIncidents.length})
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Select item to inspect
                </span>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['ACTIVE', 'CLEARED', 'ALL', 'UNRESPONSIVE', 'UNCLEAR', 'RESPONSIVE'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      filter === f
                        ? 'bg-pulse-600 text-white shadow-md shadow-pulse-600/30'
                        : 'bg-surface-800 text-gray-400 hover:text-white hover:bg-surface-700'
                    }`}
                  >
                    {f} {f === 'CLEARED' && clearedIncidentIds.size > 0 ? `(${clearedIncidentIds.size})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Queue List */}
            <div className="space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((incident, i) => {
                  const isSelected = selectedIncident && selectedIncident.timestamp === incident.timestamp;
                  const isLatest = i === 0 && incident.timestamp === incidents[0]?.timestamp;
                  const actualNumber = i + 1;
                  const dispatchRecord = dispatchedRegistry[incident.timestamp];

                  const isCleared = clearedIncidentIds.has(incident.timestamp);

                  return (
                    <QueueItemCard
                      key={`${incident.timestamp}-${i}`}
                      data={incident}
                      incidentNumber={actualNumber}
                      isSelected={isSelected}
                      isLatest={isLatest}
                      isCleared={isCleared}
                      dispatchRecord={dispatchRecord}
                      onClick={() => setSelectedId(incident.timestamp)}
                      onClear={() => handleClearIncident(incident.timestamp)}
                    />
                  );
                })
              ) : (
                <div className="glass-card-light p-8 text-center space-y-2">
                  <div className="text-3xl">📡</div>
                  <p className="text-sm font-semibold text-gray-400">No matching incidents</p>
                  <p className="text-xs text-gray-600">
                    Incoming emergency calls will appear here in real time.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Telemetry View (7 cols) */}
          <div className="lg:col-span-7">
            {selectedIncident ? (
              <TriageCard
                data={selectedIncident}
                isLatest={selectedIncident.timestamp === incidents[0]?.timestamp}
                incidentIndex={selectedIndex}
                dispatchRecord={dispatchedRegistry[selectedIncident.timestamp]}
                busyUnitIds={busyUnitIds}
                onDispatchSuccess={(unit) => handleDispatchUnit(selectedIncident.timestamp, unit)}
                onClearIncident={(timestamp) => handleClearIncident(timestamp)}
                isCleared={clearedIncidentIds.has(selectedIncident.timestamp)}
              />
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[450px]">
                <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-300 mb-2">Awaiting Emergency Telemetry</h3>
                <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                  When a bystander initiates an emergency report, full 4 Ws telemetry, location maps, and hazards will render here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * QueueItemCard — Compact row in the Master Incident List.
 */
function QueueItemCard({ data, incidentNumber, isSelected, isLatest, isCleared, dispatchRecord, onClick, onClear }) {
  const { triage = {}, timestamp, transcript = '', gps_location } = data || {};

  const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const consciousnessBadges = {
    responsive:   { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', label: 'RESPONSIVE' },
    unresponsive: { badge: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse', dot: 'bg-red-500', label: 'CRITICAL' },
    unclear:      { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', label: 'UNCLEAR' },
  };

  const statusInfo = consciousnessBadges[triage.consciousness] || consciousnessBadges.unclear;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border relative overflow-hidden ${
        isSelected
          ? 'bg-surface-800 border-pulse-500 shadow-lg shadow-pulse-500/20 ring-1 ring-pulse-500'
          : 'bg-surface-900/60 border-white/5 hover:border-white/20 hover:bg-surface-800/80'
      }`}
    >
      {/* Selection Left Accent Strip */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pulse-500" />
      )}

      {/* Top Line */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-pulse-400">
            #{incidentNumber}
          </span>

          {isCleared && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              🟢 CLEARED
            </span>
          )}

          {isLatest && !isCleared && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pulse-500/20 text-pulse-300 border border-pulse-500/40 animate-pulse">
              NEW
            </span>
          )}

          {dispatchRecord && !isCleared && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse flex items-center gap-1">
              <span>{dispatchRecord.unit?.icon || '🚑'}</span>
              <span>{dispatchRecord.unit?.id || 'DISPATCHED'}</span>
            </span>
          )}

          {(triage?.is_silent_override || (typeof transcript === 'string' && transcript.includes('SILENT TAP OVERRIDE'))) && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse">
              🤫 SILENT
            </span>
          )}

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${statusInfo.badge}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isCleared && onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              title="Clear & resolve event from active queue"
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-700 hover:bg-emerald-600/40 text-gray-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/50 transition-all flex items-center gap-1"
            >
              <span>✓</span>
              <span>Clear</span>
            </button>
          )}
          <span className="text-xs text-gray-400 font-mono">{formattedTime}</span>
        </div>
      </div>

      {/* Complaint */}
      <p className="text-sm font-bold text-white mb-1 line-clamp-1">
        ⚡ {triage.chief_complaint || 'Unspecified emergency'}
      </p>

      {/* Location */}
      <p className="text-xs text-gray-400 line-clamp-1">
        📍 {triage.location || (gps_location ? `GPS: ${gps_location.latitude.toFixed(3)}, ${gps_location.longitude.toFixed(3)}` : 'Location pending')}
      </p>
    </div>
  );
}


/**
 * StatTile — Dashboard KPI box.
 */
function StatTile({ label, value, icon, color, border }) {
  return (
    <div className={`glass-card-light p-4 flex items-center gap-4 border ${border}`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
