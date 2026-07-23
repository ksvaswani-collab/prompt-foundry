import { useState } from 'react';

export default function PresetManager({ presets, activeId, onLoad, onSaveNew, onUpdate, onDelete, disabled }) {
  const [isNaming, setIsNaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const activePreset = presets.find((p) => p.id === activeId);

  function startSaveNew() {
    setNameDraft('');
    setIsNaming(true);
  }

  function confirmSaveNew() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    onSaveNew(trimmed);
    setIsNaming(false);
  }

  function handleDelete() {
    if (!activePreset) return;
    if (window.confirm(`Delete preset "${activePreset.name}"? This can't be undone.`)) {
      onDelete(activePreset.id);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          className="field field-select flex-1"
          value={activeId || ''}
          onChange={(e) => e.target.value && onLoad(e.target.value)}
          disabled={disabled || presets.length === 0}
        >
          <option value="" disabled>
            {presets.length === 0 ? 'No saved presets yet' : 'Load a saved preset…'}
          </option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {activePreset && (
          <button
            type="button"
            className="icon-btn"
            onClick={handleDelete}
            disabled={disabled}
            title={`Delete "${activePreset.name}"`}
          >
            ×
          </button>
        )}
      </div>

      {!isNaming ? (
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" className="add-link" onClick={startSaveNew} disabled={disabled}>
            + save current as new preset
          </button>
          {activePreset && (
            <button type="button" className="add-link" onClick={onUpdate} disabled={disabled}>
              ↺ update "{activePreset.name}"
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            className="field flex-1"
            placeholder="Preset name (e.g. MARA)"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmSaveNew();
              if (e.key === 'Escape') setIsNaming(false);
            }}
          />
          <button type="button" className="icon-btn" onClick={confirmSaveNew} title="Save">✓</button>
          <button type="button" className="icon-btn" onClick={() => setIsNaming(false)} title="Cancel">×</button>
        </div>
      )}
    </div>
  );
}