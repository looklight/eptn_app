import React, { useState } from 'react';
import type { RatingElement, RatingAnswer } from '../../types';

type Props = {
  element: RatingElement;
  value: RatingAnswer | undefined;
  onChange: (v: RatingAnswer) => void;
};

const RatingEl: React.FC<Props> = ({ element, value, onChange }) => {
  const current = value ?? {};
  const [hoverState, setHoverState] = useState<{ catId: string; star: number } | null>(null);

  const setRating = (categoryId: string, stars: number) => {
    // Toccare la stessa stella già selezionata la deseleziona
    const prev = current[categoryId] ?? 0;
    onChange({ ...current, [categoryId]: prev === stars ? 0 : stars });
  };

  return (
    <div className="ws-el-rating">
      {element.title && <h3 className="ws-question">{element.title}</h3>}
      <div className="ws-rating-categories">
        {element.categories.map(cat => (
          <div key={cat.id} className="ws-rating-row">
            <span className="ws-rating-cat-label">{cat.label}</span>
            <div
              className="ws-rating-stars"
              onMouseLeave={() => setHoverState(null)}
            >
              {[1, 2, 3, 4, 5].map(star => {
                const filled = hoverState?.catId === cat.id
                  ? hoverState.star >= star
                  : (current[cat.id] ?? 0) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className={`ws-rating-star${filled ? ' active' : ''}`}
                    onClick={() => setRating(cat.id, star)}
                    onMouseEnter={() => setHoverState({ catId: cat.id, star })}
                    aria-label={`${star} ${star === 1 ? 'stella' : 'stelle'}`}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingEl;
