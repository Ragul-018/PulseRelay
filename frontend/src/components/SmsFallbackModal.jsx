import React, { useState } from 'react';

export default function SmsFallbackModal({
  isOpen,
  onClose,
  gpsCoords,
  triageCategory = 'GENERAL',
  consciousness = 'unclear',
  transcript = '',
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Format 160-character compressed payload
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const locStr = gpsCoords
    ? `${gpsCoords.latitude.toFixed(4)},${gpsCoords.longitude.toFixed(4)}`
    : 'UNKNOWN_LOC';

  const typeClean = triageCategory.toUpperCase().slice(0, 14);
  const unresClean = consciousness === 'unresponsive' ? 'YES' : consciousness === 'responsive' ? 'NO' : 'UNCLEAR';
  const detailClean = (transcript || 'CRISIS REPORT').slice(0, 35).replace(/[\r\n|]/g, ' ');

  // Standard 160-character emergency SMS payload format
  const smsPayload = `EMERGENCY: ${typeClean} | LOC: ${locStr} | UNRESP: ${unresClean} | TIME: ${timeStr} | MSG: ${detailClean} | VIA PULSERELAY`.slice(0, 160);

  const emergencyNumber = '911';
  // Cross-platform sms: URI format
  const smsUri = `sms:${emergencyNumber}?body=${encodeURIComponent(smsPayload)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(smsPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-gray-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
              📡
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                SMS / Low-Bandwidth Fallback
              </h2>
              <p className="text-xs text-amber-400">
                Network connection unavailable or congested
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Payload summary */}
        <div className="py-5 space-y-4">
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <span>Compressed 160-Char Emergency Payload</span>
              <span>{smsPayload.length}/160 Chars</span>
            </div>
            <p className="font-mono text-sm text-amber-200 bg-black/40 p-3 rounded-xl break-all select-all border border-amber-900/50">
              {smsPayload}
            </p>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Send this payload via native SMS or satellite emergency messaging. Emergency dispatch towers receive compressed SMS even during 4G/5G mobile data outage.
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={smsUri}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold hover:from-red-500 hover:to-rose-600 transition-all shadow-lg text-center"
            >
              <span>📱</span>
              <span>Open SMS App (911)</span>
            </a>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 font-semibold hover:bg-gray-700 transition-all text-center"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Payload'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>PulseRelay Resilient Disaster Channel</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
