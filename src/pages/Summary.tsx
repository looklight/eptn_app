import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, AnswerValue, ConfigAnswer } from '../types';

const Summary: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  const name = sessionStorage.getItem('ws_summary_name') || '';
  const answers: Record<string, AnswerValue> = (() => {
    try { return JSON.parse(sessionStorage.getItem('ws_summary_answers') || '{}'); }
    catch { return {}; }
  })();

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, 'slides'), orderBy('order'));
      const snap = await getDocs(q);
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="ws-page-center"><p style={{ color: 'var(--ws-muted)' }}>Caricamento...</p></div>;

  const sorted = [...slides].sort((a, b) => a.order - b.order);

  return (
    <div className="ws-summary-page">
      <div className="ws-summary-header">
        <div className="ws-thankyou-icon">✓</div>
        <h1 className="ws-title">Il tuo riepilogo</h1>
        <div className="ws-thankyou-bar" />
        <p className="ws-subtitle">Grazie per aver partecipato, <strong>{name}</strong>!</p>
      </div>

      <div className="ws-summary-slides">
        {sorted.map(slide => {
          const interactive = slide.elements.filter(el => el.type !== 'info');
          const hasAnswers = interactive.some(el => answers[el.id] !== undefined);
          if (!hasAnswers) return null;

          return (
            <div key={slide.id} className="ws-summary-slide">
              <h2 className="ws-summary-slide-title">{slide.title}</h2>
              {interactive.map(el => {
                const answer = answers[el.id];
                if (answer === undefined) return null;

                if (el.type === 'question') {
                  const display = typeof answer === 'boolean' ? (answer ? 'Sì' : 'No') : String(answer);
                  return (
                    <div key={el.id} className="ws-response-item">
                      <span className="ws-response-question">{el.text}</span>
                      <span className="ws-response-answer">{display}</span>
                    </div>
                  );
                }

                if (el.type === 'configurator') {
                  const config = answer as ConfigAnswer;
                  const hasSelections = Object.values(config).some(v => v !== null);
                  if (!hasSelections) return null;
                  return (
                    <div key={el.id} className="ws-summary-config">
                      {el.title && <div className="ws-summary-config-title">{el.title}</div>}
                      {el.categories.map(cat => {
                        const prodId = config[cat.id];
                        if (!prodId) return null;
                        const prod = cat.products.find(p => p.id === prodId);
                        if (!prod) return null;
                        return (
                          <div key={cat.id} className="ws-response-item">
                            <span className="ws-response-question">{cat.label}</span>
                            <span className="ws-response-answer">
                              {prod.icon && `${prod.icon} `}{prod.name}{prod.price ? ` — €${prod.price}` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Summary;
