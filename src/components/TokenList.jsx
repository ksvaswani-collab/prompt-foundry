import { isValidHex } from '../utils';

export default function TokenList({ tokens, onChange, disabled }) {
  function updateToken(i, field, value) {
    const next = tokens.map((t, idx) => (idx === i ? { ...t, [field]: value } : t));
    onChange(next);
  }
  function removeToken(i) {
    onChange(tokens.filter((_, idx) => idx !== i));
  }
  function addToken() {
    onChange([...tokens, { name: '', value: '' }]);
  }

  return (
    <div>
      {tokens.map((t, i) => (
        <div className="mb-2 flex gap-2" key={i}>
          <input
            className="field flex-1"
            placeholder="token name (e.g. Primary Navy)"
            value={t.name}
            onChange={(e) => updateToken(i, 'name', e.target.value)}
            disabled={disabled}
          />
          <input
            className="field flex-1"
            placeholder="value (e.g. #1A1A2E)"
            value={t.value}
            onChange={(e) => updateToken(i, 'value', e.target.value)}
            disabled={disabled}
          />
          <input
            type="color"
            className="h-auto w-[34px] flex-none cursor-pointer rounded-[3px] border border-line bg-panel-2 p-0.5"
            value={isValidHex(t.value) ? t.value : '#5ec8d8'}
            onChange={(e) => updateToken(i, 'value', e.target.value)}
            title="Pick a color (only relevant for color tokens)"
            disabled={disabled}
          />
          <button className="icon-btn" onClick={() => removeToken(i)} disabled={disabled}>×</button>
        </div>
      ))}
      <button className="add-link" onClick={addToken} disabled={disabled}>+ add token</button>
    </div>
  );
}
