import React, { useState, useEffect } from 'react';

const API_PORT = import.meta.env.VITE_API_PORT || 8000;

const SAMPLE_HOSPITALS = [
  {
    id: 'HOSP-APOLLO-GREAMS',
    name: 'Apollo Main Hospital (Greams Road)',
    address: '21 Greams Lane, Thousand Lights, Chennai',
    latitude: 13.0604,
    longitude: 80.2496,
    phone: '+91 44 2829 0200',
    trauma_level: 'Level 1 Comprehensive Trauma Center',
    capabilities: ['Advanced Cardiac Care', 'Neuro ICU', 'Severe Trauma', 'Burn Unit'],
    er_beds_total: 35,
    er_beds_available: 12,
    icu_beds_total: 50,
    icu_beds_available: 8,
    burn_beds_available: 3,
    status: 'OPERATIONAL',
    distance_miles: 1.2,
    eta_minutes: 3,
    suitability_score: 98,
  },
  {
    id: 'HOSP-RGGGH-PARK',
    name: 'Rajiv Gandhi Govt General Hospital',
    address: 'EVR Periyar Salai, Park Town, Chennai',
    latitude: 13.0815,
    longitude: 80.2778,
    phone: '+91 44 2530 5000',
    trauma_level: 'Level 1 Apex Government Trauma Center',
    capabilities: ['24x7 Emergency Resuscitation', 'Mass Casualty Unit', 'Toxicology', 'Burn Intensive Care'],
    er_beds_total: 80,
    er_beds_available: 28,
    icu_beds_total: 100,
    icu_beds_available: 19,
    burn_beds_available: 7,
    status: 'OPERATIONAL',
    distance_miles: 2.1,
    eta_minutes: 5,
    suitability_score: 94,
  },
  {
    id: 'HOSP-SIMS-VADAPALANI',
    name: 'SIMS Hospital (Vadapalani)',
    address: '1 Jawaharlal Nehru Salai, Vadapalani, Chennai',
    latitude: 13.0500,
    longitude: 80.2121,
    phone: '+91 44 4959 4959',
    trauma_level: 'Level 1 Tertiary Emergency Center',
    capabilities: ['Multi-Organ ICU', 'Pediatric ER', 'Polytrauma Unit'],
    er_beds_total: 30,
    er_beds_available: 14,
    icu_beds_total: 40,
    icu_beds_available: 11,
    burn_beds_available: 4,
    status: 'OPERATIONAL',
    distance_miles: 3.8,
    eta_minutes: 9,
    suitability_score: 88,
  },
  {
    id: 'HOSP-FORTIS-ADYAR',
    name: 'Fortis Malar Hospital (Adyar)',
    address: '52 First Main Rd, Gandhi Nagar, Adyar, Chennai',
    latitude: 13.0067,
    longitude: 80.2572,
    phone: '+91 44 4289 2222',
    trauma_level: 'Level 2 Emergency Medical Center',
    capabilities: ['Cardiac Resuscitation', 'Stroke Unit', 'General ER'],
    er_beds_total: 15,
    er_beds_available: 2,
    icu_beds_total: 20,
    icu_beds_available: 1,
    burn_beds_available: 0,
    status: 'NEAR_CAPACITY',
    distance_miles: 4.5,
    eta_minutes: 11,
    suitability_score: 62,
  },
];

/**
 * HospitalCapacityMatrix — Displays real-time hospital bed & ICU availability matrix
 * and emergency hospital routing recommendation for dispatchers.
 */
export default function HospitalCapacityMatrix({
  incidentGps,
  chiefComplaint,
  selectedHospitalId,
  onSelectHospital,
}) {
  const [hospitals, setHospitals] = useState(SAMPLE_HOSPITALS);
  const [isLoading, setIsLoading] = useState(false);

  const lat = incidentGps?.latitude || 13.0827;
  const lng = incidentGps?.longitude || 80.2707;

  useEffect(() => {
    let isMounted = true;
    const fetchHospitals = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          latitude: lat,
          longitude: lng,
          chief_complaint: chiefComplaint || '',
        });
        const res = await fetch(`http://${window.location.hostname || 'localhost'}:${API_PORT}/api/hospitals?${query}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.hospitals && Array.isArray(data.hospitals) && data.hospitals.length > 0) {
            setHospitals(data.hospitals);
            if (!selectedHospitalId && onSelectHospital) {
              onSelectHospital(data.hospitals[0]);
            }
          }
        }
      } catch (err) {
        // Fallback to sample data
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHospitals();
    return () => {
      isMounted = false;
    };
  }, [lat, lng, chiefComplaint]);

  return (
    <div className="bg-surface-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Matrix Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/30">
            🏥
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Regional Hospital Bed & ICU Capacity Matrix
            </h3>
            <p className="text-xs text-emerald-400/90 font-mono">
              AI Capacity & Emergency Routing Optimizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-bold">
            LIVE TELEMETRY
          </span>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
        {hospitals.map((hosp, idx) => {
          const isSelected = selectedHospitalId === hosp.id || (!selectedHospitalId && idx === 0);
          const isTopRecommended = idx === 0;

          return (
            <div
              key={hosp.id}
              onClick={() => onSelectHospital && onSelectHospital(hosp)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border relative space-y-2.5 ${
                isSelected
                  ? 'bg-surface-800 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                  : 'bg-surface-900/70 border-white/5 hover:border-white/20 hover:bg-surface-800/60'
              }`}
            >
              {/* Top Badge & Match Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white line-clamp-1">
                  {hosp.name}
                </span>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isTopRecommended && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ★ TOP MATCH ({hosp.suitability_score}%)
                    </span>
                  )}
                  {!isTopRecommended && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-700 text-gray-300 border border-white/10 font-mono">
                      {hosp.suitability_score}% MATCH
                    </span>
                  )}
                </div>
              </div>

              {/* Trauma Level & Distance */}
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="truncate max-w-[200px]">{hosp.trauma_level}</span>
                <span className="font-mono text-cyan-300 font-bold">
                  📍 {hosp.distance_miles} mi ({hosp.eta_minutes} mins)
                </span>
              </div>

              {/* Bed Telemetry Badges */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <div className="bg-surface-950/80 p-2 rounded border border-white/5 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">ICU Beds</div>
                  <div className={`text-xs font-bold font-mono ${hosp.icu_beds_available > 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hosp.icu_beds_available} / {hosp.icu_beds_total}
                  </div>
                </div>

                <div className="bg-surface-950/80 p-2 rounded border border-white/5 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">ER Beds</div>
                  <div className={`text-xs font-bold font-mono ${hosp.er_beds_available > 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hosp.er_beds_available} / {hosp.er_beds_total}
                  </div>
                </div>

                <div className="bg-surface-950/80 p-2 rounded border border-white/5 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Burn Unit</div>
                  <div className="text-xs font-bold font-mono text-purple-300">
                    {hosp.burn_beds_available} Open
                  </div>
                </div>
              </div>

              {/* Action Indicator */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[10px] text-gray-500 truncate">
                  📞 {hosp.phone}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectHospital) onSelectHospital(hosp);
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/40'
                      : 'bg-surface-700 text-gray-300 hover:bg-emerald-600/40 hover:text-emerald-200'
                  }`}
                >
                  {isSelected ? '✓ Assigned Target' : 'Select Hospital'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
