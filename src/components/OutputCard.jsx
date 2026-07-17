import { useLayoutEffect, useRef, useState } from 'react';

export default function OutputCard({ name, status, text, error, chips, onEdit, onRegenerate }) {
  const textareaRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  // Auto-grow the textarea to hug its content (no scrollbar, no fixed box,
  // no manual drag-resize) — matches how the old read-only <div> behaved.
  //
  // Re-measures on three triggers:
  // 1. `text`/`status` changing (new content, editing, generation finishing)
  // 2. The element's own width changing (DevTools opening, window resize,
  //    switching the resolution picker's layout) — width changes reflow the
  //    same text into more/fewer lines, so height has to be recalculated
  //    even when the text itself hasn't changed.
  // 3. Web fonts finishing their (async) load — the very first measurement
  //    can happen before the real fonts arrive, using fallback-font metrics
  //    that produce a shorter height; once the real fonts swap in, the same
  //    text can reflow onto more lines and needs re-measuring.
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
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(resize);
    });
    ro.observe(el);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(resize);
    }

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [text, status]);

  // Clean up the "copied" reset timer if the card unmounts mid-flash
  // (e.g. the section list changes right after copying).
  useLayoutEffect(() => {
    return () => clearTimeout(copyTimerRef.current);
  }, []);

  function copyText() {
    navigator.clipboard.writeText(text || '');
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1200);
    // Re-copying while already showing "copied" just restarts the flash —
    // nothing stops the user from copying again immediately.
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
        <span className="out-card-actions">
          {(status === 'done' || status === 'error' || status === 'cancelled') && (
            <button className="copy-btn regen-btn" onClick={onRegenerate} title="regenerate just this section">
              ↻ {status === 'done' ? 'regenerate' : 'retry'}
            </button>
          )}
          {status === 'done' && (
            <button
              className={`copy-btn${copied ? ' copy-btn-copied' : ''}`}
              onClick={copyText}
            >
              {copied ? '✓ copied' : 'copy'}
            </button>
          )}
        </span>
      </h3>

      {(status === 'loading' || status === 'queued') && (
        <div className="loading">{status === 'queued' ? 'queued' : 'generating'}</div>
      )}
      {status === 'cancelled' && <div className="cancelled-note">Cancelled before this section ran.</div>}
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
