import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import type {
  Slide, SlideElement, InfoElement, QuestionElement,
  ConfiguratorElement, ConfigCategory, ConfigProduct, QuestionType
} from '../../types';

const uid = () => Math.random().toString(36).slice(2, 10);

// ---- Element Editors ----

const InfoEditor: React.FC<{ element: InfoElement; onChange: (el: InfoElement) => void }> = ({ element, onChange }) => (
  <div className="ws-el-editor">
    <label className="ws-label">Testo / contenuto</label>
    <textarea className="ws-field ws-textarea" rows={4} value={element.content}
      onChange={e => onChange({ ...element, content: e.target.value })}
      placeholder="Testo introduttivo, istruzioni, note..." />
  </div>
);

const QuestionEditor: React.FC<{ element: QuestionElement; onChange: (el: QuestionElement) => void }> = ({ element, onChange }) => {
  const types: Record<string, string> = { multiple_choice: 'Scelta multipla', scale: 'Scala numerica', text: 'Testo libero', yes_no: 'Sì / No' };
  return (
    <div className="ws-el-editor">
      <div className="ws-el-editor-row">
        <div className="ws-el-editor-col">
          <label className="ws-label">Tipo domanda</label>
          <select className="ws-select" value={element.questionType}
            onChange={e => onChange({ ...element, questionType: e.target.value as QuestionType, options: ['', ''], scaleMin: 1, scaleMax: 5 })}>
            {Object.entries(types).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <label className="ws-label">Testo domanda</label>
      <input className="ws-field" type="text" value={element.text} placeholder="Scrivi la domanda..."
        onChange={e => onChange({ ...element, text: e.target.value })} />
      {element.questionType === 'multiple_choice' && (
        <div className="ws-options-editor">
          <label className="ws-label">Opzioni</label>
          {(element.options || []).map((opt, i) => (
            <div className="ws-option-row" key={i}>
              <span className="ws-option-num">{i + 1}</span>
              <input className="ws-field" type="text" value={opt} placeholder={`Opzione ${i + 1}`}
                onChange={e => { const o = [...(element.options || [])]; o[i] = e.target.value; onChange({ ...element, options: o }); }} />
              {(element.options || []).length > 2 && (
                <button className="ws-icon-btn" onClick={() => onChange({ ...element, options: (element.options || []).filter((_, j) => j !== i) })}>×</button>
              )}
            </div>
          ))}
          <button className="ws-add-option-link" onClick={() => onChange({ ...element, options: [...(element.options || []), ''] })}>+ Aggiungi opzione</button>
        </div>
      )}
      {element.questionType === 'scale' && (
        <div className="ws-scale-range">
          <label className="ws-label">Range scala</label>
          <div className="ws-scale-range-inputs">
            <div className="ws-scale-range-field">
              <span className="ws-scale-range-label">Min</span>
              <input type="number" className="ws-field" value={element.scaleMin ?? 1} min={0} max={9}
                onChange={e => onChange({ ...element, scaleMin: Number(e.target.value) })} />
            </div>
            <div className="ws-scale-range-sep">→</div>
            <div className="ws-scale-range-field">
              <span className="ws-scale-range-label">Max</span>
              <input type="number" className="ws-field" value={element.scaleMax ?? 5} min={1} max={10}
                onChange={e => onChange({ ...element, scaleMax: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfiguratorEditor: React.FC<{ element: ConfiguratorElement; onChange: (el: ConfiguratorElement) => void }> = ({ element, onChange }) => {
  const updateCat = (catId: string, update: Partial<ConfigCategory>) =>
    onChange({ ...element, categories: element.categories.map(c => c.id === catId ? { ...c, ...update } : c) });

  const updateProd = (catId: string, prodId: string, update: Partial<ConfigProduct>) => {
    const cat = element.categories.find(c => c.id === catId);
    if (!cat) return;
    updateCat(catId, { products: cat.products.map(p => p.id === prodId ? { ...p, ...update } : p) });
  };

  return (
    <div className="ws-el-editor">
      <label className="ws-label">Titolo configuratore</label>
      <input className="ws-field" type="text" value={element.title} placeholder="Es. Seleziona la tua soluzione"
        onChange={e => onChange({ ...element, title: e.target.value })} />

      {element.categories.length > 0 && <label className="ws-label" style={{ marginTop: 4 }}>Categorie</label>}
      {element.categories.map((cat, ci) => (
        <div key={cat.id} className="ws-config-cat-editor">
          <div className="ws-config-cat-header">
            <span className="ws-config-cat-num">{ci + 1}</span>
            <input className="ws-field" type="text" value={cat.label} placeholder="Nome categoria"
              onChange={e => updateCat(cat.id, { label: e.target.value })} />
            <button className="ws-icon-btn" title="Elimina categoria"
              onClick={() => onChange({ ...element, categories: element.categories.filter(c => c.id !== cat.id) })}>×</button>
          </div>
          <div className="ws-products-editor">
            {cat.products.map(prod => (
              <div key={prod.id} className="ws-product-editor">
                <div className="ws-product-editor-row">
                  <input className="ws-field ws-product-icon-field" type="text" value={prod.icon || ''} placeholder="🔌"
                    onChange={e => updateProd(cat.id, prod.id, { icon: e.target.value })} />
                  <input className="ws-field" type="text" value={prod.name} placeholder="Nome prodotto"
                    onChange={e => updateProd(cat.id, prod.id, { name: e.target.value })} style={{ flex: 2 }} />
                  <input className="ws-field ws-product-price-field" type="number" value={prod.price ?? ''} placeholder="€"
                    onChange={e => updateProd(cat.id, prod.id, { price: Number(e.target.value) })} />
                  <button className="ws-icon-btn" title="Elimina prodotto"
                    onClick={() => updateCat(cat.id, { products: cat.products.filter(p => p.id !== prod.id) })}>×</button>
                </div>
                <div className="ws-product-editor-details">
                  <input className="ws-field" type="text" value={prod.description} placeholder="Descrizione"
                    onChange={e => updateProd(cat.id, prod.id, { description: e.target.value })} />
                  <input className="ws-field" type="text" value={prod.specs || ''} placeholder="Specifiche (opzionale)"
                    onChange={e => updateProd(cat.id, prod.id, { specs: e.target.value })} />
                </div>
              </div>
            ))}
            <button className="ws-add-option-link" onClick={() =>
              updateCat(cat.id, { products: [...cat.products, { id: uid(), name: '', description: '', specs: '', price: 0, icon: '⚡' }] })
            }>+ Aggiungi prodotto</button>
          </div>
        </div>
      ))}
      <button className="ws-add-cat-btn"
        onClick={() => onChange({ ...element, categories: [...element.categories, { id: uid(), label: '', products: [] }] })}>
        + Aggiungi categoria
      </button>
    </div>
  );
};

// ---- Element wrapper ----

const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
  info:         { label: 'Info / Testo',  color: '#6366f1', icon: '📝' },
  question:     { label: 'Domanda',       color: '#f59e0b', icon: '❓' },
  configurator: { label: 'Configuratore', color: '#009999', icon: '⚙️' },
};

const ElWrapper: React.FC<{
  element: SlideElement; index: number; total: number;
  onChange: (el: SlideElement) => void; onRemove: () => void; onMove: (d: 'up' | 'down') => void;
}> = ({ element, index, total, onChange, onRemove, onMove }) => {
  const cfg = typeConfig[element.type];
  return (
    <div className="ws-element-editor-wrapper" style={{ '--el-color': cfg.color } as React.CSSProperties}>
      <div className="ws-el-header">
        <div className="ws-el-type-badge">
          <span className="ws-el-type-icon">{cfg.icon}</span>
          {cfg.label}
        </div>
        <div className="ws-el-actions">
          <button className="ws-el-move" disabled={index === 0} onClick={() => onMove('up')} title="Sposta su">↑</button>
          <button className="ws-el-move" disabled={index === total - 1} onClick={() => onMove('down')} title="Sposta giù">↓</button>
          <button className="ws-el-remove" onClick={onRemove} title="Elimina elemento">Elimina</button>
        </div>
      </div>
      {element.type === 'info' && <InfoEditor element={element} onChange={el => onChange(el)} />}
      {element.type === 'question' && <QuestionEditor element={element} onChange={el => onChange(el)} />}
      {element.type === 'configurator' && <ConfiguratorEditor element={element} onChange={el => onChange(el)} />}
    </div>
  );
};

// ---- Main SlidesTab ----

const SlidesTab: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [editing, setEditing] = useState<Slide | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const isLast = (s: Slide) => sorted[sorted.length - 1]?.id === s.id;

  const addSlide = async () => {
    const maxOrder = slides.reduce((m, s) => Math.max(m, s.order), 0);
    const ref = await addDoc(collection(db, 'slides'), {
      order: maxOrder + 1, title: 'Nuova slide', pin: '', elements: [], createdAt: serverTimestamp()
    });
    setEditing({ id: ref.id, order: maxOrder + 1, title: 'Nuova slide', pin: '', elements: [] });
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Eliminare questa slide?')) return;
    await deleteDoc(doc(db, 'slides', id));
  };

  const moveSlide = async (slide: Slide, dir: 'up' | 'down') => {
    const idx = sorted.findIndex(s => s.id === slide.id);
    const target = dir === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!target) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'slides', slide.id), { order: target.order });
    batch.update(doc(db, 'slides', target.id), { order: slide.order });
    await batch.commit();
  };

  const saveSlide = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, ...data } = editing;
    await updateDoc(doc(db, 'slides', id), data as Record<string, unknown>);
    setSaving(false);
    setEditing(null);
  };

  const addElement = (type: string) => {
    if (!editing) return;
    let el: SlideElement;
    if (type === 'info') el = { id: uid(), type: 'info', content: '' };
    else if (type === 'question') el = { id: uid(), type: 'question', questionType: 'multiple_choice', text: '', options: ['', ''] };
    else el = { id: uid(), type: 'configurator', title: '', categories: [] };
    setEditing({ ...editing, elements: [...editing.elements, el] });
  };

  const updateEl = (updated: SlideElement) =>
    setEditing(prev => prev ? { ...prev, elements: prev.elements.map(e => e.id === updated.id ? updated : e) } : prev);

  const removeEl = (id: string) =>
    setEditing(prev => prev ? { ...prev, elements: prev.elements.filter(e => e.id !== id) } : prev);

  const moveEl = (idx: number, dir: 'up' | 'down') => {
    if (!editing) return;
    const els = [...editing.elements];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [els[idx], els[target]] = [els[target], els[idx]];
    setEditing({ ...editing, elements: els });
  };

  // ---- Editor view ----
  if (editing) {
    const last = isLast(editing);
    return (
      <div className="ws-slide-editor">
        <div className="ws-editor-topbar">
          <button className="ws-btn ws-btn-ghost" onClick={() => setEditing(null)}>
            ← Lista slide
          </button>
          <span className="ws-editor-topbar-title">{editing.title || 'Nuova slide'}</span>
          <button className="ws-btn ws-btn-primary" onClick={saveSlide} disabled={saving}>
            {saving ? 'Salvataggio...' : '✓ Salva slide'}
          </button>
        </div>

        <div className="ws-slide-edit-body">
          {/* Slide metadata */}
          <div className="ws-edit-section">
            <div className="ws-edit-section-label">Impostazioni slide</div>
            <div className="ws-edit-meta-grid">
              <div className="ws-field-group">
                <label className="ws-label">Titolo slide</label>
                <input className="ws-field" type="text" value={editing.title} placeholder="Es. Benvenuto, Modulo 1..."
                  onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="ws-field-group">
                <label className="ws-label">
                  PIN per avanzare
                  {last && <span className="ws-pin-note"> — non necessario (ultima slide)</span>}
                </label>
                <input className="ws-field ws-pin-field" type="text" inputMode="numeric" pattern="[0-9]*"
                  value={editing.pin} maxLength={6} disabled={last} placeholder="Es. 742"
                  onChange={e => setEditing({ ...editing, pin: e.target.value.replace(/\D/g, '') })} />
              </div>
              {!last && (
                <div className="ws-field-group">
                  <label className="ws-checkbox-row">
                    <input type="checkbox" checked={!!editing.showRecap}
                      onChange={e => setEditing({ ...editing, showRecap: e.target.checked })} />
                    <span>Mostra riepilogo risposte prima di avanzare</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Elements */}
          <div className="ws-edit-section">
            <div className="ws-edit-section-label">
              Elementi
              {editing.elements.length > 0 && <span className="ws-edit-section-count">{editing.elements.length}</span>}
            </div>

            {editing.elements.length === 0 && (
              <div className="ws-elements-empty">
                <div className="ws-elements-empty-icon">☐</div>
                <p>Nessun elemento. Aggiungine uno qui sotto.</p>
              </div>
            )}

            {editing.elements.map((el, i) => (
              <ElWrapper key={el.id} element={el} index={i} total={editing.elements.length}
                onChange={updateEl} onRemove={() => removeEl(el.id)} onMove={d => moveEl(i, d)} />
            ))}

            <div className="ws-add-el-section">
              <span className="ws-add-el-label">Aggiungi elemento</span>
              <div className="ws-add-el-btns">
                <button className="ws-add-el-btn ws-add-el-btn--info" onClick={() => addElement('info')}>
                  <span>📝</span> Info / Testo
                </button>
                <button className="ws-add-el-btn ws-add-el-btn--question" onClick={() => addElement('question')}>
                  <span>❓</span> Domanda
                </button>
                <button className="ws-add-el-btn ws-add-el-btn--configurator" onClick={() => addElement('configurator')}>
                  <span>⚙️</span> Configuratore
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="ws-slides-list-view">
      {sorted.length === 0 ? (
        <div className="ws-slides-empty">
          <div className="ws-slides-empty-icon">▤</div>
          <p>Nessuna slide ancora.</p>
          <p className="ws-slides-empty-sub">Crea la prima slide per iniziare a costruire il tuo workshop.</p>
        </div>
      ) : (
        <div className="ws-slides-list">
          {sorted.map((slide, i) => {
            const types = [...new Set(slide.elements.map(e => e.type))];
            const pinOk = isLast(slide) || slide.pin;
            return (
              <div className="ws-slide-card" key={slide.id}>
                <div className="ws-slide-card-num">{i + 1}</div>
                <div className="ws-slide-card-body">
                  <div className="ws-slide-card-title">{slide.title}</div>
                  <div className="ws-slide-card-meta">
                    {types.map(t => (
                      <span key={t} className={`ws-type-chip ws-type-chip--${t}`}>
                        {typeConfig[t].icon} {typeConfig[t].label}
                      </span>
                    ))}
                    {slide.elements.length === 0 && <span className="ws-type-chip ws-type-chip--empty">Vuota</span>}
                    {isLast(slide)
                      ? <span className="ws-pin-chip ws-pin-chip--last">Ultima slide</span>
                      : pinOk
                        ? <span className="ws-pin-chip ws-pin-chip--ok">PIN: {slide.pin}</span>
                        : <span className="ws-pin-chip ws-pin-chip--warn">⚠ PIN mancante</span>
                    }
                  </div>
                </div>
                <div className="ws-slide-card-actions">
                  <div className="ws-slide-card-move">
                    <button className="ws-move-btn" disabled={i === 0} onClick={() => moveSlide(slide, 'up')} title="Sposta su">↑</button>
                    <button className="ws-move-btn" disabled={i === sorted.length - 1} onClick={() => moveSlide(slide, 'down')} title="Sposta giù">↓</button>
                  </div>
                  <button className="ws-btn ws-btn-secondary ws-btn-sm" onClick={() => setEditing({ ...slide })}>Modifica</button>
                  <button className="ws-slide-delete-btn" onClick={() => deleteSlide(slide.id)} title="Elimina">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="ws-slides-list-footer">
        <button className="ws-btn ws-btn-primary" onClick={addSlide}>+ Nuova slide</button>
      </div>
    </div>
  );
};

export default SlidesTab;
