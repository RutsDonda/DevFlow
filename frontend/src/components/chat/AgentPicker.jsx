import React from 'react';
import { MODES } from '../../config/agents';

/** Segmented choice of which agent handles the next message, shown just above the composer. */
const AgentPicker = ({ value, onChange, disabled }) => {
  const current = MODES.find((m) => m.id === value) || MODES[0];
  return (
    <div className="mb-2.5 flex flex-col items-center gap-1.5">
      <div role="radiogroup" aria-label="Choose an agent" className="flex flex-wrap justify-center gap-1.5">
        {MODES.map((mode) => {
          const active = mode.id === current.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(mode.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors disabled:opacity-50 ${
                active
                  ? 'border-white/25 bg-white/[0.1] text-white'
                  : 'border-white/[0.08] text-mute hover:bg-white/[0.05] hover:text-ink'
              }`}
            >
              <mode.icon className={`w-4 h-4 ${active ? mode.text : ''}`} />
              {mode.label}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-faint">{current.hint}</p>
    </div>
  );
};

export default AgentPicker;
