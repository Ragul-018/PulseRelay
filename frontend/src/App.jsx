import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CallerView from './pages/CallerView';
import DispatcherView from './pages/DispatcherView';
import TrackingView from './pages/TrackingView';

/**
 * PulseRelay App
 *
 * Routes:
 * - /caller             → De-escalation UI for panicked bystanders
 * - /dispatcher         → Real-time triage dashboard for first responders
 * - /track/:incidentId  → Live Uber-Style Emergency Vehicle Tracking Page
 * - /           → Redirects to /caller (default entry point)
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/caller" replace />} />
        <Route path="/caller" element={<CallerView />} />
        <Route path="/dispatcher" element={<DispatcherView />} />
        <Route path="/track" element={<TrackingView />} />
        <Route path="/track/:incidentId" element={<TrackingView />} />
      </Routes>
    </Router>
  );
}
