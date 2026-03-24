import React from 'react';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import type { Slide } from '../../types';
import { useImageUpload } from '../../utils/useImageUpload';
import { X, ImageIcon } from 'lucide-react';

const SlideImageUploader: React.FC<{
  slide: Slide;
  onImageChange: (imageUrl: string | undefined, thumbnailUrl: string | undefined) => void;
}> = ({ slide, onImageChange }) => {
  const { uploading, progress, uploadError, inputRef, handleFile } = useImageUpload({
    fullPath: `slide-images/${slide.id}`,
    thumbPath: `slide-images/${slide.id}_thumb`,
    fullWidth: 1920, thumbWidth: 600,
    fullQuality: 0.88, thumbQuality: 0.82,
    async onSuccess(fullUrl, thumbUrl) {
      await updateDoc(doc(db, 'slides', slide.id), { imageUrl: fullUrl, thumbnailUrl: thumbUrl });
      onImageChange(fullUrl, thumbUrl);
    },
  });

  const removeImage = async () => {
    await Promise.allSettled([
      deleteObject(storageRef(storage, `slide-images/${slide.id}`)),
      deleteObject(storageRef(storage, `slide-images/${slide.id}_thumb`)),
    ]);
    await updateDoc(doc(db, 'slides', slide.id), { imageUrl: deleteField(), thumbnailUrl: deleteField() });
    onImageChange(undefined, undefined);
  };

  if (slide.imageUrl) {
    return (
      <div className="ws-slide-image-preview">
        <img src={slide.thumbnailUrl ?? slide.imageUrl} alt="" className="ws-slide-image-thumb" />
        <button className="ws-slide-image-remove" onClick={removeImage} type="button">
          <X size={12} /> Rimuovi immagine
        </button>
      </div>
    );
  }

  return (
    <div className="ws-slide-image-upload">
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
          <button className="ws-slide-image-btn" type="button" onClick={() => inputRef.current?.click()}>
            <ImageIcon size={15} /> Aggiungi immagine di copertina
          </button>
          {uploadError && <p className="ws-slide-image-error">{uploadError}</p>}
        </>
      )}
    </div>
  );
};

export default SlideImageUploader;
