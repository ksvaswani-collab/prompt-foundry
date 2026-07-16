import { RESOLUTIONS } from '../constants';

export default function ResolutionPicker({ selectedRes, onChange }) {
  return (
    <div className="res-grid">
      {RESOLUTIONS.map((r) => (
        <button
          type="button"
          key={r.id}
          className={`res-pill${r.id === selectedRes ? ' active' : ''}`}
          onClick={() => onChange(r.id)}
        >
          <span className="device">{r.device}</span>{r.w} × {r.h}
        </button>
      ))}
    </div>
  );
}