import React, { useState, useEffect, useMemo } from 'react';
import LiveDispatchMap from './map/LiveDispatchMap';

const CHENNAI_DEFAULT_GPS = [13.0827, 80.2707];

const INITIAL_FLEET = [
  {
    id: '108-ALS-101',
    name: '108 ALS Ambulance 101',
    type: '108 Advanced Life Support',
    icon: '🚐',
    station: 'Station 4 (Anna Salai, Chennai)',
    stationPos: [13.0604, 80.2496],
    distMiles: 1.2,
    etaMins: 3,
    speedMph: 48,
    isPrimaryMedical: true,
    capabilities: ['Advanced Life Support', '108 Paramedic Team', 'Defibrillator', 'Trauma Kit'],
  },
  {
    id: '108-BLS-102',
    name: '108 Medic Unit 102',
    type: '108 BLS Transport',
    icon: '🚑',
    station: 'Kilpauk Medical Station (Chennai)',
    stationPos: [13.0878, 80.2415],
    distMiles: 2.4,
    etaMins: 5,
    speedMph: 42,
    isPrimaryMedical: true,
    capabilities: ['Basic Life Support', '108 EMT Crew', 'Oxygen System'],
  },
  {
    id: 'TN-FIRE-5',
    name: 'TN Fire & Rescue Engine 5',
    type: 'Heavy Rescue Engine',
    icon: '🚒',
    station: 'T. Nagar Fire Station (Chennai)',
    stationPos: [13.0418, 80.2341],
    distMiles: 1.8,
    etaMins: 4,
    speedMph: 50,
    isPrimaryFire: true,
    capabilities: ['Hazmat Suppression', 'Structure Rescue', 'Jaws of Life', 'EMTs on Board'],
  },
  {
    id: 'TN-POLICE-4',
    name: 'Chennai Police Rapid Unit 4',
    type: 'Patrol / CPR Unit',
    icon: '🚓',
    station: 'Mylapore Sector Control (Chennai)',
    stationPos: [13.0338, 80.2678],
    distMiles: 0.9,
    etaMins: 2,
    speedMph: 55,
    isPrimaryPolice: true,
    capabilities: ['Rapid CPR / AED', 'Active Threat Response', 'First Responder Certified'],
  },
];

export default function FleetDispatchSimulation({
  incidentData,
  dispatchRecord = null,
  busyUnitIds = new Set(),
  onDispatchSuccess,
}) {
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [simulateAmbulanceBusy, setSimulateAmbulanceBusy] = useState(false);

  const isAlreadyDispatched = Boolean(dispatchRecord);
  const existingDispatchedUnit = dispatchRecord?.unit;

  const [dispatchState, setDispatchState] = useState(
    isAlreadyDispatched ? dispatchRecord.status || 'EN_ROUTE' : 'IDLE'
  );
  const [dispatchedUnit, setDispatchedUnit] = useState(existingDispatchedUnit || null);
  const [progress, setProgress] = useState(isAlreadyDispatched ? 100 : 0);
  const [remainingTime, setRemainingTime] = useState(0);

  const incidentId = incidentData?.timestamp;

  // Key state by incidentId whenever active incident changes
  useEffect(() => {
    if (dispatchRecord) {
      setDispatchState(dispatchRecord.status || 'EN_ROUTE');
      setDispatchedUnit(dispatchRecord.unit);
      if (dispatchRecord.unit?.id) {
        setSelectedUnitId(dispatchRecord.unit.id);
      }
    } else {
      setDispatchState('IDLE');
      setDispatchedUnit(null);
      setProgress(0);
      setRemainingTime(0);
    }
  }, [incidentId, dispatchRecord]);

  const triage = incidentData?.triage || {};
  const complaint = (triage.chief_complaint || '').toUpperCase();
  const silentCat = triage.silent_category || '';

  // Calculate Auto-Unit Recommendation (excluding busy units)
  const recommendedUnitId = useMemo(() => {
    if (existingDispatchedUnit) return existingDispatchedUnit.id;

    const isAvailable = (id) => !busyUnitIds.has(id);

    if (simulateAmbulanceBusy) {
      if (isAvailable('TN-POLICE-4')) return 'TN-POLICE-4';
      if (isAvailable('TN-FIRE-5')) return 'TN-FIRE-5';
    }

    if (silentCat === 'INTRUDER' || complaint.includes('THREAT') || complaint.includes('INTRUDER')) {
      if (isAvailable('TN-POLICE-4')) return 'TN-POLICE-4';
    }
    if (silentCat === 'FIRE' || complaint.includes('FIRE') || complaint.includes('SMOKE') || complaint.includes('TRAPPED')) {
      if (isAvailable('TN-FIRE-5')) return 'TN-FIRE-5';
    }

    // Default medical recommendation
    if (isAvailable('108-ALS-101')) return '108-ALS-101';
    if (isAvailable('108-BLS-102')) return '108-BLS-102';

    // Fallback to first non-busy unit
    const firstFree = fleet.find((u) => !busyUnitIds.has(u.id));
    return firstFree ? firstFree.id : '108-ALS-101';
  }, [complaint, silentCat, simulateAmbulanceBusy, busyUnitIds, existingDispatchedUnit, fleet]);

  // Set default selected unit to recommended unit if none selected or on incident switch
  useEffect(() => {
    if (isAlreadyDispatched && existingDispatchedUnit) {
      setSelectedUnitId(existingDispatchedUnit.id);
    } else if (!selectedUnitId || busyUnitIds.has(selectedUnitId) || simulateAmbulanceBusy) {
      setSelectedUnitId(recommendedUnitId);
    }
  }, [recommendedUnitId, selectedUnitId, simulateAmbulanceBusy, isAlreadyDispatched, existingDispatchedUnit, busyUnitIds]);

  const activeUnit = fleet.find((u) => u.id === selectedUnitId) || fleet[0];

  // Handle Authorize & Dispatch action
  const handleAuthorizeDispatch = async () => {
    if (!activeUnit || isAlreadyDispatched) return;

    setDispatchedUnit(activeUnit);
    setDispatchState('DISPATCHED');
    setProgress(0);
    setRemainingTime(activeUnit.etaMins * 60);

    // Call backend endpoint to fan-out to caller screen
    const apiPort = import.meta.env.VITE_API_PORT || 8001;
    try {
      await fetch(`http://${window.location.hostname || 'localhost'}:${apiPort}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_timestamp: incidentData?.timestamp,
          unit_id: activeUnit.id,
          unit_name: activeUnit.name,
          unit_type: activeUnit.type,
          eta_minutes: activeUnit.etaMins,
          speed_mph: activeUnit.speedMph,
        }),
      });
    } catch (err) {
      console.warn('Dispatch REST endpoint notification warning:', err);
    }

    if (onDispatchSuccess) {
      onDispatchSuccess(activeUnit);
    }
  };

  // Live route animation timer simulation
  useEffect(() => {
    if (dispatchState !== 'DISPATCHED' && dispatchState !== 'EN_ROUTE') return;

    if (dispatchState === 'DISPATCHED') {
      setDispatchState('EN_ROUTE');
    }

    const durationSeconds = (dispatchedUnit?.etaMins || 2) * 8; // 16s accelerated simulation scale
    const intervalTime = 200; // ms
    const increment = 100 / ((durationSeconds * 1000) / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setDispatchState('ON_SCENE');
          setRemainingTime(0);
          return 100;
        }
        return prev + increment;
      });

      setRemainingTime((prevTime) => Math.max(0, prevTime - 1));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [dispatchState, dispatchedUnit]);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const distRemaining = activeUnit
    ? (activeUnit.distMiles * (1 - progress / 100)).toFixed(2)
    : '0.00';

  return (
    <div className="bg-surface-900/90 border border-pulse-500/30 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pulse-500 to-indigo-600 flex items-center justify-center text-lg shadow-md">
            🚨
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Fleet Telemetry & Dispatch Simulation
            </h3>
            <p className="text-xs text-gray-400">
              Auto-unit recommendation & nearest-neighbor routing (Chennai Sector)
            </p>
          </div>
        </div>

        {/* Fail-Safe Toggle Switch */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          <span className="text-[11px] font-semibold text-gray-400">
            Simulate Ambulance Busy:
          </span>
          <button
            onClick={() => setSimulateAmbulanceBusy(!simulateAmbulanceBusy)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              simulateAmbulanceBusy ? 'bg-amber-500' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                simulateAmbulanceBusy ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Already Dispatched Incident Alert Banner */}
      {isAlreadyDispatched && (
        <div className="bg-blue-500/15 border border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🚑</span>
            <div>
              <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                ALREADY DISPATCHED TO THIS INCIDENT
              </h4>
              <p className="text-xs text-gray-300">
                Unit <strong className="text-white">{existingDispatchedUnit?.name}</strong> is currently assigned & en route.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase font-mono">
            {dispatchState}
          </span>
        </div>
      )}

      {/* Fail-safe alert banner if active */}
      {!isAlreadyDispatched && simulateAmbulanceBusy && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-start gap-3 animate-fade-in">
          <span className="text-xl">⚠️</span>
          <div className="text-xs text-amber-200">
            <span className="font-bold">GRIDLOCK FAIL-SAFE ACTIVE:</span> Primary ambulances are marked on call. System automatically recommending <span className="font-bold underline">Chennai Police Rapid Unit (CPR/AED certified)</span> for immediate response while Fire backup is en route.
          </div>
        </div>
      )}

      {/* Unit Selection & Recommendation List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Nearest Available Units ({fleet.length}):
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fleet.map((unit) => {
            const isAssignedToThis = isAlreadyDispatched && existingDispatchedUnit?.id === unit.id;
            const isBusyOnOther = !isAlreadyDispatched && busyUnitIds.has(unit.id);
            const isSimulatedBusy = !isAlreadyDispatched && simulateAmbulanceBusy && unit.isPrimaryMedical;
            const isUnavailable = isBusyOnOther || isSimulatedBusy || (isAlreadyDispatched && !isAssignedToThis);

            const isRec = !isAlreadyDispatched && unit.id === recommendedUnitId;
            const isSel = unit.id === selectedUnitId;

            return (
              <div
                key={unit.id}
                onClick={() => !isUnavailable && setSelectedUnitId(unit.id)}
                className={`p-3.5 rounded-xl border transition-all text-left relative overflow-hidden ${
                  isAssignedToThis
                    ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/60 shadow-lg'
                    : isUnavailable
                    ? 'opacity-40 border-gray-800 bg-surface-950 cursor-not-allowed'
                    : isSel
                    ? 'bg-surface-800 border-pulse-500 ring-1 ring-pulse-500/60 shadow-lg cursor-pointer'
                    : 'bg-surface-900/60 border-white/5 hover:border-white/20 cursor-pointer'
                }`}
              >
                {/* Recommendation Tag */}
                {isRec && (
                  <span className="absolute top-2 right-2 text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-pulse-500 text-white shadow-md animate-pulse">
                    ⭐ Recommended
                  </span>
                )}

                {isAssignedToThis && (
                  <span className="absolute top-2 right-2 text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-md">
                    ✓ DISPATCHED
                  </span>
                )}

                {isBusyOnOther && (
                  <span className="absolute top-2 right-2 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    Busy on Other Incident
                  </span>
                )}

                {isSimulatedBusy && !isBusyOnOther && (
                  <span className="absolute top-2 right-2 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Gridlock Busy
                  </span>
                )}

                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-2xl">{unit.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{unit.name}</h4>
                    <p className="text-[11px] text-gray-400">{unit.type}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5 font-mono">
                  <span>📍 {unit.distMiles} mi away</span>
                  <span className="text-emerald-400 font-bold">⏱️ ETA {unit.etaMins} mins</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Map & Telemetry Dashboard */}
      {activeUnit && (
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-4">
          {/* Telemetry metrics bar */}
          <div className="grid grid-cols-3 gap-2 text-center bg-surface-950/80 p-3 rounded-xl border border-white/5 font-mono">
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Unit Velocity</div>
              <div className="text-sm font-bold text-cyan-400">
                {dispatchState === 'EN_ROUTE' ? `${activeUnit.speedMph} MPH` : '0 MPH'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Dist Remaining</div>
              <div className="text-sm font-bold text-amber-400">
                {dispatchState === 'EN_ROUTE' ? `${distRemaining} mi` : `${activeUnit.distMiles} mi`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Est. Arrival</div>
              <div className="text-sm font-bold text-emerald-400">
                {dispatchState === 'EN_ROUTE'
                  ? formatTime(remainingTime)
                  : `${activeUnit.etaMins}:00`}
              </div>
            </div>
          </div>

          {/* Interactive Leaflet & Turf.js Geodesic Live Dispatch Map */}
          <LiveDispatchMap
            origin={activeUnit.stationPos || [13.0604, 80.2496]}
            destination={[
              incidentData?.gps_location?.latitude || 13.0827,
              incidentData?.gps_location?.longitude || 80.2707,
            ]}
            isDispatched={dispatchState === 'EN_ROUTE' || dispatchState === 'ON_SCENE'}
            unitIcon={activeUnit.icon}
            onArrival={() => setDispatchState('ON_SCENE')}
          />

          {/* Dispatch Action Button & Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs text-gray-400">
              Status:{' '}
              <span
                className={`font-bold font-mono ${
                  dispatchState === 'ON_SCENE'
                    ? 'text-emerald-400'
                    : dispatchState === 'EN_ROUTE'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-pulse-400'
                }`}
              >
                {dispatchState === 'IDLE'
                  ? 'READY TO DISPATCH'
                  : dispatchState === 'EN_ROUTE'
                  ? '⚡ EN ROUTE TO INCIDENT'
                  : '🟢 ON SCENE / AGENTS ARRIVED'}
              </span>
            </div>

            <button
              onClick={handleAuthorizeDispatch}
              disabled={isAlreadyDispatched || dispatchState === 'EN_ROUTE' || dispatchState === 'ON_SCENE'}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                isAlreadyDispatched
                  ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300 cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-pulse-600 to-indigo-600 hover:from-pulse-500 hover:to-indigo-500 text-white shadow-pulse-500/30'
              }`}
            >
              <span>{isAlreadyDispatched ? '✓' : '⚡'}</span>
              <span>
                {isAlreadyDispatched
                  ? `ALREADY DISPATCHED (${existingDispatchedUnit?.id || activeUnit.id})`
                  : dispatchState === 'IDLE'
                  ? `Authorize & Dispatch (${activeUnit.id})`
                  : dispatchState === 'EN_ROUTE'
                  ? 'Unit Dispatched & En Route...'
                  : 'Unit On Scene'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
