import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import type { Slide, SlideElement, QuizElement, CarouselElement, RatingElement, ResultsElement } from '../../types';
import { getSlideMode } from '../../types';
import {
  FileText, HelpCircle, SlidersHorizontal, ChevronUp, ChevronDown,
  Check, Layers, Square, Trophy, GalleryHorizontal, Star, BarChart2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import InfoEditor from './editors/InfoEditor';
import QuestionEditor from './editors/QuestionEditor';
import ConfiguratorEditor from './editors/ConfiguratorEditor';
import QuizEditor from './editors/QuizEditor';
import CarouselEditor from './editors/CarouselEditor';
import RatingEditor from './editors/RatingEditor';
import ResultsEditor from './editors/ResultsEditor';
import ModeDropdown from './ModeDropdown';
import SlideImageUploader from './SlideImageUploader';
import SlideNavPanel from './SlideNavPanel';
import SlidePreview from './SlidePreview';

const uid = () => Math.random().toString(36).slice(2, 10);

const typeConfig: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  info:         { label: 'Info / Testo',     color: '#6366f1', Icon: FileText },
  question:     { label: 'Domanda',          color: '#f59e0b', Icon: HelpCircle },
  configurator: { label: 'Configuratore',    color: '#009999', Icon: SlidersHorizontal },
  quiz:         { label: 'Quiz',             color: '#e11d48', Icon: Trophy },
  carousel:     { label: 'Carosello',        color: '#7c3aed', Icon: GalleryHorizontal },
  rating:       { label: 'Valutazione ★',   color: '#d97706', Icon: Star },
  results:      { label: 'Risultati',        color: '#10b981', Icon: BarChart2 },
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
          <span className="ws-el-type-icon"><cfg.Icon size={13} /></span>
          {cfg.label}
        </div>
        <div className="ws-el-actions">
          <button className="ws-el-move" disabled={index === 0} onClick={() => onMove('up')} title="Sposta su"><ChevronUp size={13} /></button>
          <button className="ws-el-move" disabled={index === total - 1} onClick={() => onMove('down')} title="Sposta giù"><ChevronDown size={13} /></button>
          <button className="ws-el-remove" onClick={onRemove} title="Elimina elemento">Elimina</button>
        </div>
      </div>
      {element.type === 'info' && <InfoEditor element={element} onChange={el => onChange(el)} />}
      {element.type === 'question' && <QuestionEditor element={element} onChange={el => onChange(el)} />}
      {element.type === 'configurator' && <ConfiguratorEditor element={element} onChange={el => onChange(el)} />}
      {element.type === 'quiz' && <QuizEditor element={element as QuizElement} onChange={el => onChange(el)} />}
      {element.type === 'carousel' && <CarouselEditor element={element as CarouselElement} onChange={el => onChange(el)} />}
      {element.type === 'rating' && <RatingEditor element={element as RatingElement} onChange={el => onChange(el)} />}
      {element.type === 'results' && <ResultsEditor element={element as ResultsElement} onChange={el => onChange(el)} />}
    </div>
  );
};

// ---- Main SlidesTab ----

const SlidesTab: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [editing, setEditing] = useState<Slide | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const isLast = (s: Slide) => sorted[sorted.length - 1]?.id === s.id;

  const persistCurrent = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, order: _order, ...data } = editing; // order è gestito solo da moveSlide
    await updateDoc(doc(db, 'slides', id), data as Record<string, unknown>);
    setSaving(false);
  };

  const addSlide = async () => {
    await persistCurrent();
    const maxOrder = slides.reduce((m, s) => Math.max(m, s.order), 0);
    const ref = await addDoc(collection(db, 'slides'), {
      order: maxOrder + 1, title: 'Nuova slide', mode: 'moderated', pin: '', elements: [], createdAt: serverTimestamp()
    });
    setEditing({ id: ref.id, order: maxOrder + 1, title: 'Nuova slide', mode: 'moderated', pin: '', elements: [] });
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Eliminare questa slide?')) return;
    await deleteDoc(doc(db, 'slides', id));
    if (editing?.id === id) setEditing(null);
    await Promise.allSettled([
      deleteObject(storageRef(storage, `slide-images/${id}`)),
      deleteObject(storageRef(storage, `slide-images/${id}_thumb`)),
    ]);
    // Pulizia immagini carosello nella slide eliminata.
    // Se la slide era in editing, usa lo stato locale (può avere immagini non ancora salvate su Firestore).
    const slide = (editing?.id === id ? editing : null) ?? sorted.find(s => s.id === id);
    slide?.elements.forEach(el => {
      if (el.type === 'carousel') {
        el.items.forEach(item => {
          deleteObject(storageRef(storage, `carousel-images/${el.id}/${item.id}`)).catch(() => {});
          deleteObject(storageRef(storage, `carousel-images/${el.id}/${item.id}_thumb`)).catch(() => {});
        });
      }
    });
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

  const handleNavToSlide = async (target: Slide) => {
    if (target.id === editing?.id) return;
    await persistCurrent();
    setEditing({ ...target });
  };

  const addElement = (type: string) => {
    if (!editing) return;
    let el: SlideElement;
    if (type === 'info') el = { id: uid(), type: 'info', content: '' };
    else if (type === 'question') el = { id: uid(), type: 'question', questionType: 'multiple_choice', text: '', options: ['', ''] };
    else if (type === 'quiz') el = { id: uid(), type: 'quiz', text: '', options: ['', '', '', ''], correctAnswer: 0 } as QuizElement;
    else if (type === 'carousel') el = { id: uid(), type: 'carousel', title: '', items: [] } as CarouselElement;
    else if (type === 'rating') el = { id: uid(), type: 'rating', title: '', categories: [{ id: uid(), label: '' }, { id: uid(), label: '' }] } as RatingElement;
    else if (type === 'results') el = { id: uid(), type: 'results', sourceElementIds: [] } as ResultsElement;
    else el = { id: uid(), type: 'configurator', title: '', categories: [] };
    setEditing({ ...editing, elements: [...editing.elements, el] });
  };

  const updateEl = (updated: SlideElement) =>
    setEditing(prev => prev ? { ...prev, elements: prev.elements.map(e => e.id === updated.id ? updated : e) } : prev);

  const removeEl = (id: string) => {
    const el = editing?.elements.find(e => e.id === id);
    if (el?.type === 'carousel') {
      el.items.forEach(item => {
        deleteObject(storageRef(storage, `carousel-images/${el.id}/${item.id}`)).catch(() => {});
        deleteObject(storageRef(storage, `carousel-images/${el.id}/${item.id}_thumb`)).catch(() => {});
      });
    }
    setEditing(prev => prev ? { ...prev, elements: prev.elements.filter(e => e.id !== id) } : prev);
  };

  const moveEl = (idx: number, dir: 'up' | 'down') => {
    if (!editing) return;
    const els = [...editing.elements];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [els[idx], els[swap]] = [els[swap], els[idx]];
    setEditing({ ...editing, elements: els });
  };

  const last = editing ? isLast(editing) : false;

  return (
    <div className="ws-slide-editor">
      <div className="ws-editor-topbar">
        <span className="ws-editor-topbar-title" style={!editing ? { color: 'var(--ws-muted)', fontWeight: 500 } : undefined}>
          {editing ? (editing.title || 'Nuova slide') : 'Seleziona una slide'}
        </span>
        {editing && (
          <button className="ws-btn ws-btn-primary" onClick={persistCurrent} disabled={saving}>
            {saving ? 'Salvataggio...' : <><Check size={14} /> Salva</>}
          </button>
        )}
      </div>

      <div className="ws-slide-editor-with-preview">
        <SlideNavPanel
          slides={sorted}
          editingId={editing?.id ?? null}
          saving={saving}
          onSelect={handleNavToSlide}
          onAdd={addSlide}
          onDelete={deleteSlide}
          onMove={moveSlide}
        />

        {editing ? (
          <>
            <div className="ws-slide-edit-body">
              {/* Slide metadata */}
              <div className="ws-edit-section">
                <div className="ws-edit-settings">
                  <div className="ws-edit-settings-title">
                    <label className="ws-label">Titolo slide</label>
                    <input className="ws-field" type="text" value={editing.title} placeholder="Es. Benvenuto, Modulo 1..."
                      onChange={e => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                  <div className="ws-edit-settings-row ws-edit-settings-row--image">
                    <label className="ws-label">Immagine di copertina</label>
                    <SlideImageUploader
                      slide={editing}
                      onImageChange={(url, thumbUrl) => setEditing(prev => prev ? { ...prev, imageUrl: url, thumbnailUrl: thumbUrl } : prev)}
                    />
                  </div>
                  {last ? (
                    <div className="ws-edit-settings-row ws-edit-settings-row--last">
                      <p className="ws-last-slide-note">
                        Questa è l&apos;ultima slide — al termine verrà mostrato il pulsante di invio finale, non &quot;Avanti&quot;.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className={`ws-edit-settings-row${getSlideMode(editing) !== 'pin' ? ' ws-edit-settings-row--last' : ''}`}>
                        <ModeDropdown
                          inlineLabel="Modalità avanzamento"
                          value={getSlideMode(editing)}
                          onChange={mode => {
                            if (mode === 'moderated') setEditing({ ...editing, mode: 'moderated', pin: '', showRecap: false });
                            else if (mode === 'pin') setEditing({ ...editing, mode: 'pin' });
                            else setEditing({ ...editing, mode: 'autonomous', pin: '', showRecap: false });
                          }}
                        />
                        {getSlideMode(editing) === 'pin' && (
                          <div className="ws-pin-inline">
                            <label className="ws-label">Codice PIN</label>
                            <input className="ws-field ws-pin-field" type="text" inputMode="numeric" pattern="[0-9]*"
                              value={editing.pin} maxLength={6} placeholder="· · ·"
                              onChange={e => setEditing({ ...editing, pin: e.target.value.replace(/\D/g, '') })} />
                          </div>
                        )}
                      </div>
                      {getSlideMode(editing) === 'pin' && (
                        <div className="ws-edit-settings-row ws-edit-settings-row--last">
                          <div className="ws-setting-row">
                            <div className="ws-setting-row-info">
                              <span className="ws-setting-row-title">Mostra riepilogo prima di avanzare</span>
                              <span className="ws-setting-row-desc">L&apos;utente vede le sue risposte dopo il PIN</span>
                            </div>
                            <label className="ws-toggle-switch">
                              <input type="checkbox" className="ws-toggle-input" checked={!!editing.showRecap}
                                onChange={e => setEditing({ ...editing, showRecap: e.target.checked })} />
                              <span className="ws-toggle-track" />
                              <span className="ws-toggle-knob" />
                            </label>
                          </div>
                        </div>
                      )}
                    </>
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
                    <div className="ws-elements-empty-icon"><Square size={32} strokeWidth={1.5} /></div>
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
                      <span className="ws-add-el-icon"><FileText size={20} /></span>
                      <span className="ws-add-el-name">Info / Testo</span>
                    </button>
                    <button className="ws-add-el-btn ws-add-el-btn--configurator" onClick={() => addElement('configurator')}>
                      <span className="ws-add-el-icon"><SlidersHorizontal size={20} /></span>
                      <span className="ws-add-el-name">Configuratore</span>
                    </button>
                    <button className="ws-add-el-btn ws-add-el-btn--carousel" onClick={() => addElement('carousel')}>
                      <span className="ws-add-el-icon"><GalleryHorizontal size={20} /></span>
                      <span className="ws-add-el-name">Carosello</span>
                    </button>
                    <button className="ws-add-el-btn ws-add-el-btn--question" onClick={() => addElement('question')}>
                      <span className="ws-add-el-icon"><HelpCircle size={20} /></span>
                      <span className="ws-add-el-name">Domanda</span>
                    </button>
                    <button
                      className="ws-add-el-btn ws-add-el-btn--quiz"
                      onClick={() => addElement('quiz')}
                      disabled={editing.elements.some(e => e.type === 'quiz')}
                      title={editing.elements.some(e => e.type === 'quiz') ? 'Un solo quiz per slide' : undefined}
                    >
                      <span className="ws-add-el-icon"><Trophy size={20} /></span>
                      <span className="ws-add-el-name">Quiz</span>
                    </button>
                    <button className="ws-add-el-btn ws-add-el-btn--rating" onClick={() => addElement('rating')}>
                      <span className="ws-add-el-icon"><Star size={20} /></span>
                      <span className="ws-add-el-name">Valutazione</span>
                    </button>
                    <button className="ws-add-el-btn ws-add-el-btn--results" onClick={() => addElement('results')}>
                      <span className="ws-add-el-icon"><BarChart2 size={20} /></span>
                      <span className="ws-add-el-name">Risultati</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <SlidePreview slide={editing} />
          </>
        ) : (
          <div className="ws-slides-no-selection">
            <Layers size={40} strokeWidth={1.25} className="ws-slides-no-sel-icon" />
            <p>Seleziona una slide dalla lista</p>
            <p className="ws-slides-empty-sub">oppure creane una nuova con il pulsante in fondo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlidesTab;
