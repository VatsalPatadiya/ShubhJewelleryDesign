import { formatCurrency } from '../config.js';
import EditableDropdown from './EditableDropdown.jsx';

export default function ProductRow({ row, productOptions, onChange, onRemove, onCreateProduct, canRemove }) {
  const lineTotal = (Number(row.value) || 0) * (Number(row.price) || 0);

  return (
    <div className="bill-row">
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Product</label>
        <EditableDropdown
          options={productOptions}
          value={row.productName}
          onChange={(name) => onChange(row.id, { productName: name })}
          onCreateOption={onCreateProduct}
          placeholder="Type to search or add…"
        />
      </div>

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

      <div className="field" style={{ marginBottom: 0 }}>
        <label>{row.mode === 'GRAM' ? 'Grams' : 'Qty'}</label>
        <input
          type="number"
          min="0"
          step="any"
          value={row.value}
          onChange={(e) => onChange(row.id, { value: e.target.value })}
        />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>{row.mode === 'GRAM' ? 'Price / gram' : 'Price / unit'}</label>
        <input
          type="number"
          min="0"
          step="any"
          value={row.price}
          onChange={(e) => onChange(row.id, { price: e.target.value })}
        />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Line Total</label>
        <input type="text" readOnly value={formatCurrency(lineTotal)} tabIndex={-1} />
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
  );
}
