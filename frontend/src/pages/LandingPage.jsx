import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-mesh text-gray-100 font-sans flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pulse-500 to-pulse-700 flex items-center justify-center shadow-lg shadow-pulse-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-base font-extrabold text-white tracking-widest">PULSERELAY</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/caller"
              className="px-4 py-2 rounded-full text-sm font-semibold text-gray-300 hover:text-white border border-white/10 hover:border-white/30 transition-all"
            >
              Caller Terminal
            </Link>
            <Link
              to="/dispatcher"
              className="px-4 py-2 rounded-full bg-pulse-600 hover:bg-pulse-500 text-white text-sm font-bold shadow-lg shadow-pulse-500/30 transition-all"
            >
              Dispatcher Console
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pulse-600/20 border border-pulse-500/40 text-pulse-300 text-xs font-bold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live Emergency Response Platform
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight">
            Emergency Triage,{' '}
            <span className="bg-gradient-to-r from-pulse-400 to-indigo-400 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            PulseRelay bridges panicked callers to dispatchers in real time — with AI-powered triage, live GPS tracking, and intelligent unit routing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/caller"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pulse-600 to-indigo-600 hover:from-pulse-500 hover:to-indigo-500 text-white font-bold text-base shadow-2xl shadow-pulse-500/30 transition-all flex items-center gap-2 group"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              Open Caller Terminal
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              to="/dispatcher"
              className="px-8 py-4 rounded-2xl bg-surface-800/80 hover:bg-surface-700/80 border border-white/10 hover:border-white/25 text-white font-bold text-base transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5 text-pulse-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.388 2.42l-1.186-.237m-1.228-3.585L12 12m0 0L9.75 9.75M12 12l2.25-2.25" />
              </svg>
              Dispatcher Console
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={
                <svg className="w-6 h-6 text-pulse-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              }
              title="AI Voice Triage"
              description="Callers speak naturally. PulseRelay transcribes in real time, extracts the 4 Ws — What, Where, Who, and Consciousness — and auto-generates a structured triage report."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              }
              title="Live GPS Tracking"
              description="Once a unit is dispatched, callers get a live Uber-style tracking link — with real-time ETA, animated unit movement, and assigned hospital destination."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              }
              title="Smart Fleet Dispatch"
              description="Nearest-neighbor routing auto-recommends the best available unit. Hospital ICU bed capacity is checked in real time to route to the optimal ER."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-white/10 bg-surface-900/40 py-20">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-white">How It Works</h2>
              <p className="text-gray-400 max-w-xl mx-auto">From the first call to unit arrival — everything in one seamless flow.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Caller Speaks', desc: 'Caller opens the app and describes the emergency by voice or silent tap.' },
                { step: '02', title: 'AI Triage', desc: 'PulseRelay transcribes, extracts location, complaint, victims, and hazards.' },
                { step: '03', title: 'Dispatcher Acts', desc: 'The dispatcher reviews the structured report and authorizes the nearest unit.' },
                { step: '04', title: 'Unit Arrives', desc: 'Caller tracks the vehicle live. Unit arrives at the optimal hospital.' },
              ].map((item) => (
                <div key={item.step} className="relative p-5 rounded-2xl bg-surface-800/60 border border-white/5 space-y-2">
                  <span className="text-4xl font-black text-white/8">{item.step}</span>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Silent Mode */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="rounded-3xl bg-gradient-to-br from-red-950/60 to-surface-900/80 border border-red-500/20 p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider">
                Critical Feature
              </span>
              <h2 className="text-2xl font-black text-white">Silent Emergency Mode</h2>
              <p className="text-gray-400 leading-relaxed">
                When speaking is dangerous — domestic violence, intruder, hostage — callers tap a pictogram to silently signal the emergency type. No voice. No words. Instant dispatch.
              </p>
              <Link
                to="/caller"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-lg shadow-red-600/20"
              >
                Try Silent Mode
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {[
                { icon: '🔒', label: 'Intruder' },
                { icon: '🔥', label: 'Fire' },
                { icon: '🩸', label: 'Trauma' },
                { icon: '💨', label: 'Airway' },
              ].map((item) => (
                <div key={item.label} className="w-24 h-24 rounded-2xl bg-surface-800/80 border border-white/10 flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-xs text-gray-400 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <span className="font-bold text-white/40 tracking-widest">PULSERELAY</span>
          <span>Emergency AI Triage & Dispatch Platform</span>
          <div className="flex items-center gap-4">
            <Link to="/caller" className="hover:text-white transition-colors">Caller</Link>
            <Link to="/dispatcher" className="hover:text-white transition-colors">Dispatcher</Link>
            <Link to="/track" className="hover:text-white transition-colors">Track</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 rounded-2xl bg-surface-800/60 border border-white/5 space-y-4 hover:border-white/15 transition-all">
      <div className="w-12 h-12 rounded-xl bg-surface-900 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
