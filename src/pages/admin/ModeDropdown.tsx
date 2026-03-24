import React, { useState } from 'react';
import type { SlideMode } from '../../types';
import { Users, KeyRound, Unlock, ChevronDown } from 'lucide-react';

const ModeDropdown: React.FC<{ value: SlideMode; onChange: (m: SlideMode) => void; inlineLabel?: string }> = ({ value, onChange, inlineLabel }) => {
  const [open, setOpen] = useState(false);

  const modes: Array<{ value: SlideMode; label: string; desc: string; Icon: typeof Users }> = [
    { value: 'moderated',  label: 'Moderata',  desc: 'Il facilitatore avanza il gruppo dalla vista Presenta', Icon: Users },
    { value: 'pin',        label: 'Con PIN',   desc: 'Ogni partecipante avanza inserendo il codice',          Icon: KeyRound },
    { value: 'autonomous', label: 'Autonoma',  desc: 'Ogni partecipante avanza liberamente al proprio ritmo', Icon: Unlock },
  ];
  const current = modes.find(m => m.value === value)!;

  return (
    <div className="ws-mode-accordion">
      <div className="ws-mode-accordion-row">
        {inlineLabel && <label className="ws-label">{inlineLabel}</label>}
        <button
          type="button"
          className="ws-mode-accordion-trigger"
          onClick={() => setOpen(o => !o)}
        >
          <current.Icon size={14} />
          <span className="ws-mode-accordion-trigger-label">{current.label}</span>
          <ChevronDown size={14} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
      </div>
      {open && (
        <div className="ws-mode-accordion-body">
          <div className="ws-mode-selector">
            {modes.map(({ value: v, label, desc, Icon }) => (
              <button
                key={v}
                type="button"
                className={`ws-mode-btn${v === value ? ' ws-mode-btn--active' : ''}`}
                onClick={() => { onChange(v); setOpen(false); }}
              >
                <span className="ws-mode-btn-icon"><Icon size={15} /></span>
                <span className="ws-mode-btn-title">{label}</span>
                <span className="ws-mode-btn-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeDropdown;
