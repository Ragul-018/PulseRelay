import React from 'react';

const SILENT_CATEGORIES = [
  {
    id: 'INTRUDER',
    title: 'Intruder / Hiding',
    subtitle: 'Active threat — must remain completely silent',
    icon: '🥷',
    color: 'from-red-600 to-rose-700',
    border: 'border-red-500/40',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    chief_complaint: 'Active Threat — Caller Hiding / Non-Verbal Override',
    consciousness: 'responsive',
    patient_count: 1,
    hazards: ['Active Threat Present', 'Silent Operation Mandatory', 'Caller Hiding'],
    guidelines: [
      { step: 1, text: 'Silence your phone ringer and turn off vibration immediately.' },
      { step: 2, text: 'Lock doors, turn off all lights, and stay away from window lines of sight.' },
      { step: 3, text: 'Keep screen brightness low. Dispatchers know you cannot speak and have your GPS.' },
    ],
  },
  {
    id: 'CHOKING',
    title: 'Cannot Breathe',
    subtitle: 'Airway obstruction — unable to produce vocal sounds',
    icon: '🫁',
    color: 'from-blue-600 to-indigo-700',
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    chief_complaint: 'Severe Airway Obstruction — Non-Verbal Emergency',
    consciousness: 'responsive',
    patient_count: 1,
    hazards: ['Acute Hypoxia Risk', 'Airway Obstruction'],
    guidelines: [
      { step: 1, text: 'If choking alone, perform abdominal thrusts against a chair back or table edge.' },
      { step: 2, text: 'Stay upright. If near front door, unlock it so responders can enter immediately.' },
      { step: 3, text: 'If assisting someone, give 5 firm back blows followed by 5 abdominal thrusts.' },
    ],
  },
  {
    id: 'BLEEDING',
    title: 'Severe Bleeding',
    subtitle: 'Trauma or hemorrhage — need immediate pressure',
    icon: '🩸',
    color: 'from-emerald-600 to-teal-700',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    chief_complaint: 'Severe Bleeding / Active Hemorrhage',
    consciousness: 'responsive',
    patient_count: 1,
    hazards: ['Hemorrhage Shock Risk', 'Trauma Wounds'],
    guidelines: [
      { step: 1, text: 'Apply continuous, firm direct pressure over wound with clean cloth or garment.' },
      { step: 2, text: 'Do NOT remove blood-soaked towels — place additional clean layers directly on top.' },
      { step: 3, text: 'Lie flat and elevate injured area above heart level if possible.' },
    ],
  },
  {
    id: 'FIRE',
    title: 'Fire / Trapped',
    subtitle: 'Structure fire or smoke — trapped in space',
    icon: '🔥',
    color: 'from-amber-600 to-orange-700',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    chief_complaint: 'Structure Fire / Bystander Trapped by Smoke',
    consciousness: 'responsive',
    patient_count: 1,
    hazards: ['Smoke Inhalation', 'Toxic Gas', 'Active Fire'],
    guidelines: [
      { step: 1, text: 'Crawl low on hands and knees to stay underneath toxic smoke layer.' },
      { step: 2, text: 'Check door handles with back of hand before opening — if hot, DO NOT OPEN.' },
      { step: 3, text: 'Block door cracks with wet towels or clothing to keep smoke out.' },
    ],
  },
];

export default function SilentTapDrawer({ isOpen, onClose, onSelectCategory }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xl">
              🤫
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Zero-Speech Silent Tap
              </h2>
              <p className="text-xs text-gray-400">
                Tap pictograms for non-verbal or active threat emergency
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

        {/* Pictograms grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 overflow-y-auto">
          {SILENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className={`flex flex-col text-left p-5 rounded-2xl bg-gradient-to-br ${cat.color} bg-opacity-20 hover:bg-opacity-30 border ${cat.border} transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg group relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${cat.badge}`}>
                  Silent Mode
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-200 transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {cat.subtitle}
              </p>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>🛡️ Your GPS location is automatically attached</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export { SILENT_CATEGORIES };
