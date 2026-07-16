export default function OutputCard({ name, status, text, error, chips }) {
  function copyText() {
    navigator.clipboard.writeText(text);
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
          <div className="out-text">{text}</div>
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