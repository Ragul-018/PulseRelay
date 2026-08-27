import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

// Custom Leaflet DivIcon Builders
const createStationIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-lg shadow-lg">🏢</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createIncidentIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div className="pulsing-incident-pin">📍</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createVehicleIcon = (icon = '🚑') =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div className="vehicle-moving-marker">${icon}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

// Map Controller for auto-fitting bounds around origin & destination
function MapBoundsController({ origin, destination }) {
  const map = useMap();

  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, origin, destination]);

  return null;
}

/**
 * LiveDispatchMap — Real-time Leaflet & Turf.js emergency dispatch map component.
 *
 * Visualizes station origin, incident site, route line, and animates emergency vehicle
 * moving along geodesic path with smooth requestAnimationFrame interpolation.
 */
export default function LiveDispatchMap({
  origin = [13.0604, 80.2496],
  destination = [13.0827, 80.2707],
  isDispatched = false,
  speedMultiplier = 1,
  unitIcon = '🚑',
  onArrival,
}) {
  const [vehiclePos, setVehiclePos] = useState(origin);
  const [progressPercent, setProgressPercent] = useState(0);

  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const onArrivalRef = useRef(onArrival);

  // Keep onArrivalRef updated without triggering effect restarts
  useEffect(() => {
    onArrivalRef.current = onArrival;
  }, [onArrival]);

  // Compute Turf.js lineString and total geodesic distance
  const routeTurf = useRef(null);
  const totalDistanceKm = useRef(0);

  useEffect(() => {
    if (!origin || !destination) return;

    // Turf expects coordinates as [Lng, Lat]
    const line = turf.lineString([
      [origin[1], origin[0]],
      [destination[1], destination[0]],
    ]);

    routeTurf.current = line;
    totalDistanceKm.current = turf.length(line, { units: 'kilometers' });

    // Reset position when not dispatched
    if (!isDispatched) {
      setVehiclePos(origin);
      setProgressPercent(0);
      startTimeRef.current = null;
    }
  }, [origin, destination, isDispatched]);

  // Smooth requestAnimationFrame animation loop
  useEffect(() => {
    if (!isDispatched || !routeTurf.current || totalDistanceKm.current === 0) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      startTimeRef.current = null;
      return;
    }

    const durationMs = 12000 / Math.max(0.1, speedMultiplier); // 12-second baseline animation

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);

      // Compute current distance along path
      const currentDistKm = totalDistanceKm.current * progress;
      const currentPoint = turf.along(routeTurf.current, currentDistKm, { units: 'kilometers' });

      // Turf returns [Lng, Lat] → convert back to Leaflet [Lat, Lng]
      const [lng, lat] = currentPoint.geometry.coordinates;
      setVehiclePos([lat, lng]);
      setProgressPercent(Math.round(progress * 100));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (onArrivalRef.current) {
          onArrivalRef.current();
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isDispatched, speedMultiplier]);

  const polylineCoords = [origin, destination];

  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer
        center={origin}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapBoundsController origin={origin} destination={destination} />

        {/* Standard OpenStreetMap Tile Layer — 100% free, no API key, clean rendering */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: isDispatched ? '#60a5fa' : '#94a3b8',
            weight: 4,
            dashArray: '8, 8',
            opacity: 0.85,
          }}
        />

        {/* Origin Station Marker */}
        <Marker position={origin} icon={createStationIcon()}>
          <Popup className="font-sans text-xs">
            <div className="font-bold">Station Origin</div>
            <div className="text-gray-500 font-mono">{origin[0].toFixed(4)}, {origin[1].toFixed(4)}</div>
          </Popup>
        </Marker>

        {/* Incident Scene Marker */}
        <Marker position={destination} icon={createIncidentIcon()}>
          <Popup className="font-sans text-xs">
            <div className="font-bold text-red-600">🚨 Incident Scene</div>
            <div className="text-gray-500 font-mono">{destination[0].toFixed(4)}, {destination[1].toFixed(4)}</div>
          </Popup>
        </Marker>

        {/* Animated Moving Vehicle Marker */}
        {isDispatched && (
          <Marker position={vehiclePos} icon={createVehicleIcon(unitIcon)}>
            <Popup className="font-sans text-xs">
              <div className="font-bold text-blue-600">En Route ({progressPercent}%)</div>
              <div className="text-gray-500 font-mono">{vehiclePos[0].toFixed(4)}, {vehiclePos[1].toFixed(4)}</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map HUD Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs font-mono shadow-lg">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isDispatched ? 'bg-blue-400 animate-ping' : 'bg-slate-500'}`} />
          <span className="font-bold text-white uppercase">
            {isDispatched ? (progressPercent >= 100 ? '🟢 ON SCENE' : '⚡ EN ROUTE') : '⚪ STANDBY'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-gray-300">
          <span>Route Progress: <strong className="text-cyan-400">{progressPercent}%</strong></span>
          <span>Geodesic Dist: <strong className="text-amber-400">{(totalDistanceKm.current * 0.621371).toFixed(2)} mi</strong></span>
        </div>
      </div>
    </div>
  );
}
