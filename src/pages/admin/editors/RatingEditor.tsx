import React from 'react';
import type { RatingElement, RatingCategory } from '../../../types';
import { X } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

const RatingEditor: React.FC<{ element: RatingElement; onChange: (el: RatingElement) => void }> = ({ element, onChange }) => {
  const updateCat = (idx: number, label: string) => {
    const cats = [...element.categories];
    cats[idx] = { ...cats[idx], label };
    onChange({ ...element, categories: cats });
  };

  return (
    <div className="ws-el-editor">
      <label className="ws-label">Titolo (opzionale)</label>
      <input className="ws-field" type="text" value={element.title} placeholder="Es. Valuta il ristorante"
        onChange={e => onChange({ ...element, title: e.target.value })} />
      {element.categories.length > 0 && <label className="ws-label" style={{ marginTop: 14 }}>Categorie da valutare</label>}
      {element.categories.map((cat, i) => (
        <div className="ws-option-row" key={cat.id}>
          <span className="ws-option-num">{i + 1}</span>
          <input className="ws-field" type="text" value={cat.label} placeholder="Es. Cucina, Servizio, Atmosfera..."
            onChange={e => updateCat(i, e.target.value)} />
          {element.categories.length > 1 && (
            <button className="ws-icon-btn" onClick={() =>
              onChange({ ...element, categories: element.categories.filter((c: RatingCategory) => c.id !== cat.id) })
            }><X size={14} /></button>
          )}
        </div>
      ))}
      <button className="ws-add-option-link" onClick={() =>
        onChange({ ...element, categories: [...element.categories, { id: uid(), label: '' }] })
      }>+ Aggiungi categoria</button>
      <div className="ws-setting-row" style={{ marginTop: 16 }}>
        <div className="ws-setting-row-info">
          <span className="ws-setting-row-title">Mostra nel riepilogo finale</span>
          <span className="ws-setting-row-desc">I partecipanti vedono questa valutazione nella pagina di confronto finale</span>
        </div>
        <label className="ws-toggle-switch">
          <input type="checkbox" className="ws-toggle-input" checked={!!element.showSummary}
            onChange={e => onChange({ ...element, showSummary: e.target.checked })} />
          <span className="ws-toggle-track" />
          <span className="ws-toggle-knob" />
        </label>
      </div>
    </div>
  );
};

export default RatingEditor;
