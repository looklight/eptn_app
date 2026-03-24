import React from 'react';
import type { QuizElement } from '../../../types';
import { Check, X } from 'lucide-react';

const QuizEditor: React.FC<{ element: QuizElement; onChange: (el: QuizElement) => void }> = ({ element, onChange }) => (
  <div className="ws-el-editor">
    <label className="ws-label">Domanda</label>
    <input className="ws-field" type="text" value={element.text} placeholder="Scrivi la domanda quiz..."
      onChange={e => onChange({ ...element, text: e.target.value })} />
    <div className="ws-options-editor" style={{ marginTop: 14 }}>
      <label className="ws-label">Opzioni · segna la risposta corretta con ✓</label>
      {element.options.map((opt, i) => (
        <div className="ws-option-row" key={`opt-${i}-${opt}`}>
          <button
            type="button"
            className={`ws-quiz-correct-btn${element.correctAnswer === i ? ' ws-quiz-correct-btn--active' : ''}`}
            onClick={() => onChange({ ...element, correctAnswer: i })}
            title="Risposta corretta"
          ><Check size={12} /></button>
          <span className="ws-option-num">{String.fromCharCode(65 + i)}</span>
          <input className="ws-field" type="text" value={opt} placeholder={`Opzione ${String.fromCharCode(65 + i)}`}
            onChange={e => { const o = [...element.options]; o[i] = e.target.value; onChange({ ...element, options: o }); }} />
          {element.options.length > 2 && (
            <button className="ws-icon-btn" onClick={() => {
              const newOpts = element.options.filter((_, j) => j !== i);
              const newCorrect = element.correctAnswer >= newOpts.length ? newOpts.length - 1 : element.correctAnswer;
              onChange({ ...element, options: newOpts, correctAnswer: newCorrect });
            }}><X size={14} /></button>
          )}
        </div>
      ))}
      <button className="ws-add-option-link" onClick={() => onChange({ ...element, options: [...element.options, ''] })}>
        + Aggiungi opzione
      </button>
    </div>
    <div className="ws-scale-range" style={{ marginTop: 12 }}>
      <label className="ws-label">Limite di tempo in secondi (opzionale)</label>
      <div className="ws-scale-range-inputs">
        <input type="number" className="ws-field" value={element.timeLimit ?? ''} min={5} max={120}
          placeholder="Nessun limite"
          style={{ width: 120 }}
          onChange={e => onChange({ ...element, timeLimit: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
    </div>
    <div className="ws-setting-row" style={{ marginTop: 16 }}>
      <div className="ws-setting-row-info">
        <span className="ws-setting-row-title">Mostra classifica dopo questa slide</span>
        <span className="ws-setting-row-desc">I partecipanti vedono la classifica cumulativa prima di avanzare</span>
      </div>
      <label className="ws-toggle-switch">
        <input type="checkbox" className="ws-toggle-input" checked={!!element.showLeaderboard}
          onChange={e => onChange({ ...element, showLeaderboard: e.target.checked })} />
        <span className="ws-toggle-track" />
        <span className="ws-toggle-knob" />
      </label>
    </div>
  </div>
);

export default QuizEditor;
