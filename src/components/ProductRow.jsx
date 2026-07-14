import { formatCurrency } from '../config.js';
import EditableDropdown from './EditableDropdown.jsx';

export default function ProductRow({ row, productOptions, onChange, onRemove, onCreateProduct, canRemove }) {
  const lineTotal = (Number(row.value) || 0) * (Number(row.price) || 0);

  // When Enter is pressed, move focus to the next input/button in the row
  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rowEl = e.target.closest('.bill-row');
      if (!rowEl) return;
      const focusable = rowEl.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
      const idx = Array.from(focusable).indexOf(e.target);
      if (idx !== -1 && idx < focusable.length - 1) {
        focusable[idx + 1].focus();
      }
    }
  };

  return (
    <div className="bill-row">
      <div className="bill-row-line">
        <div className="field-inline">
          <label>Product</label>
          <EditableDropdown
            options={productOptions}
            value={row.productName}
            onChange={(name) => onChange(row.id, { productName: name })}
            onCreateOption={onCreateProduct}
            placeholder="Type to search or add…"
            onKeyDown={handleEnter}
          />
        </div>

        <div className="field-inline">
          <label>Unit</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name={`mode-${row.id}`}
                checked={row.mode === 'GRAM'}
                onChange={() => onChange(row.id, { mode: 'GRAM' })}
              />
              Gram
            </label>
            <label>
              <input
                type="radio"
                name={`mode-${row.id}`}
                checked={row.mode === 'QUANTITY'}
                onChange={() => onChange(row.id, { mode: 'QUANTITY' })}
              />
              Quantity
            </label>
          </div>
        </div>

        <div className="field-inline">
          <label>{row.mode === 'GRAM' ? 'Grams' : 'Qty'}</label>
          <input
            type="number"
            min="0"
            step="any"
            value={row.value}
            onChange={(e) => onChange(row.id, { value: e.target.value })}
            onKeyDown={handleEnter}
          />
        </div>

        <div className="field-inline">
          <label>{row.mode === 'GRAM' ? 'Price / gram' : 'Price / unit'}</label>
          <input
            type="number"
            min="0"
            step="any"
            value={row.price}
            onChange={(e) => onChange(row.id, { price: e.target.value })}
            onKeyDown={handleEnter}
          />
        </div>
      </div>

      <div className="bill-row-line">
        <div className="field-inline">
          <label>Line Total</label>
          <input type="text" readOnly value={formatCurrency(lineTotal)} tabIndex={-1} />
        </div>

        <div className="field-inline">
          <label>Notes</label>
          <input
            type="text"
            placeholder="Optional notes…"
            value={row.notes || ''}
            onChange={(e) => onChange(row.id, { notes: e.target.value })}
            onKeyDown={handleEnter}
          />
        </div>

        <button
          className="row-remove-btn"
          onClick={() => onRemove(row.id)}
          disabled={!canRemove}
          title="Remove row"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
