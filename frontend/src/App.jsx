import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CallerView from './pages/CallerView';
import DispatcherView from './pages/DispatcherView';
import TrackingView from './pages/TrackingView';

/**
 * PulseRelay App
 *
 * Routes:
 * - /                   → Landing page
 * - /caller             → De-escalation UI for panicked bystanders
 * - /dispatcher         → Real-time triage dashboard for first responders
 * - /track/:incidentId  → Live Uber-Style Emergency Vehicle Tracking Page
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/caller" element={<CallerView />} />
        <Route path="/dispatcher" element={<DispatcherView />} />
        <Route path="/track" element={<TrackingView />} />
        <Route path="/track/:incidentId" element={<TrackingView />} />
      </Routes>
    </Router>
  );
}
