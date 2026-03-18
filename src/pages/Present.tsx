import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, WorkshopResponse, ConfigAnswer } from '../types';

const Present: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [responses, setResponses] = useState<WorkshopResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSlides = async () => {
      const q = query(collection(db, 'slides'), orderBy('order'));
      const snap = await getDocs(q);
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)));
      setLoading(false);
    };
    loadSlides();
    return onSnapshot(collection(db, 'responses'), snap =>
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopResponse)))
    );
  }, []);

  if (loading) return (
    <div className="ws-present-loading">Caricamento...</div>
  );

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const complete = responses.filter(r => !r.partial).length;
  const inProgress = responses.filter(r => r.partial).length;

  return (
    <div className="ws-present">
      <div className="ws-present-topbar">
        <span className="ws-present-count">
          {complete} {complete === 1 ? 'risposta completa' : 'risposte complete'}
          {inProgress > 0 && <span style={{ opacity: 0.6 }}> · {inProgress} in corso</span>}
        </span>
        <span className="ws-present-live">● Live</span>
      </div>

      <div className="ws-present-body">
        {sorted.map(slide => {
          const interactive = slide.elements.filter(el => el.type !== 'info');
          if (interactive.length === 0) return null;
          return (
            <div key={slide.id} className="ws-present-section">
              <h2 className="ws-present-section-title">{slide.title}</h2>
              <div className="ws-present-elements">
                {interactive.map(el => {
                  const answered = responses.filter(r => r.answers?.[el.id] !== undefined);
                  const count = answered.length;

                  if (count === 0) return (
                    <div key={el.id} className="ws-present-el">
                      <div className="ws-present-el-label">
                        {el.type === 'question' ? el.text : el.title}
                      </div>
                      <div className="ws-present-no-data">Nessuna risposta ancora</div>
                    </div>
                  );

                  /* Multiple choice */
                  if (el.type === 'question' && el.questionType === 'multiple_choice') {
                    const counts: Record<string, number> = {};
                    (el.options || []).forEach(o => { counts[o] = 0; });
                    answered.forEach(r => {
                      const v = r.answers[el.id] as string;
                      if (v in counts) counts[v]++;
                    });
                    const max = Math.max(...Object.values(counts), 1);
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{el.text}</div>
                        <div className="ws-present-el-meta">{count} risposte</div>
                        <div className="ws-present-bars">
                          {Object.entries(counts).map(([opt, c]) => (
                            <div key={opt} className="ws-present-bar-row">
                              <span className="ws-present-bar-label">{opt}</span>
                              <div className="ws-present-bar-track">
                                <div className="ws-present-bar-fill" style={{ width: `${(c / max) * 100}%` }} />
                              </div>
                              <span className="ws-present-bar-val">
                                {c} <span className="ws-present-bar-pct">({Math.round((c / count) * 100)}%)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  /* Scale */
                  if (el.type === 'question' && el.questionType === 'scale') {
                    const min = el.scaleMin ?? 1;
                    const max = el.scaleMax ?? 5;
                    const counts: Record<number, number> = {};
                    for (let i = min; i <= max; i++) counts[i] = 0;
                    answered.forEach(r => {
                      const v = r.answers[el.id] as number;
                      if (typeof v === 'number' && v in counts) counts[v]++;
                    });
                    const avg = answered.reduce((s, r) => s + (r.answers[el.id] as number || 0), 0) / count;
                    const maxCount = Math.max(...Object.values(counts), 1);
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{el.text}</div>
                        <div className="ws-present-el-meta">
                          {count} risposte · media <strong>{avg.toFixed(1)}</strong>
                        </div>
                        <div className="ws-present-scale-bars">
                          {Object.entries(counts).map(([v, c]) => (
                            <div key={v} className="ws-present-scale-col">
                              <div className="ws-present-scale-bar-wrap">
                                <div className="ws-present-scale-bar-fill"
                                  style={{ height: `${(c / maxCount) * 100}%` }} />
                              </div>
                              <div className="ws-present-scale-num">{v}</div>
                              <div className="ws-present-scale-count">{c}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  /* Yes / No */
                  if (el.type === 'question' && el.questionType === 'yes_no') {
                    const yes = answered.filter(r => r.answers[el.id] === true).length;
                    const no = answered.filter(r => r.answers[el.id] === false).length;
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{el.text}</div>
                        <div className="ws-present-el-meta">{count} risposte</div>
                        <div className="ws-present-yesno">
                          <div className="ws-present-yesno-yes" style={{ flex: yes || 0.01 }}>
                            <strong>Sì</strong> {yes} ({Math.round((yes / count) * 100)}%)
                          </div>
                          <div className="ws-present-yesno-no" style={{ flex: no || 0.01 }}>
                            <strong>No</strong> {no} ({Math.round((no / count) * 100)}%)
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* Text */
                  if (el.type === 'question' && el.questionType === 'text') {
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{el.text}</div>
                        <div className="ws-present-text-count">
                          {count} {count === 1 ? 'risposta ricevuta' : 'risposte ricevute'}
                        </div>
                      </div>
                    );
                  }

                  /* Configurator */
                  if (el.type === 'configurator') {
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{el.title || 'Configuratore'}</div>
                        <div className="ws-present-el-meta">{count} risposte</div>
                        {el.categories.map(cat => {
                          const counts: Record<string, number> = {};
                          cat.products.forEach(p => { counts[p.id] = 0; });
                          answered.forEach(r => {
                            const cfg = r.answers[el.id] as ConfigAnswer;
                            const pid = cfg?.[cat.id];
                            if (pid && pid in counts) counts[pid]++;
                          });
                          const catTotal = Object.values(counts).reduce((a, b) => a + b, 0);
                          const maxCount = Math.max(...Object.values(counts), 1);
                          return (
                            <div key={cat.id} className="ws-present-config-cat">
                              <div className="ws-present-config-cat-label">{cat.label}</div>
                              <div className="ws-present-bars">
                                {cat.products.map(prod => {
                                  const c = counts[prod.id] || 0;
                                  return (
                                    <div key={prod.id} className="ws-present-bar-row">
                                      <span className="ws-present-bar-label">
                                        {prod.icon ? `${prod.icon} ` : ''}{prod.name}
                                      </span>
                                      <div className="ws-present-bar-track">
                                        <div className="ws-present-bar-fill"
                                          style={{ width: catTotal > 0 ? `${(c / maxCount) * 100}%` : '0%' }} />
                                      </div>
                                      <span className="ws-present-bar-val">
                                        {c}
                                        {catTotal > 0 && (
                                          <span className="ws-present-bar-pct"> ({Math.round((c / catTotal) * 100)}%)</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          );
        })}

        {sorted.every(s => s.elements.filter(e => e.type !== 'info').length === 0) && (
          <div className="ws-present-empty">Nessun elemento interattivo nelle slide.</div>
        )}
      </div>
    </div>
  );
};

export default Present;
