import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, deleteField } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import type {
  Slide, SlideElement, InfoElement, QuestionElement,
  ConfiguratorElement, ConfigCategory, ConfigProduct, QuestionType,
  QuizElement, CarouselElement, CarouselItem, SlideMode,
} from '../../types';
import { getSlideMode } from '../../types';
import InfoEl from '../../components/elements/InfoEl';
import QuestionEl from '../../components/elements/QuestionEl';
import ConfiguratorEl from '../../components/elements/ConfiguratorEl';
import QuizEl from '../../components/elements/QuizEl';
import CarouselEl from '../../components/elements/CarouselEl';
import {
  FileText, HelpCircle, SlidersHorizontal, Trash2,
  ChevronUp, ChevronDown, X, Check, Layers, Square,
  Users, KeyRound, Unlock, Plus, Trophy,
  List, BarChart2, AlignLeft, ToggleLeft, ImageIcon, GalleryHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

// ---- Slide image uploader ----

const SlideImageUploader: React.FC<{
  slide: Slide;
  onImageChange: (url: string | undefined) => void;
}> = ({ slide, onImageChange }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      taskRef.current?.cancel();
    };
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    setUploadError('');
    setProgress(0);
    const sRef = storageRef(storage, `slide-images/${slide.id}`);
    const task = uploadBytesResumable(sRef, file);
    taskRef.current = task;
    task.on(
      'state_changed',
      snap => {
        if (mountedRef.current) setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      () => {
        if (mountedRef.current) { setUploading(false); setUploadError('Upload fallito. Riprova.'); }
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          await updateDoc(doc(db, 'slides', slide.id), { imageUrl: url });
          if (mountedRef.current) { onImageChange(url); setUploading(false); }
        } catch {
          if (mountedRef.current) { setUploading(false); setUploadError('Errore nel salvataggio. Riprova.'); }
        }
      },
    );
  };

  const removeImage = async () => {
    try {
      await deleteObject(storageRef(storage, `slide-images/${slide.id}`));
    } catch { /* il file potrebbe non esistere nello storage */ }
    await updateDoc(doc(db, 'slides', slide.id), { imageUrl: deleteField() });
    onImageChange(undefined);
  };

  if (slide.imageUrl) {
    return (
      <div className="ws-slide-image-preview">
        <img src={slide.imageUrl} alt="" className="ws-slide-image-thumb" />
        <button className="ws-slide-image-remove" onClick={removeImage} type="button">
          <X size={12} /> Rimuovi immagine
        </button>
      </div>
    );
  }

  return (
    <div className="ws-slide-image-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {uploading ? (
        <div className="ws-slide-image-uploading">
          <div className="ws-slide-image-progress-bar">
            <div className="ws-slide-image-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ws-slide-image-progress-pct">{progress}%</span>
        </div>
      ) : (
        <>
          <button
            className="ws-slide-image-btn"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon size={15} /> Aggiungi immagine di copertina
          </button>
          {uploadError && <p className="ws-slide-image-error">{uploadError}</p>}
        </>
      )}
    </div>
  );
};

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
            <div className="ws-option-row" key={i}>
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
              onClick={() => onChange({ ...element, categories: element.categories.filter(c => c.id !== cat.id) })}><X size={14} /></button>
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
                    onClick={() => updateCat(cat.id, { products: cat.products.filter(p => p.id !== prod.id) })}><X size={14} /></button>
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

const QuizEditor: React.FC<{ element: QuizElement; onChange: (el: QuizElement) => void }> = ({ element, onChange }) => (
  <div className="ws-el-editor">
    <label className="ws-label">Domanda</label>
    <input className="ws-field" type="text" value={element.text} placeholder="Scrivi la domanda quiz..."
      onChange={e => onChange({ ...element, text: e.target.value })} />
    <div className="ws-options-editor" style={{ marginTop: 14 }}>
      <label className="ws-label">Opzioni · segna la risposta corretta con ✓</label>
      {element.options.map((opt, i) => (
        <div className="ws-option-row" key={i}>
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

// ---- Carousel item image uploader ----

const CarouselItemImageUploader: React.FC<{
  elementId: string;
  itemId: string;
  imageUrl?: string;
  onImageChange: (url: string | undefined) => void;
}> = ({ elementId, itemId, imageUrl, onImageChange }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      taskRef.current?.cancel();
    };
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    setUploadError('');
    setProgress(0);
    const sRef = storageRef(storage, `carousel-images/${elementId}/${itemId}`);
    const task = uploadBytesResumable(sRef, file);
    taskRef.current = task;
    task.on(
      'state_changed',
      snap => {
        if (mountedRef.current) setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      () => {
        if (mountedRef.current) { setUploading(false); setUploadError('Upload fallito. Riprova.'); }
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          if (mountedRef.current) { onImageChange(url); setUploading(false); }
        } catch {
          if (mountedRef.current) { setUploading(false); setUploadError('Errore. Riprova.'); }
        }
      },
    );
  };

  const removeImage = async () => {
    try {
      await deleteObject(storageRef(storage, `carousel-images/${elementId}/${itemId}`));
    } catch { /* il file potrebbe non esistere */ }
    onImageChange(undefined);
  };

  if (imageUrl) {
    return (
      <div className="ws-carousel-item-img-preview">
        <img src={imageUrl} alt="" className="ws-carousel-item-img-thumb" />
        <button className="ws-slide-image-remove" onClick={removeImage} type="button">
          <X size={12} /> Rimuovi
        </button>
      </div>
    );
  }

  return (
    <div className="ws-carousel-item-img-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {uploading ? (
        <div className="ws-slide-image-uploading">
          <div className="ws-slide-image-progress-bar">
            <div className="ws-slide-image-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ws-slide-image-progress-pct">{progress}%</span>
        </div>
      ) : (
        <>
          <button
            className="ws-carousel-item-img-btn"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon size={13} /> Aggiungi immagine
          </button>
          {uploadError && <p className="ws-slide-image-error">{uploadError}</p>}
        </>
      )}
    </div>
  );
};

// ---- Carousel editor ----

const CarouselEditor: React.FC<{ element: CarouselElement; onChange: (el: CarouselElement) => void }> = ({ element, onChange }) => {
  const updateItem = (itemId: string, update: Partial<CarouselItem>) =>
    onChange({ ...element, items: element.items.map(it => it.id === itemId ? { ...it, ...update } : it) });

  const moveItem = (i: number, dir: 'up' | 'down') => {
    const items = [...element.items];
    const swap = dir === 'up' ? i - 1 : i + 1;
    [items[i], items[swap]] = [items[swap], items[i]];
    onChange({ ...element, items });
  };

  return (
    <div className="ws-el-editor">
      <label className="ws-label">Titolo carosello</label>
      <input className="ws-field" type="text" value={element.title} placeholder="Es. Scegli il tuo scenario"
        onChange={e => onChange({ ...element, title: e.target.value })} />

      {element.items.length > 0 && <label className="ws-label" style={{ marginTop: 4 }}>Elementi</label>}
      {element.items.map((item, i) => (
        <div key={item.id} className="ws-carousel-item-editor">
          <div className="ws-carousel-item-editor-header">
            <span className="ws-config-cat-num">{i + 1}</span>
            <input className="ws-field" type="text" value={item.title} placeholder="Titolo elemento"
              onChange={e => updateItem(item.id, { title: e.target.value })} />
            <button className="ws-el-move" disabled={i === 0} onClick={() => moveItem(i, 'up')} title="Sposta su"><ChevronUp size={13} /></button>
            <button className="ws-el-move" disabled={i === element.items.length - 1} onClick={() => moveItem(i, 'down')} title="Sposta giù"><ChevronDown size={13} /></button>
            <button className="ws-icon-btn" title="Elimina elemento"
              onClick={() => {
                deleteObject(storageRef(storage, `carousel-images/${element.id}/${item.id}`)).catch(() => {});
                onChange({ ...element, items: element.items.filter(it => it.id !== item.id) });
              }}>
              <X size={14} />
            </button>
          </div>
          <div className="ws-carousel-item-editor-body">
            <CarouselItemImageUploader
              elementId={element.id}
              itemId={item.id}
              imageUrl={item.imageUrl}
              onImageChange={url => updateItem(item.id, { imageUrl: url })}
            />
            <input className="ws-field" type="text" value={item.description || ''} placeholder="Descrizione (opzionale)"
              onChange={e => updateItem(item.id, { description: e.target.value })} />
          </div>
        </div>
      ))}
      <button className="ws-add-cat-btn" style={{ marginTop: element.items.length > 0 ? 8 : 0 }}
        onClick={() => onChange({ ...element, items: [...element.items, { id: uid(), title: '', description: '' }] })}>
        + Aggiungi elemento
      </button>
    </div>
  );
};

// ---- Mode dropdown ----

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

// ---- Element wrapper ----

const typeConfig: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  info:         { label: 'Info / Testo',  color: '#6366f1', Icon: FileText },
  question:     { label: 'Domanda',       color: '#f59e0b', Icon: HelpCircle },
  configurator: { label: 'Configuratore', color: '#009999', Icon: SlidersHorizontal },
  quiz:         { label: 'Quiz',          color: '#e11d48', Icon: Trophy },
  carousel:     { label: 'Carosello',     color: '#7c3aed', Icon: GalleryHorizontal },
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
    </div>
  );
};

// ---- Mobile preview ----

const SlidePreview: React.FC<{ slide: Slide }> = ({ slide }) => (
  <div className="ws-preview-panel">
    <div className="ws-preview-label">Anteprima mobile</div>
    <div className="ws-phone-frame">
      <div className="ws-phone-notch">
        <div className="ws-phone-notch-pill" />
      </div>
      <div className="ws-phone-screen">
        <div className="ws-preview-scaler">
          <div className="ws-slide-progress">
            <div className="ws-slide-progress-fill" style={{ width: '40%' }} />
          </div>
          <div className="ws-slide-inner">
            <div className="ws-slide-header">
              <h1 className="ws-slide-title" style={!slide.title ? { opacity: 0.35, fontStyle: 'italic' } : undefined}>
                {slide.title || 'Titolo slide'}
              </h1>
            </div>
            <div className="ws-slide-content">
              {slide.imageUrl && (
                <div className="ws-slide-image-wrap">
                  <img src={slide.imageUrl} alt="" className="ws-slide-image" />
                </div>
              )}
              {slide.elements.length === 0 ? (
                <div className="ws-preview-empty">Nessun elemento ancora</div>
              ) : (
                slide.elements.map(el => {
                  if (el.type === 'info') return <InfoEl key={el.id} element={el} />;
                  if (el.type === 'question') return <QuestionEl key={el.id} element={el} value={undefined} onChange={() => {}} />;
                  if (el.type === 'configurator') return <ConfiguratorEl key={el.id} element={el} value={undefined} onChange={() => {}} />;
                  if (el.type === 'quiz') return <QuizEl key={el.id} element={el as QuizElement} value={undefined} onChange={() => {}} />;
                  if (el.type === 'carousel') return <CarouselEl key={el.id} element={el as CarouselElement} value={undefined} onChange={() => {}} />;
                  return null;
                })
              )}
            </div>
            <div className="ws-slide-nav">
              <button className="ws-btn ws-btn-primary ws-btn-full">Avanti →</button>
            </div>
          </div>
        </div>
      </div>
      <div className="ws-phone-home">
        <div className="ws-phone-home-bar" />
      </div>
    </div>
  </div>
);

// ---- Slide nav panel ----

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

// ---- Main SlidesTab ----

const SlidesTab: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [editing, setEditing] = useState<Slide | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const isLast = (s: Slide) => sorted[sorted.length - 1]?.id === s.id;

  const persistCurrent = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, ...data } = editing;
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
    try { await deleteObject(storageRef(storage, `slide-images/${id}`)); } catch { /* nessuna immagine */ }
    // Pulizia immagini carosello nella slide eliminata
    const slide = sorted.find(s => s.id === id);
    slide?.elements.forEach(el => {
      if (el.type === 'carousel') {
        el.items.forEach(item => {
          deleteObject(storageRef(storage, `carousel-images/${el.id}/${item.id}`)).catch(() => {});
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
                      onImageChange={url => setEditing(prev => prev ? { ...prev, imageUrl: url } : prev)}
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
                    <button className="ws-add-el-btn ws-add-el-btn--question" onClick={() => addElement('question')}>
                      <span className="ws-add-el-icon"><HelpCircle size={20} /></span>
                      <span className="ws-add-el-name">Domanda</span>
                    </button>
                    <button className="ws-add-el-btn ws-add-el-btn--configurator" onClick={() => addElement('configurator')}>
                      <span className="ws-add-el-icon"><SlidersHorizontal size={20} /></span>
                      <span className="ws-add-el-name">Configuratore</span>
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
                    <button className="ws-add-el-btn ws-add-el-btn--carousel" onClick={() => addElement('carousel')}>
                      <span className="ws-add-el-icon"><GalleryHorizontal size={20} /></span>
                      <span className="ws-add-el-name">Carosello</span>
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
