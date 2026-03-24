import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Slide, WorkshopResponse, RatingAnswer, RatingElement } from '../../types';

const ResultsTab: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [responses, setResponses] = useState<WorkshopResponse[]>([]);
  const [resetStep, setResetStep] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'responses'), snap =>
      setResponses(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopResponse))
          .sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
      )
    );
  }, []);

  const resetAll = async () => {
    setResetting(true);
    const batch = writeBatch(db);
    responses.forEach(r => batch.delete(doc(db, 'responses', r.id)));
    batch.delete(doc(db, 'workshop', 'ratingStats'));
    await batch.commit();
    setResetStep(false);
    setResetting(false);
  };

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const complete = responses.filter(r => !r.partial);
  const inProgress = responses.filter(r => r.partial).length;

  const ratingItems = sorted.flatMap(slide =>
    slide.elements
      .filter(el => el.type === 'rating')
      .map(el => ({ slide, ratingEl: el as RatingElement }))
  );

  return (
    <div>
      <div className="ws-results-header">
        <span className="ws-responses-count">
          {complete.length} {complete.length === 1 ? 'risposta completa' : 'risposte complete'}
          {inProgress > 0 && <span className="ws-responses-partial"> · {inProgress} in corso</span>}
        </span>
        {!resetStep ? (
          <button className="ws-btn ws-btn-danger" onClick={() => setResetStep(true)}>Reset risultati</button>
        ) : (
          <div className="ws-reset-confirm">
            <span>Sei sicuro? Azione irreversibile.</span>
            <button className="ws-btn ws-btn-danger" onClick={resetAll} disabled={resetting}>
              {resetting ? 'Reset...' : 'Sì, reset'}
            </button>
            <button className="ws-btn ws-btn-secondary" onClick={() => setResetStep(false)}>Annulla</button>
          </div>
        )}
      </div>

      {complete.length === 0 ? (
        <p className="ws-empty">Nessuna risposta completa ancora.</p>
      ) : ratingItems.length === 0 ? (
        <p className="ws-empty">Nessun elemento di valutazione nelle slide.</p>
      ) : (
        <div className="ws-results-rating-section">
          {ratingItems.map(({ slide, ratingEl }) => {
            const allScores = ratingEl.categories.flatMap(cat =>
              complete
                .map(r => (r.answers?.[ratingEl.id] as RatingAnswer)?.[cat.id])
                .filter((v): v is number => typeof v === 'number' && v > 0)
            );
            const overallAvg = allScores.length > 0
              ? allScores.reduce((a, b) => a + b, 0) / allScores.length
              : null;
            return (
              <div key={ratingEl.id} className="ws-summary-rating-card">
                <div className="ws-summary-rating-header">
                  <span className="ws-summary-rating-slide">{slide.title}</span>
                  {ratingEl.title && <span className="ws-summary-rating-subtitle">{ratingEl.title}</span>}
                </div>
                {ratingEl.categories.map(cat => {
                  const scores = complete
                    .map(r => (r.answers?.[ratingEl.id] as RatingAnswer)?.[cat.id])
                    .filter((v): v is number => typeof v === 'number' && v > 0);
                  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                  return (
                    <div key={cat.id} className="ws-summary-rating-row">
                      <span className="ws-summary-rating-cat">{cat.label}</span>
                      <span className="ws-summary-rating-group">
                        {avg !== null ? <strong>{avg.toFixed(1)} / 5</strong> : '—'}
                      </span>
                    </div>
                  );
                })}
                {overallAvg !== null && (
                  <div className="ws-summary-rating-footer">
                    Media totale: <strong>{overallAvg.toFixed(1)} / 5</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResultsTab;
