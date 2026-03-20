/** Dimensione massima accettata in input (file originale). */
export const MAX_IMAGE_INPUT_MB = 20;

/**
 * Ridimensiona un'immagine via Canvas e la restituisce come Blob JPEG.
 * Se l'immagine è già più piccola di `maxWidth`, non viene ingrandita.
 * Lancia un errore se il file supera MAX_IMAGE_INPUT_MB.
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  quality = 0.85,
): Promise<Blob> {
  if (file.size > MAX_IMAGE_INPUT_MB * 1024 * 1024) {
    throw new Error(`Il file supera il limite di ${MAX_IMAGE_INPUT_MB} MB.`);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const isPng = file.type === 'image/png';
      if (!isPng) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Conversione immagine fallita.'))),
        isPng ? 'image/png' : 'image/jpeg',
        isPng ? undefined : quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile leggere l\'immagine.'));
    };

    img.src = objectUrl;
  });
}
