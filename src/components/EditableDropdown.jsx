import { useEffect, useRef, useState } from 'react';

export default function EditableDropdown({ options, value, onChange, onCreateOption, placeholder }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => setInputValue(value || ''), [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmed = inputValue.trim();
  const filtered = trimmed
    ? options.filter((o) => o.toLowerCase().includes(trimmed.toLowerCase()))
    : options;
  const exactMatch = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
  const showAddNew = trimmed.length > 0 && !exactMatch;

  function selectOption(name) {
    setInputValue(name);
    onChange(name);
    setOpen(false);
  }

  async function selectAddNew() {
    const name = trimmed;
    setInputValue(name);
    onChange(name);
    setOpen(false);
    await onCreateOption(name);
  }

  return (
    <div className="editable-dropdown" ref={containerRef}>
      <input
        type="text"
        className="editable-dropdown-input"
        placeholder={placeholder}
        value={inputValue}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const nextValue = e.target.value;
          setInputValue(nextValue);
          onChange(nextValue);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (exactMatch) {
              selectOption(exactMatch);
            } else if (showAddNew) {
              selectAddNew();
            }
          }
        }}
      />
      {open && (filtered.length > 0 || showAddNew) && (
        <div className="editable-dropdown-list">
          {filtered.map((option) => (
            <div key={option} className="editable-dropdown-option" onMouseDown={() => selectOption(option)}>
              {option}
            </div>
          ))}
          {showAddNew && (
            <div className="editable-dropdown-option add-new" onMouseDown={selectAddNew}>
              + Add "{trimmed}" as new product
            </div>
          )}
        </div>
      )}
    </div>
  );
}
