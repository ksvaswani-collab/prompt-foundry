import { useState } from 'react';
import IndustrySelect, { resolvedIndustry } from './components/IndustrySelect';
import TokenList from './components/TokenList';
import FontPairPicker from './components/FontPairPicker';
import ModeToggle from './components/ModeToggle';
import ResolutionPicker from './components/ResolutionPicker';
import SectionList from './components/SectionList';
import OutputPanel from './components/OutputPanel';
import { RESOLUTIONS } from './constants';
import { generateSection } from './api';
import { detectTokensUsed } from './tokenMatch';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function App() {
  // Every field below is persisted to the browser's local storage (per field,
  // debounced) and restored on reload, so an accidental refresh doesn't wipe
  // out tokens/sections/notes you've already set up.
  const [industry, setIndustry] = useLocalStorage('promptFoundry.industry', { preset: '', custom: '' });
  const [tokens, setTokens] = useLocalStorage('promptFoundry.tokens', [
    { name: 'Primary color', value: '' },
    { name: 'Font pairing', value: '' },
  ]);
  const [fontPair, setFontPair] = useLocalStorage('promptFoundry.fontPair', { heading: '', body: '' });
  const [colorMode, setColorMode] = useLocalStorage('promptFoundry.colorMode', 'light');
  const [selectedRes, setSelectedRes] = useLocalStorage('promptFoundry.selectedRes', 'd1440');
  const [sections, setSections] = useLocalStorage('promptFoundry.sections', [{ name: 'Hero', desc: '' }]);
  const [notes, setNotes] = useLocalStorage('promptFoundry.notes', '');

  // outputStatus/results are persisted too, so previously generated prompts
  // (and any edits you made to them) survive a reload. "generating"/"loading"
  // can't actually resume after a reload — the in-flight request is gone —
  // so we sanitize those back to a safe, non-stuck state right when we load.
  const [outputStatus, setOutputStatus] = useLocalStorage(
    'promptFoundry.outputStatus',
    'idle',
    (v) => (v === 'generating' ? 'ready' : v)
  );
  const [results, setResults] = useLocalStorage(
    'promptFoundry.results',
    [],
    (list) =>
      Array.isArray(list)
        ? list.map((r) =>
            r.status === 'loading'
              ? { ...r, status: 'error', error: 'Interrupted by a page reload — click Generate again.' }
              : r
          )
        : []
  );
  // Purely transient — tied to the current in-flight request, not something
  // that should (or safely can) survive a reload.
  const [isGenerating, setIsGenerating] = useState(false);

  const hasTokens = tokens.some((t) => (t.name && t.name.trim()) || (t.value && t.value.trim()));
  const hasFonts = !!(fontPair.heading && fontPair.body);
  const validationMsgs = [];
  if (!hasTokens) validationMsgs.push('no brand tokens set');
  if (!hasFonts) validationMsgs.push('no font pairing chosen');

  async function generateAll() {
    const validSections = sections.filter((s) => s.name.trim());
    if (validSections.length === 0) {
      alert('Add at least one section name first.');
      return;
    }

    setIsGenerating(true);
    setOutputStatus('generating');
    setResults(validSections.map((s) => ({ name: s.name, status: 'loading' })));

    const res = RESOLUTIONS.find((r) => r.id === selectedRes);

    for (let i = 0; i < validSections.length; i++) {
      try {
        const text = await generateSection({
          section: validSections[i],
          tokens,
          fontPair,
          resolution: res,
          industry: resolvedIndustry(industry),
          mode: colorMode,
          notes,
        });

        const used = detectTokensUsed(text, tokens);
        const chips = [
          ...used.map((t) => t.name),
          ...(fontPair.heading || fontPair.body ? [`${fontPair.heading || '?'} / ${fontPair.body || '?'}`] : []),
          `${res.device} ${res.w}×${res.h}`,
        ];

        setResults((prev) => prev.map((r, idx) => (idx === i ? { name: validSections[i].name, status: 'done', text, chips } : r)));
      } catch (e) {
        setResults((prev) => prev.map((r, idx) => (idx === i ? { name: validSections[i].name, status: 'error', error: e.message } : r)));
      }

      if (i < validSections.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setOutputStatus('ready');
    setIsGenerating(false);
  }

  function editResultText(i, val) {
    setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, text: val } : r)));
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="mb-[22px] flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="m-0 font-heading text-[28px] font-bold tracking-[-0.01em]">
            Prompt<span className="text-cyan">Foundry</span>
          </h1>
          <div className="font-mono text-[13px] text-muted">
            // section-by-section Figma Canvas AI prompts, tied to your tokens
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_1.15fr] gap-5 max-[880px]:grid-cols-1">
        <div className="h-fit rounded border border-line bg-panel p-5">
          <h2 className="panel-heading">00 — Industry / context</h2>
          <IndustrySelect industry={industry} onChange={setIndustry} />

          <div className="divider"></div>
          <h2 className="panel-heading">01 — Brand tokens</h2>
          <TokenList tokens={tokens} onChange={setTokens} />

          <div className="divider"></div>
          <h2 className="panel-heading">Font pairing</h2>
          <FontPairPicker fontPair={fontPair} onChange={setFontPair} />

          <div className="divider"></div>
          <h2 className="panel-heading">Appearance mode</h2>
          <ModeToggle colorMode={colorMode} onChange={setColorMode} />

          <div className="divider"></div>
          <h2 className="panel-heading">Target resolution</h2>
          <ResolutionPicker selectedRes={selectedRes} onChange={setSelectedRes} />

          <div className="divider"></div>
          <h2 className="panel-heading">02 — Sections to generate</h2>
          <SectionList sections={sections} onChange={setSections} />

          <div className="divider"></div>
          <h2 className="panel-heading">03 — Audit / reference notes (optional)</h2>
          <textarea
            className="field field-textarea"
            placeholder="e.g. sibling sites use rounded cards + soft shadows; avoid the generic gradient hero we keep seeing; client wants dense, information-forward layout not marketing-fluffy"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {validationMsgs.length > 0 && (
            <div className="validation-note">
              Heads up: {validationMsgs.join(' and ')} — output will be generic / token-agnostic.
            </div>
          )}
          <button className="generate-btn" disabled={isGenerating} onClick={generateAll}>
            {isGenerating ? 'Generating…' : 'Generate prompts →'}
          </button>
        </div>

        <OutputPanel status={outputStatus} results={results} onEditResult={editResultText} />
      </div>
    </div>
  );
}
