import OutputCard from './OutputCard';
import { buildExportMarkdown } from '../utils';
export default function OutputPanel({ status, results, onEditResult, onRegenerate }) {
  function exportAll() {
    const md = buildExportMarkdown(results);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-foundry-export-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="stamp">
              {status === 'generating' ? 'IN PROGRESS' : 'READY TO PASTE'}
            </div>
            {results.some((r) => r.status === 'done') && (
              <button type="button" className="copy-btn" onClick={exportAll}>
                ⭳ export all
              </button>
            )}
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