import React from 'react';
import type { QuestionElement, QuestionType } from '../../../types';
import { List, BarChart2, AlignLeft, ToggleLeft, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const QuestionEditor: React.FC<{ element: QuestionElement; onChange: (el: QuestionElement) => void }> = ({ element, onChange }) => {
  const types: Array<{ value: QuestionType; label: string; desc: string; Icon: LucideIcon }> = [
    { value: 'multiple_choice', label: 'Scelta multipla', desc: 'Scelta tra opzioni predefinite',   Icon: List },
    { value: 'scale',           label: 'Scala numerica',  desc: 'Valore in un range numerico',      Icon: BarChart2 },
    { value: 'text',            label: 'Testo libero',    desc: 'Risposta aperta scritta',           Icon: AlignLeft },
    { value: 'yes_no',          label: 'Sì / No',         desc: 'Risposta binaria sì o no',          Icon: ToggleLeft },
  ];
  return (
    <div className="ws-el-editor">
      <label className="ws-label">Tipo domanda</label>
      <div className="ws-mode-selector ws-mode-selector--2col">
        {types.map(({ value, label, desc, Icon }) => (
          <button key={value} type="button"
            className={`ws-mode-btn${element.questionType === value ? ' ws-mode-btn--active' : ''}`}
            onClick={() => onChange({ ...element, questionType: value, options: ['', ''], scaleMin: 1, scaleMax: 5 })}>
            <span className="ws-mode-btn-icon"><Icon size={15} /></span>
            <span className="ws-mode-btn-title">{label}</span>
            <span className="ws-mode-btn-desc">{desc}</span>
          </button>
        ))}
      </div>
      <label className="ws-label" style={{ marginTop: 14 }}>Testo domanda</label>
      <input className="ws-field" type="text" value={element.text} placeholder="Scrivi la domanda..."
        onChange={e => onChange({ ...element, text: e.target.value })} />
      {element.questionType === 'multiple_choice' && (
        <div className="ws-options-editor">
          <label className="ws-label">Opzioni</label>
          {(element.options || []).map((opt, i) => (
            <div className="ws-option-row" key={`opt-${i}-${opt}`}>
              <span className="ws-option-num">{String.fromCharCode(65 + i)}</span>
              <input className="ws-field" type="text" value={opt} placeholder={`Opzione ${String.fromCharCode(65 + i)}`}
                onChange={e => { const o = [...(element.options || [])]; o[i] = e.target.value; onChange({ ...element, options: o }); }} />
              {(element.options || []).length > 2 && (
                <button className="ws-icon-btn" onClick={() => onChange({ ...element, options: (element.options || []).filter((_, j) => j !== i) })}><X size={14} /></button>
              )}
            </div>
          ))}
          <button className="ws-add-option-link" onClick={() => onChange({ ...element, options: [...(element.options || []), ''] })}>+ Aggiungi opzione</button>
          <div className="ws-setting-row" style={{ marginTop: 12 }}>
            <div className="ws-setting-row-info">
              <span className="ws-setting-row-title">Selezione multipla</span>
              <span className="ws-setting-row-desc">L&apos;utente può selezionare più opzioni</span>
            </div>
            <label className="ws-toggle-switch">
              <input type="checkbox" className="ws-toggle-input" checked={!!element.multipleSelect}
                onChange={e => onChange({ ...element, multipleSelect: e.target.checked })} />
              <span className="ws-toggle-track" />
              <span className="ws-toggle-knob" />
            </label>
          </div>
        </div>
      )}
      {element.questionType === 'scale' && (
        <div className="ws-scale-range">
          <label className="ws-label">Range scala</label>
          <div className="ws-scale-range-inputs">
            <div className="ws-scale-range-field">
              <span className="ws-scale-range-label">Min</span>
              <input type="number" className="ws-field" value={element.scaleMin ?? 1} min={0} max={9}
                onChange={e => {
                  const min = Number(e.target.value);
                  const max = element.scaleMax ?? 5;
                  onChange({ ...element, scaleMin: min, scaleMax: max <= min ? min + 1 : max });
                }} />
            </div>
            <div className="ws-scale-range-sep">→</div>
            <div className="ws-scale-range-field">
              <span className="ws-scale-range-label">Max</span>
              <input type="number" className="ws-field" value={element.scaleMax ?? 5} min={1} max={10}
                onChange={e => {
                  const max = Number(e.target.value);
                  const min = element.scaleMin ?? 1;
                  onChange({ ...element, scaleMax: max, scaleMin: min >= max ? max - 1 : min });
                }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;
