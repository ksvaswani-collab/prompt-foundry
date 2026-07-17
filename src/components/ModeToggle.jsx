export default function ModeToggle({ colorMode, onChange, disabled }) {
  const isDark = colorMode === 'dark';
  return (
    <div className={`mode-switch-row${disabled ? ' opacity-50' : ''}`}>
      <div
        className={`mode-switch${isDark ? ' dark' : ''}${disabled ? ' cursor-not-allowed' : ''}`}
        onClick={() => { if (!disabled) onChange(isDark ? 'light' : 'dark'); }}
        role="switch"
        aria-checked={isDark}
        aria-disabled={disabled}
      >
        <div className="thumb"></div>
      </div>
      <span className="mode-switch-label">{isDark ? 'Dark mode' : 'Light mode'}</span>
    </div>
  );
}
