export function isValidHex(v) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test((v || '').trim());
}

// Resizes/compresses an uploaded image client-side before it's sent to the
// API (and before it lands in local storage) — keeps requests fast and
// keeps a handful of reference images per section well under local
// storage's size ceiling.
export function resizeImageToBase64(file, maxDim = 900, quality = 0.68) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}