export default function ModeToggle({ colorMode, onChange }) {
  const isDark = colorMode === 'dark';
  return (
    <div className="mode-switch-row">
      <div
        className={`mode-switch${isDark ? ' dark' : ''}`}
        onClick={() => onChange(isDark ? 'light' : 'dark')}
      >
        <div className="thumb"></div>
      </div>
      <span className="mode-switch-label">{isDark ? 'Dark mode' : 'Light mode'}</span>
    </div>
  );
}
