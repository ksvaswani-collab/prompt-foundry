import { Sun, Moon, SunMoon, Sparkles } from 'lucide-react';
import { APPEARANCE_MODES } from '../constants';

const ICONS = {
  light: Sun,
  dark: Moon,
  both: SunMoon,
  auto: Sparkles,
};

export default function AppearanceModePicker({ colorMode, onChange, disabled }) {
  return (
    <div className="mode-grid">
      {APPEARANCE_MODES.map((m) => {
        const Icon = ICONS[m.id];
        return (
          <button
            type="button"
            key={m.id}
            className={`mode-pill${m.id === colorMode ? ' active' : ''}`}
            onClick={() => onChange(m.id)}
            disabled={disabled}
          >
            <span className="mode-pill-label">
              <Icon size={14} strokeWidth={2} />
              {m.label}
            </span>
            {m.hint && <span className="mode-pill-hint">{m.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
