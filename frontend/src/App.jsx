import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CallerView from './pages/CallerView';
import DispatcherView from './pages/DispatcherView';

/**
 * PulseRelay App
 *
 * Two-route application:
 * - /caller     → De-escalation UI for panicked bystanders
 * - /dispatcher → Real-time triage dashboard for first responders
 * - /           → Redirects to /caller (default entry point)
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/caller" replace />} />
        <Route path="/caller" element={<CallerView />} />
        <Route path="/dispatcher" element={<DispatcherView />} />
      </Routes>
    </Router>
  );
}
