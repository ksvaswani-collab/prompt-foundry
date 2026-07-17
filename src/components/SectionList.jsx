import { ImagePlus, X } from 'lucide-react';
import { MAX_IMAGES_PER_SECTION } from '../constants';
import { resizeImageToBase64 } from '../utils';

export default function SectionList({ sections, onChange, disabled }) {
  function updateSection(i, field, value) {
    const next = sections.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    onChange(next);
  }
  function removeSection(i) {
    onChange(sections.filter((_, idx) => idx !== i));
  }
  function addSection() {
    onChange([...sections, { name: '', desc: '', images: [] }]);
  }

  async function handleImageFiles(i, fileList) {
    const room = MAX_IMAGES_PER_SECTION - (sections[i].images || []).length;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/')).slice(0, room);
    const resized = [];
    for (const file of files) {
      try {
        resized.push(await resizeImageToBase64(file));
      } catch (e) {
        console.warn('Image processing failed', e);
      }
    }
    if (resized.length) {
      updateSection(i, 'images', [...(sections[i].images || []), ...resized]);
    }
  }
  function removeImage(i, imgIndex) {
    updateSection(i, 'images', sections[i].images.filter((_, idx) => idx !== imgIndex));
  }

  return (
    <div>
      {sections.map((s, i) => {
        const images = s.images || [];
        return (
          <div className="section-block" key={i}>
            <div className="mb-2 flex gap-2">
              <input
                className="field flex-1"
                placeholder="section name (e.g. Pricing card)"
                value={s.name}
                onChange={(e) => updateSection(i, 'name', e.target.value)}
                disabled={disabled}
              />
              <button className="icon-btn" onClick={() => removeSection(i)} disabled={disabled}>×</button>
            </div>
            <textarea
              className="field field-textarea"
              placeholder="what it should contain / do"
              value={s.desc}
              onChange={(e) => updateSection(i, 'desc', e.target.value)}
              disabled={disabled}
            />
            <div className="img-row">
              {images.map((img, ii) => (
                <div className="thumb" key={ii}>
                  <img src={`data:${img.mimeType};base64,${img.data}`} alt="reference" />
                  <button
                    className="thumb-remove"
                    onClick={() => removeImage(i, ii)}
                    title="remove"
                    disabled={disabled}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES_PER_SECTION && (
                <label className={`thumb-add${disabled ? ' thumb-add-disabled' : ''}`} title="add reference screenshot(s)">
                  <ImagePlus size={16} strokeWidth={1.75} />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => { handleImageFiles(i, e.target.files); e.target.value = ''; }}
                    disabled={disabled}
                  />
                </label>
              )}
            </div>
            <div className="img-hint">
              up to {MAX_IMAGES_PER_SECTION} reference screenshots — used for layout/style only, never described literally
            </div>
          </div>
        );
      })}
      <button className="add-link" onClick={addSection} disabled={disabled}>+ add section</button>
    </div>
  );
}
