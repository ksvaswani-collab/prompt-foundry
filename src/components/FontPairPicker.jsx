import { FONT_OPTIONS } from '../constants';

export default function FontPairPicker({ fontPair, onChange, disabled }) {
  function setFont(role, value) {
    onChange({ ...fontPair, [role]: value });
  }

  return (
    <>
      <div className="mb-2 flex gap-2">
        <select
          className="field field-select flex-1"
          value={fontPair.heading}
          onChange={(e) => setFont('heading', e.target.value)}
          disabled={disabled}
        >
          <option value="" disabled>Choose a font…</option>
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          className="field field-select flex-1"
          value={fontPair.body}
          onChange={(e) => setFont('body', e.target.value)}
          disabled={disabled}
        >
          <option value="" disabled>Choose a font…</option>
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="mb-2 flex gap-2">
        <div className="font-preview">
          <span className="preview-label">Heading</span>
          <span
            className="preview-text"
            style={fontPair.heading ? { fontFamily: `'${fontPair.heading}', sans-serif` } : undefined}
          >
            {fontPair.heading || 'Select a heading font'}
          </span>
        </div>
        <div className="font-preview">
          <span className="preview-label">Body</span>
          <span
            className="preview-text"
            style={fontPair.body ? { fontFamily: `'${fontPair.body}', sans-serif` } : undefined}
          >
            {fontPair.body ? 'The quick brown fox jumps over the lazy dog' : 'Select a body font'}
          </span>
        </div>
      </div>
    </>
  );
}