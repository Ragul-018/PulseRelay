import React, { useState, useMemo } from 'react';
import LiveDispatchMap from '../map/LiveDispatchMap';

const FLEET_UNITS = [
  {
    id: '108-ALS-101',
    name: '108 ALS Ambulance 101',
    type: '108 Medical Unit (Anna Salai)',
    icon: '🚐',
    stationPos: [13.0604, 80.2496],
    etaMins: 3,
    speedMph: 48,
    category: 'MEDICAL',
  },
  {
    id: 'TN-FIRE-5',
    name: 'TN Fire & Rescue Engine 5',
    type: 'Heavy Rescue Engine (T. Nagar)',
    icon: '🚒',
    stationPos: [13.0418, 80.2341],
    etaMins: 4,
    speedMph: 50,
    category: 'FIRE',
  },
  {
    id: 'TN-POLICE-4',
    name: 'Chennai Police Rapid Unit 4',
    type: 'Patrol / CPR Unit (Mylapore)',
    icon: '🚓',
    stationPos: [13.0338, 80.2678],
    etaMins: 2,
    speedMph: 55,
    category: 'POLICE',
  },
];

export default function DispatchSimulationView({
  incidentGps = { latitude: 13.0827, longitude: 80.2707 },
  triageCategory = 'MEDICAL',
  onDispatch,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState('108-ALS-101');
  const [dispatchStatus, setDispatchStatus] = useState('AVAILABLE'); // AVAILABLE | EN_ROUTE | ON_SCENE
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const activeUnit = useMemo(() => {
    return FLEET_UNITS.find((u) => u.id === selectedUnitId) || FLEET_UNITS[0];
  }, [selectedUnitId]);

  const originCoords = activeUnit.stationPos;
  const destCoords = [incidentGps.latitude, incidentGps.longitude];

  const handleDispatch = async () => {
    setDispatchStatus('EN_ROUTE');
    if (onDispatch) {
      onDispatch(activeUnit);
    }
  };

  const handleArrival = () => {
    setDispatchStatus('ON_SCENE');
  };

  const handleReset = () => {
    setDispatchStatus('AVAILABLE');
  };

  return (
    <div className="bg-surface-900/90 border border-pulse-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pulse-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg">
            🗺️
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Live Emergency Dispatch Telemetry Map
            </h3>
            <p className="text-xs text-gray-400">
              Interactive Leaflet & Turf.js Geodesic Route Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-400">Status:</span>
          <span
            className={`px-3 py-1 rounded-full font-bold uppercase border ${
              dispatchStatus === 'ON_SCENE'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : dispatchStatus === 'EN_ROUTE'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            {dispatchStatus === 'AVAILABLE' ? '⚪ AVAILABLE' : dispatchStatus === 'EN_ROUTE' ? '⚡ EN ROUTE' : '🟢 ON SCENE'}
          </span>
        </div>
      </div>

      {/* Fleet Unit Selector */}
      <div className="grid grid-cols-3 gap-3">
        {FLEET_UNITS.map((unit) => {
          const isSel = unit.id === selectedUnitId;
          return (
            <button
              key={unit.id}
              disabled={dispatchStatus !== 'AVAILABLE'}
              onClick={() => setSelectedUnitId(unit.id)}
              className={`p-3 rounded-xl border transition-all text-left ${
                isSel
                  ? 'bg-surface-800 border-pulse-500 ring-1 ring-pulse-500/60 shadow-lg'
                  : 'bg-surface-900/60 border-white/5 hover:border-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{unit.icon}</span>
                <span className="text-xs font-bold text-white truncate">{unit.id}</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate">{unit.name}</p>
            </button>
          );
        })}
      </div>

      {/* Live Leaflet Map */}
      <LiveDispatchMap
        origin={originCoords}
        destination={destCoords}
        isDispatched={dispatchStatus === 'EN_ROUTE' || dispatchStatus === 'ON_SCENE'}
        speedMultiplier={speedMultiplier}
        unitIcon={activeUnit.icon}
        onArrival={handleArrival}
      />

      {/* Bottom Dispatch Trigger Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Sim Speed:</span>
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeedMultiplier(speed)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                speedMultiplier === speed ? 'bg-pulse-600 text-white' : 'bg-surface-800 text-gray-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {dispatchStatus === 'AVAILABLE' ? (
          <button
            onClick={handleDispatch}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pulse-600 to-indigo-600 hover:from-pulse-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-pulse-500/30 transition-all flex items-center gap-2"
          >
            <span>⚡</span>
            <span>Authorize & Dispatch ({activeUnit.id})</span>
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-surface-800 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Reset Simulation
          </button>
        )}
      </div>
    </div>
  );
}
