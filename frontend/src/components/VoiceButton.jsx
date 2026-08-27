import React from 'react';

/**
 * VoiceButton — Animated push-to-talk microphone button.
 *
 * Features a pulsing ring animation when listening, and transitions
 * between idle (blue) and active (red) states.
 *
 * @param {object} props
 * @param {boolean} props.isListening - Whether the mic is currently active.
 * @param {function} props.onToggle - Called when the button is pressed.
 * @param {boolean} props.disabled - Disable the button.
 */
export default function VoiceButton({ isListening, onToggle, disabled = false }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <button
        id="voice-button"
        onClick={onToggle}
        disabled={disabled}
        className={`voice-btn ${isListening ? 'listening' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        {/* Pulsing rings */}
        {isListening && (
          <>
            <span className="voice-btn-ring" style={{ animationDelay: '0s' }} />
            <span className="voice-btn-ring" style={{ animationDelay: '0.5s' }} />
            <span className="voice-btn-ring" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Microphone icon */}
        <svg
          className="w-12 h-12 text-white relative z-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {isListening ? (
            // Stop icon
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          ) : (
            // Microphone icon
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </>
          )}
        </svg>
      </button>

      {/* Status label */}
      <span className={`text-sm font-medium tracking-wide uppercase transition-colors duration-300 ${
        isListening ? 'text-red-400' : 'text-gray-500'
      }`}>
        {isListening ? 'Listening…' : 'Tap to speak'}
      </span>
    </div>
  );
}
