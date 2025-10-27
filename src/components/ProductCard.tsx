import React from 'react';
import type { Product } from '../types';
import './index.css';

type Props = {
  product: Product;
  selected: boolean;
  onSelect: (id: string) => void;
};

export const ProductCard: React.FC<Props> = ({ product, selected, onSelect }) => {
  return (
    <div
      role="button"
      aria-pressed={selected}
      className={"category-card" + (selected ? ' selected' : '')}
      onClick={() => onSelect(product.id)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(product.id); }}
    >
      <div className="check-icon" aria-hidden={!selected}>✓</div>
      <div className="card-content">
        <div className="category-image">{product.icon}</div>
        <div className="card-text">
          <div className="category-name">{product.name}</div>
          <div className="category-description">{product.description}</div>
          <div className="category-specs">{product.specs}</div>
        </div>
        <div className="category-price">€{product.price}</div>
      </div>
    </div>
  );
};

export default ProductCard;