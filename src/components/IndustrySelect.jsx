import { INDUSTRIES } from '../constants';

export default function IndustrySelect({ industry, onChange }) {
  function handlePresetChange(val) {
    onChange({
      preset: val,
      custom: val === 'Custom…' ? industry.custom : '',
    });
  }

  return (
    <div>
      <select
        className="field field-select"
        value={industry.preset}
        onChange={(e) => handlePresetChange(e.target.value)}
      >
        <option value="" disabled>Choose an industry…</option>
        {INDUSTRIES.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>
      {industry.preset === 'Custom…' && (
        <input
          className="field mt-2"
          placeholder="Describe the industry (e.g. B2B logistics software)"
          value={industry.custom}
          autoFocus
          onChange={(e) => onChange({ ...industry, custom: e.target.value })}
        />
      )}
    </div>
  );
}

// Same resolution logic the old resolvedIndustry() function had.
export function resolvedIndustry(industry) {
  if (industry.preset === 'Custom…') return industry.custom.trim();
  return industry.preset;
}