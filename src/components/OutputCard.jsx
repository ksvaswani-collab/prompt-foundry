import { useLayoutEffect, useRef } from 'react';

export default function OutputCard({ name, status, text, error, chips, onEdit }) {
  const textareaRef = useRef(null);

  // Auto-grow the textarea to hug its content (no scrollbar, no fixed box,
  // no manual drag-resize) — matches how the old read-only <div> behaved.
  //
  // Re-measures on two triggers:
  // 1. `text`/`status` changing (new content, editing, generation finishing)
  // 2. The element's own width changing (DevTools opening, window resize,
  //    switching the resolution picker's layout) — width changes reflow the
  //    same text into more/fewer lines, so height has to be recalculated
  //    even when the text itself hasn't changed.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    let rafId = null;
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };

    resize();

    const ro = new ResizeObserver(() => {
      // Defer to the next frame so we're not fighting the observer's own
      // reflow (setting height triggers another resize event — this keeps
      // it from looping or throwing "ResizeObserver loop" warnings).
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(resize);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
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