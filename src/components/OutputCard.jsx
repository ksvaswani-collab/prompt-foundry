import { useLayoutEffect, useRef } from 'react';

export default function OutputCard({ name, status, text, error, chips, onEdit }) {
  const textareaRef = useRef(null);

  // Auto-grow the textarea to hug its content (no scrollbar, no fixed box,
  // no manual drag-resize) — matches how the old read-only <div> behaved.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text, status]);

  function copyText() {
    navigator.clipboard.writeText(text || '');
  }

  function handleChange(e) {
    onEdit(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div className="out-card">
      <h3>
        {name}
        {status === 'done' && (
          <button className="copy-btn" onClick={copyText}>copy</button>
        )}
      </h3>
      {status === 'loading' && <div className="loading">generating</div>}
      {status === 'error' && <div className="err">{error}</div>}
      {status === 'done' && (
        <>
          <textarea
            ref={textareaRef}
            className="out-text-edit"
            value={text}
            onChange={handleChange}
            spellCheck={false}
          />
          <div className="tokens-used">
            {chips.map((c, i) => (
              <span className="chip" key={i}>{c}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
