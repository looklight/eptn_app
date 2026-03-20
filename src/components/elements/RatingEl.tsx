import React from 'react';
import type { RatingElement, RatingAnswer } from '../../types';

type Props = {
  element: RatingElement;
  value: RatingAnswer | undefined;
  onChange: (v: RatingAnswer) => void;
};

const RatingEl: React.FC<Props> = ({ element, value, onChange }) => {
  const current = value ?? {};

  const setRating = (categoryId: string, stars: number) => {
    onChange({ ...current, [categoryId]: stars });
  };

  return (
    <div className="ws-el-rating">
      {element.title && <h3 className="ws-question">{element.title}</h3>}
      <div className="ws-rating-categories">
        {element.categories.map(cat => (
          <div key={cat.id} className="ws-rating-row">
            <span className="ws-rating-cat-label">{cat.label}</span>
            <div className="ws-rating-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`ws-rating-star${(current[cat.id] ?? 0) >= star ? ' active' : ''}`}
                  onClick={() => setRating(cat.id, star)}
                  aria-label={`${star} ${star === 1 ? 'stella' : 'stelle'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingEl;
