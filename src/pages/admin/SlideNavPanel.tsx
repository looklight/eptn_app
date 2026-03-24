import React from 'react';
import type { Slide } from '../../types';
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';

const SlideNavPanel: React.FC<{
  slides: Slide[];
  editingId: string | null;
  saving: boolean;
  onSelect: (slide: Slide) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (slide: Slide, dir: 'up' | 'down') => void;
}> = ({ slides, editingId, saving, onSelect, onAdd, onDelete, onMove }) => (
  <div className="ws-slide-nav-panel">
    <span className="ws-slide-nav-label">
      Slide{slides.length > 0 ? ` (${slides.length})` : ''}
    </span>

    {slides.length === 0 && (
      <p className="ws-slide-nav-empty">Nessuna slide ancora.</p>
    )}

    {slides.map((s, i) => (
      <div
        key={s.id}
        className={`ws-slide-nav-item${s.id === editingId ? ' active' : ''}${saving ? ' disabled' : ''}`}
        onClick={() => !saving && onSelect(s)}
        role="button"
        tabIndex={saving ? -1 : 0}
        onKeyDown={e => e.key === 'Enter' && !saving && onSelect(s)}
      >
        <span className="ws-slide-nav-num">{i + 1}</span>
        <span className="ws-slide-nav-title">{s.title || 'Senza titolo'}</span>
        <div className="ws-slide-nav-actions">
          <button
            className="ws-slide-nav-action"
            disabled={i === 0 || saving}
            onClick={e => { e.stopPropagation(); onMove(s, 'up'); }}
            title="Sposta su"
          ><ChevronUp size={11} /></button>
          <button
            className="ws-slide-nav-action"
            disabled={i === slides.length - 1 || saving}
            onClick={e => { e.stopPropagation(); onMove(s, 'down'); }}
            title="Sposta giù"
          ><ChevronDown size={11} /></button>
          <button
            className="ws-slide-nav-action ws-slide-nav-action--delete"
            disabled={saving}
            onClick={e => { e.stopPropagation(); onDelete(s.id); }}
            title="Elimina slide"
          ><Trash2 size={11} /></button>
        </div>
      </div>
    ))}

    <button className="ws-slide-nav-add" onClick={onAdd} disabled={saving}>
      <Plus size={13} /> Nuova slide
    </button>
  </div>
);

export default SlideNavPanel;
