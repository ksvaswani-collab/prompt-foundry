import OutputCard from './OutputCard';

export default function OutputPanel({ status, results, onEditResult, onRegenerate }) {
  return (
    <div className="sheet">
      <div className="crop crop-tl"></div><div className="crop crop-tr"></div>
      <div className="crop crop-bl"></div><div className="crop crop-br"></div>

      {status === 'idle' && (
        <div className="empty-state">
          Add your tokens and sections on the left, then generate.<br />
          Each section gets its own paste-ready prompt.
        </div>
      )}

      {status !== 'idle' && (
        <>
          <div className="stamp">
            {status === 'generating' ? 'IN PROGRESS' : 'READY TO PASTE'}
          </div>
          {results.map((r, i) => (
            <OutputCard
              key={i}
              {...r}
              onEdit={(val) => onEditResult(i, val)}
              onRegenerate={() => onRegenerate(i)}
            />
          ))}
        </>
      )}
    </div>
  );
}