export default function SectionList({ sections, onChange }) {
  function updateSection(i, field, value) {
    const next = sections.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    onChange(next);
  }
  function removeSection(i) {
    onChange(sections.filter((_, idx) => idx !== i));
  }
  function addSection() {
    onChange([...sections, { name: '', desc: '' }]);
  }

  return (
    <div>
      {sections.map((s, i) => (
        <div className="section-block" key={i}>
          <div className="mb-2 flex gap-2">
            <input
              className="field flex-1"
              placeholder="section name (e.g. Pricing card)"
              value={s.name}
              onChange={(e) => updateSection(i, 'name', e.target.value)}
            />
            <button className="icon-btn" onClick={() => removeSection(i)}>×</button>
          </div>
          <textarea
            className="field field-textarea"
            placeholder="what it should contain / do"
            value={s.desc}
            onChange={(e) => updateSection(i, 'desc', e.target.value)}
          />
        </div>
      ))}
      <button className="add-link" onClick={addSection}>+ add section</button>
    </div>
  );
}
