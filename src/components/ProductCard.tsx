import React from 'react';
import type { Product } from '../types';

type Props = {
  product: Product;
  selected: boolean;
  onSelect: (id: string) => void;
};

const ProductCard: React.FC<Props> = ({ product, selected, onSelect }) => {
  return (
    <div
      role="button"
      aria-pressed={selected}
      className={`category-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(product.id)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(product.id); }}
    >
      <div className="check-icon" aria-hidden={!selected}>✓</div>

      <div className="card-row">
        {/* LEFT: emoji box + mobile price */}
        <div className="emoji-column">
          <div className="category-image" aria-hidden>
            <span className="emoji">{product.icon}</span>
          </div>
          <div className="emoji-price-mobile">€{product.price}</div>
        </div>

        {/* CENTER: textual content (name, description, specs) */}
        <div className="card-body">
          <div className="category-name" title={product.name}>{product.name}</div>
          <div className="category-description">{product.description}</div>
          <div className="category-specs">{product.specs}</div>
        </div>

        {/* RIGHT: price for desktop only (kept as before) */}
        <div className="category-price desktop-only">€{product.price}</div>
      </div>
    </div>
  );
};

export default ProductCard;