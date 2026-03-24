import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { ResultsElement, Slide, RatingElement, QuizElement } from '../../../types';

const ResultsEditor: React.FC<{ element: ResultsElement; onChange: (el: ResultsElement) => void }> = ({ element, onChange }) => {
  const [slides, setSlides] = useState<Slide[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'slides'), orderBy('order')))
      .then(snap => setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide))));
  }, []);

  const options = slides.flatMap(slide =>
    slide.elements
      .filter(el => el.type === 'rating' || el.type === 'quiz')
      .map(el => ({
        elementId: el.id,
        label: `${slide.title || 'Slide'} — ${
          el.type === 'rating'
            ? (el as RatingElement).title || 'Valutazione'
            : (el as QuizElement).text || 'Quiz'
        }`,
      }))
  );

  const toggle = (elementId: string) => {
    const ids = element.sourceElementIds.includes(elementId)
      ? element.sourceElementIds.filter(id => id !== elementId)
      : [...element.sourceElementIds, elementId];
    onChange({ ...element, sourceElementIds: ids });
  };

  return (
    <div className="ws-el-editor">
      <label className="ws-label">Elementi da mostrare</label>
      <p className="ws-field-hint">Seleziona le valutazioni o quiz di cui mostrare i risultati aggregati. Vengono mostrati nell&apos;ordine in cui sono selezionati.</p>
      {options.length === 0 ? (
        <p className="ws-field-hint">Nessuna valutazione o quiz trovato nelle slide.</p>
      ) : (
        <div className="ws-results-source-list">
          {options.map(o => (
            <label key={o.elementId} className="ws-results-source-option">
              <input
                type="checkbox"
                checked={element.sourceElementIds.includes(o.elementId)}
                onChange={() => toggle(o.elementId)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsEditor;
