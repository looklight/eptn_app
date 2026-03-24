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
        slideId: slide.id,
        elementId: el.id,
        label: `${slide.title || 'Slide'} — ${
          el.type === 'rating'
            ? (el as RatingElement).title || 'Valutazione'
            : (el as QuizElement).text || 'Quiz'
        } (${el.type})`,
      }))
  );

  return (
    <div className="ws-el-editor">
      <label className="ws-label">Elemento sorgente</label>
      <p className="ws-field-hint">Scegli il rating o quiz di cui mostrare i risultati aggregati.</p>
      <select
        className="ws-field"
        value={element.sourceElementId}
        onChange={e => {
          const opt = options.find(o => o.elementId === e.target.value);
          if (opt) onChange({ ...element, sourceElementId: opt.elementId, sourceSlideId: opt.slideId });
        }}
      >
        <option value="">Seleziona rating o quiz...</option>
        {options.map(o => (
          <option key={o.elementId} value={o.elementId}>{o.label}</option>
        ))}
      </select>
    </div>
  );
};

export default ResultsEditor;
