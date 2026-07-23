import { useRef, useState } from 'react';
import IndustrySelect, { resolvedIndustry } from './components/IndustrySelect';
import PresetManager from './components/PresetManager';
import TokenList from './components/TokenList';
import FontPairPicker from './components/FontPairPicker';
import AppearanceModePicker from './components/AppearanceModePicker';
import ResolutionPicker from './components/ResolutionPicker';
import SectionList from './components/SectionList';
import OutputPanel from './components/OutputPanel';
import { RESOLUTIONS } from './constants';
import { generateSection } from './api';
import { detectTokensUsed } from './tokenMatch';
import { useLocalStorage } from './hooks/useLocalStorage';

// Waits `ms`, but resolves early (without rejecting) if `signal` aborts —
// used for the pause between sections so Stop doesn't have to wait it out.
function sleepAbortable(ms, signal) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

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
  const [presets, setPresets] = useLocalStorage('promptFoundry.presets', []);
  const [activePresetId, setActivePresetId] = useLocalStorage('promptFoundry.activePresetId', '');
  const [selectedRes, setSelectedRes] = useLocalStorage('promptFoundry.selectedRes', 'd1440');
  const [sections, setSections] = useLocalStorage(
    'promptFoundry.sections',
    [{ name: 'Hero', desc: '', images: [] }],
    (list) => (Array.isArray(list) ? list.map((s) => ({ images: [], ...s })) : list)
  );
  const [notes, setNotes] = useLocalStorage('promptFoundry.notes', '');
  const [showAdvanced, setShowAdvanced] = useLocalStorage('promptFoundry.showAdvanced', false);

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
            r.status === 'loading' || r.status === 'queued'
              ? { ...r, status: 'error', error: 'Interrupted by a page reload — click retry.' }
              : r
          )
        : []
  );
  // Purely transient — tied to the current in-flight request, not something
  // that should (or safely can) survive a reload.
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef(null);

  const hasTokens = tokens.some((t) => (t.name && t.name.trim()) || (t.value && t.value.trim()));
  const hasFonts = !!(fontPair.heading && fontPair.body);
  const validationMsgs = [];
  if (!hasTokens) validationMsgs.push('no brand tokens set');
  if (!hasFonts) validationMsgs.push('no font pairing chosen');

  // Runs one section (index `i` in `results`) against the API and writes the
  // outcome back into `results[i]`. `sectionInfo` (name/desc/images) is
  // passed in explicitly rather than re-read from the live `sections` form
  // state, so that regenerating a card later always uses *that card's own*
  // name/desc/images — even if you've since edited the section list —
  // instead of silently drifting to whatever the form currently says.
  async function runSection(i, sectionInfo, controller) {
    const res = RESOLUTIONS.find((r) => r.id === selectedRes);
    const images = sectionInfo.images || [];
    try {
      const text = await generateSection(
        {
          section: { name: sectionInfo.name, desc: sectionInfo.desc },
          tokens,
          fontPair,
          resolution: res,
          industry: resolvedIndustry(industry),
          mode: colorMode,
          notes,
          images,
        },
        controller.signal
      );

      const used = detectTokensUsed(text, tokens);
      const chips = [
        ...used.map((t) => t.name),
        ...(fontPair.heading || fontPair.body ? [`${fontPair.heading || '?'} / ${fontPair.body || '?'}`] : []),
        `${res.device} ${res.w}×${res.h}`,
        ...(images.length ? [`${images.length} ref image${images.length > 1 ? 's' : ''}`] : []),
      ];

      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...sectionInfo, status: 'done', text, chips } : r))
      );
    } catch (e) {
      if (e.name === 'AbortError') {
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...sectionInfo, status: 'cancelled' } : r)));
      } else {
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...sectionInfo, status: 'error', error: e.message } : r))
        );
      }
    }
  }

  async function generateAll() {
    const validSections = sections.filter((s) => s.name.trim());
    if (validSections.length === 0) {
      alert('Add at least one section name first.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setOutputStatus('generating');

    // Keep already-finished results for sections that haven't changed since
    // their last run; only (re)queue sections that are new, edited, or
    // previously failed/cancelled. This is what makes "Generate" additive
    // instead of re-running the whole batch every time it's clicked.
    const nextResults = validSections.map((s, i) => {
      const prev = results[i];
      const unchanged =
        prev &&
        prev.status === 'done' &&
        prev.name === s.name &&
        prev.desc === s.desc &&
        JSON.stringify(prev.images || []) === JSON.stringify(s.images || []);
      return unchanged ? prev : { name: s.name, desc: s.desc, images: s.images, status: 'queued' };
    });
    setResults(nextResults);

    for (let i = 0; i < validSections.length; i++) {
      if (nextResults[i].status !== 'queued') continue; // already done and unchanged — skip

      if (controller.signal.aborted) {
        setResults((prev) =>
          prev.map((r, idx) => (idx === i && r.status === 'queued' ? { ...r, status: 'cancelled' } : r))
        );
        continue;
      }
      setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'loading' } : r)));
      await runSection(i, { name: validSections[i].name, desc: validSections[i].desc, images: validSections[i].images }, controller);
      if (i < validSections.length - 1 && !controller.signal.aborted) {
        await sleepAbortable(1500, controller.signal);
      }
    }

    setOutputStatus('ready');
    setIsGenerating(false);
    abortControllerRef.current = null;
  }

  // Cancels the in-flight request immediately. Sections already finished
  // stay exactly as they are; any still-queued sections are marked
  // "cancelled" (each gets its own retry button) instead of silently
  // vanishing or being left in a permanent "loading" state.
  function stopGeneration() {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setResults((prev) => prev.map((r) => (r.status === 'queued' ? { ...r, status: 'cancelled' } : r)));
  }

  // Re-runs just one card — cancelled, errored, or already-done — without
  // touching any of the others or re-running the whole batch.
  async function regenerateSection(i) {
    if (isGenerating) return;
    const target = results[i];
    if (!target) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setResults((prev) =>
      prev.map((r, idx) => (idx === i ? { name: r.name, desc: r.desc, images: r.images, status: 'loading' } : r))
    );

    await runSection(i, { name: target.name, desc: target.desc, images: target.images }, controller);

    setIsGenerating(false);
    abortControllerRef.current = null;
  }

  function editResultText(i, val) {
    setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, text: val } : r)));
  }
  function loadPreset(id) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setIndustry(preset.industry);
    setTokens(preset.tokens);
    setFontPair(preset.fontPair);
    setColorMode(preset.colorMode);
    setActivePresetId(id);
  }

  function savePresetAsNew(name) {
    const preset = {
      id: crypto.randomUUID(),
      name,
      industry,
      tokens,
      fontPair,
      colorMode,
    };
    setPresets((prev) => [...prev, preset]);
    setActivePresetId(preset.id);
  }

  function updateActivePreset() {
    setPresets((prev) =>
      prev.map((p) => (p.id === activePresetId ? { ...p, industry, tokens, fontPair, colorMode } : p))
    );
  }

  function deletePreset(id) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (activePresetId === id) setActivePresetId('');
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
        <div className="rounded border border-line bg-panel min-[881px]:sticky min-[881px]:top-7 min-[881px]:flex min-[881px]:max-h-[calc(100vh-56px)] min-[881px]:flex-col">
          <div className="panel-scroll p-5 min-[881px]:min-h-0 min-[881px]:flex-1 min-[881px]:overflow-y-auto">
            <div className={`panel-fields${isGenerating ? ' panel-fields-locked' : ''}`}>
              <h2 className="panel-heading">00 — Brand preset</h2>
              <PresetManager
                presets={presets}
                activeId={activePresetId}
                onLoad={loadPreset}
                onSaveNew={savePresetAsNew}
                onUpdate={updateActivePreset}
                onDelete={deletePreset}
                disabled={isGenerating}
              />

              <div className="divider"></div>
              <h2 className="panel-heading">01 — Brand tokens</h2>
              <TokenList tokens={tokens} onChange={setTokens} disabled={isGenerating} />

              <div className="divider"></div>
              <h2 className="panel-heading">Target resolution</h2>
              <ResolutionPicker selectedRes={selectedRes} onChange={setSelectedRes} disabled={isGenerating} />

              <div className="divider"></div>
              <h2 className="panel-heading">02 — Sections to generate</h2>
              <SectionList sections={sections} onChange={setSections} disabled={isGenerating} />

              <div className="divider"></div>
              <h2 className="panel-heading">03 — Audit / reference notes (optional)</h2>
              <textarea
                className="field field-textarea"
                placeholder="e.g. sibling sites use rounded cards + soft shadows; avoid the generic gradient hero we keep seeing; client wants dense, information-forward layout not marketing-fluffy"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isGenerating}
              />

              <div className="divider"></div>
              <button
                type="button"
                className="accordion-toggle"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                disabled={isGenerating}
              >
                <span>Advanced settings</span>
                <span className={`accordion-chevron${showAdvanced ? ' open' : ''}`}>⌄</span>
              </button>
              <div className={`accordion-content${showAdvanced ? ' open' : ''}`}>
                <div className="accordion-content-inner">
                  <h2 className="panel-heading">Industry / context</h2>
                  <IndustrySelect industry={industry} onChange={setIndustry} disabled={isGenerating} />

                  <div className="divider"></div>
                  <h2 className="panel-heading">Font pairing</h2>
                  <FontPairPicker fontPair={fontPair} onChange={setFontPair} disabled={isGenerating} />

                  <div className="divider"></div>
                  <h2 className="panel-heading">Appearance mode</h2>
                  <AppearanceModePicker colorMode={colorMode} onChange={setColorMode} disabled={isGenerating} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-line p-5">
            {validationMsgs.length > 0 && (
              <div className="validation-note">
                Heads up: {validationMsgs.join(' and ')} — output will be generic / token-agnostic.
              </div>
            )}
            <button
              className={`generate-btn${isGenerating ? ' stop-mode' : ''}`}
              onClick={isGenerating ? stopGeneration : generateAll}
            >
              {isGenerating ? (
                <>
                  <span className="spin"></span>Stop generating
                </>
              ) : (
                'Generate prompts →'
              )}
            </button>
          </div>
        </div>

        <OutputPanel
          status={outputStatus}
          results={results}
          onEditResult={editResultText}
          onRegenerate={regenerateSection}
        />
      </div>
    </div>
  );
}
