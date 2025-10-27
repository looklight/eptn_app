import React from 'react';
import type { Product } from '../types';
import ProductCard from './ProductCard';

type Props = {
  categoryKey: string;
  products: Product[];
  selectedId?: string | null;
  onSelect: (categoryKey: string, id: string) => void;
};

export const CategoryGrid: React.FC<Props> = ({ categoryKey, products, selectedId, onSelect }) => {
  return (
    <div id={categoryKey} className="categories-grid">
      {products.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          selected={selectedId === p.id}
          onSelect={(id) => onSelect(categoryKey, id)}
        />
      ))}
    </div>
  );
};

export default CategoryGrid;
