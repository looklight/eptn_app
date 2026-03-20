import { useEffect, useRef, useState } from 'react';
import { ref as storageRef, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { resizeImage, MAX_IMAGE_INPUT_MB } from './imageUtils';

type Config = {
  fullPath: string;
  thumbPath: string;
  fullWidth: number;
  thumbWidth: number;
  fullQuality: number;
  thumbQuality: number;
  onSuccess: (fullUrl: string, thumbUrl: string) => void | Promise<void>;
};

export function useImageUpload(config: Config) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);
  const mountedRef = useRef(true);
  // Ref per leggere sempre la config aggiornata senza stale closure
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      taskRef.current?.cancel();
    };
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const { fullPath, thumbPath, fullWidth, thumbWidth, fullQuality, thumbQuality, onSuccess } = configRef.current;
    setUploading(true);
    setUploadError('');
    setProgress(0);
    try {
      const [fullBlob, thumbBlob] = await Promise.all([
        resizeImage(file, fullWidth, fullQuality),
        resizeImage(file, thumbWidth, thumbQuality),
      ]);
      const meta = { contentType: fullBlob.type };

      const task = uploadBytesResumable(storageRef(storage, fullPath), fullBlob, meta);
      taskRef.current = task;

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          snap => { if (mountedRef.current) setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
          reject,
          resolve,
        );
      });

      const [fullUrl, thumbResult] = await Promise.all([
        getDownloadURL(task.snapshot.ref),
        uploadBytes(storageRef(storage, thumbPath), thumbBlob, meta),
      ]);
      const thumbUrl = await getDownloadURL(thumbResult.ref);

      if (mountedRef.current) {
        await onSuccess(fullUrl, thumbUrl);
        setUploading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setUploading(false);
        setUploadError(err instanceof Error ? err.message : `Errore. Max ${MAX_IMAGE_INPUT_MB} MB.`);
      }
    }
  };

  return { uploading, progress, uploadError, inputRef, handleFile };
}
