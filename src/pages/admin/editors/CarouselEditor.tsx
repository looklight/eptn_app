import React from 'react';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '../../../firebase';
import type { CarouselElement, CarouselItem } from '../../../types';
import { useImageUpload } from '../../../utils/useImageUpload';
import { ChevronUp, ChevronDown, X, ImageIcon } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

const CarouselItemImageUploader: React.FC<{
  elementId: string;
  itemId: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  onImageChange: (imageUrl: string | undefined, thumbnailUrl: string | undefined) => void;
}> = ({ elementId, itemId, imageUrl, thumbnailUrl, onImageChange }) => {
  const { uploading, progress, uploadError, inputRef, handleFile } = useImageUpload({
    fullPath: `carousel-images/${elementId}/${itemId}`,
    thumbPath: `carousel-images/${elementId}/${itemId}_thumb`,
    fullWidth: 1200, thumbWidth: 400,
    fullQuality: 0.88, thumbQuality: 0.80,
    onSuccess: onImageChange,
  });

  const removeImage = async () => {
    await Promise.allSettled([
      deleteObject(storageRef(storage, `carousel-images/${elementId}/${itemId}`)),
      deleteObject(storageRef(storage, `carousel-images/${elementId}/${itemId}_thumb`)),
    ]);
    onImageChange(undefined, undefined);
  };

  if (imageUrl) {
    return (
      <div className="ws-carousel-item-img-preview">
        <img src={thumbnailUrl ?? imageUrl} alt="" className="ws-carousel-item-img-thumb" />
        <button className="ws-slide-image-remove" onClick={removeImage} type="button">
          <X size={12} /> Rimuovi
        </button>
      </div>
    );
  }

  return (
    <div className="ws-carousel-item-img-upload">
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {uploading ? (
        <div className="ws-slide-image-uploading">
          <div className="ws-slide-image-progress-bar">
            <div className="ws-slide-image-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ws-slide-image-progress-pct">{progress}%</span>
        </div>
      ) : (
        <>
          <button className="ws-carousel-item-img-btn" type="button" onClick={() => inputRef.current?.click()}>
            <ImageIcon size={13} /> Aggiungi immagine
          </button>
          {uploadError && <p className="ws-slide-image-error">{uploadError}</p>}
        </>
      )}
    </div>
  );
};

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
                deleteObject(storageRef(storage, `carousel-images/${element.id}/${item.id}_thumb`)).catch(() => {});
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
              thumbnailUrl={item.thumbnailUrl}
              onImageChange={(url, thumbUrl) => updateItem(item.id, { imageUrl: url, thumbnailUrl: thumbUrl })}
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

export default CarouselEditor;
