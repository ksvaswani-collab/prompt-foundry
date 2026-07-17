import { APPEARANCE_MODES } from '../constants';

export default function AppearanceModePicker({ colorMode, onChange, disabled }) {
  return (
    <div className="mode-grid">
      {APPEARANCE_MODES.map((m) => (
        <button
          type="button"
          key={m.id}
          className={`mode-pill${m.id === colorMode ? ' active' : ''}`}
          onClick={() => onChange(m.id)}
          disabled={disabled}
        >
          <span className="mode-pill-label">{m.label}</span>
          {m.hint && <span className="mode-pill-hint">{m.hint}</span>}
        </button>
      ))}
    </div>
  );
}
