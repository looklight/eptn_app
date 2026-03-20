import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Slide, WorkshopResponse, AnswerValue, ConfigAnswer, CarouselAnswer, RatingAnswer } from '../../types';

function formatAnswer(answer: AnswerValue, slide: Slide): React.ReactNode {
  if (answer === undefined || answer === null) return '—';
  if (typeof answer === 'boolean') return answer ? 'Sì' : 'No';
  if (Array.isArray(answer)) return (answer as string[]).join(', ');
  if (typeof answer === 'object') {
    const config = answer as ConfigAnswer;
    return (
      <div>
        {Object.entries(config).map(([catId, prodId]) => {
          if (!prodId) return null;
          for (const el of slide.elements) {
            if (el.type !== 'configurator') continue;
            const cat = el.categories.find(c => c.id === catId);
            if (!cat) continue;
            const prod = cat.products.find(p => p.id === prodId);
            return <div key={catId}><span style={{ color: 'var(--ws-muted)' }}>{cat.label}:</span> {prod?.name ?? '—'}</div>;
          }
          return null;
        })}
      </div>
    );
  }
  return String(answer);
}

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
    await batch.commit();
    setResetStep(false);
    setResetting(false);
  };

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const complete = responses.filter(r => !r.partial);
  const inProgress = responses.filter(r => r.partial).length;

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
      ) : complete.map(r => (
        <div className="ws-response-card" key={r.id}>
          <div className="ws-response-name">{r.name}</div>
          {sorted.map(slide => {
            const interactive = slide.elements.filter(el => el.type !== 'info');
            const hasAnswers = interactive.some(el => r.answers?.[el.id] !== undefined);
            if (!hasAnswers) return null;
            return (
              <div key={slide.id} className="ws-response-slide-group">
                <div className="ws-response-slide-title">{slide.title}</div>
                {interactive.map(el => {
                  const answer = r.answers?.[el.id];
                  if (answer === undefined) return null;
                  if (el.type === 'carousel') {
                    const itemId = answer as CarouselAnswer;
                    if (!itemId) return null;
                    const item = el.items.find(it => it.id === itemId);
                    return (
                      <div className="ws-response-item" key={el.id}>
                        <span className="ws-response-question">{el.title || 'Carosello'}</span>
                        <span className="ws-response-answer">{item?.title ?? '—'}</span>
                      </div>
                    );
                  }
                  if (el.type === 'rating') {
                    const ra = answer as RatingAnswer;
                    return (
                      <div key={el.id}>
                        {el.categories.map(cat => (
                          <div className="ws-response-item" key={cat.id}>
                            <span className="ws-response-question">{cat.label}</span>
                            <span className="ws-response-answer">{'★'.repeat(ra[cat.id] ?? 0)}{'☆'.repeat(5 - (ra[cat.id] ?? 0))} · {ra[cat.id] ?? 0}/5</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  const label = el.type === 'question' ? el.text : el.type === 'configurator' ? el.title : '';
                  return (
                    <div className="ws-response-item" key={el.id}>
                      <span className="ws-response-question">{label}</span>
                      <span className="ws-response-answer">{formatAnswer(answer, slide)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ResultsTab;
