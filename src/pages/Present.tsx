import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, WorkshopResponse, ConfigAnswer, QuizAnswer } from '../types';
import { getSlideMode } from '../types';

const Present: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [responses, setResponses] = useState<WorkshopResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  useEffect(() => {
    const loadSlides = async () => {
      const q = query(collection(db, 'slides'), orderBy('order'));
      const snap = await getDocs(q);
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)));
      setLoading(false);
    };
    loadSlides();
    const unsubResponses = onSnapshot(collection(db, 'responses'), snap =>
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopResponse)))
    );
    const unsubConfig = onSnapshot(doc(db, 'workshop', 'config'), snap => {
      const data = snap.data();
      if (data?.currentSlide !== undefined) {
        setCurrentSlide(data.currentSlide as number);
      }
    });
    return () => { unsubResponses(); unsubConfig(); };
  }, []);

  const setAdminSlide = (idx: number) => {
    setDoc(doc(db, 'workshop', 'config'), { currentSlide: idx }, { merge: true }).catch(console.error);
  };

  const sorted = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const hasModerated = useMemo(() => sorted.some(s => getSlideMode(s) === 'moderated'), [sorted]);

  if (loading) return (
    <div className="ws-present-loading">Caricamento...</div>
  );

  const complete = responses.filter(r => !r.partial).length;
  const inProgress = responses.filter(r => r.partial).length;
  const currentSlideTitle = sorted[currentSlide]?.title ?? '';

  return (
    <div className="ws-present">
      <div className="ws-present-topbar">
        <span className="ws-present-count">
          {complete} {complete === 1 ? 'risposta completa' : 'risposte complete'}
          {inProgress > 0 && <span style={{ opacity: 0.6 }}> · {inProgress} in corso</span>}
        </span>
        {hasModerated && (
          <div className="ws-present-nav">
            <button
              className="ws-present-nav-btn"
              disabled={currentSlide <= 0}
              onClick={() => setAdminSlide(currentSlide - 1)}
              title="Slide precedente"
            ><ChevronLeft size={16} /></button>
            <span className="ws-present-nav-label">
              Slide {currentSlide + 1} di {sorted.length}
              {currentSlideTitle && <span className="ws-present-nav-title"> · {currentSlideTitle}</span>}
            </span>
            <button
              className="ws-present-nav-btn"
              disabled={currentSlide >= sorted.length - 1}
              onClick={() => setAdminSlide(currentSlide + 1)}
              title="Slide successiva"
            ><ChevronRight size={16} /></button>
          </div>
        )}
        <span className="ws-present-live"><span className="ws-live-dot" />Live</span>
      </div>

      <div className="ws-present-body">
        <div className="ws-present-join-card">
          <QRCodeSVG value={window.location.origin + '/'} size={96} />
          <div className="ws-present-join-info">
            <span className="ws-present-join-label">Partecipa al workshop</span>
            <span className="ws-present-join-url">{window.location.origin}/</span>
          </div>
        </div>

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
                      const v = r.answers[el.id];
                      const vals = Array.isArray(v) ? v as string[] : [v as string];
                      vals.forEach(val => { if (val in counts) counts[val]++; });
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

                  /* Quiz */
                  if (el.type === 'quiz') {
                    const counts = Array(el.options.length).fill(0) as number[];
                    let correctCount = 0;
                    let totalCorrectMs = 0;
                    answered.forEach(r => {
                      const qa = r.answers[el.id] as QuizAnswer;
                      if (qa && typeof qa === 'object' && 'responseTimeMs' in qa) {
                        if (qa.answer >= 0 && qa.answer < counts.length) counts[qa.answer]++;
                        if (qa.answer === el.correctAnswer) { correctCount++; totalCorrectMs += qa.responseTimeMs; }
                      }
                    });
                    const maxCount = Math.max(...counts, 1);
                    const avgMs = correctCount > 0 ? totalCorrectMs / correctCount : 0;
                    const topRanking = answered
                      .filter(r => { const qa = r.answers[el.id] as QuizAnswer; return qa && 'responseTimeMs' in qa && qa.answer === el.correctAnswer; })
                      .map(r => ({ name: r.name, id: r.id, ms: (r.answers[el.id] as QuizAnswer).responseTimeMs }))
                      .sort((a, b) => a.ms - b.ms);
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{el.text}</div>
                        <div className="ws-present-el-meta">
                          {count} risposte · {correctCount} corrette ({Math.round((correctCount / count) * 100)}%)
                          {avgMs > 0 && <> · media {(avgMs / 1000).toFixed(1)}s</>}
                        </div>
                        <div className="ws-present-bars">
                          {el.options.map((opt, i) => (
                            <div key={i} className="ws-present-bar-row">
                              <span className="ws-present-bar-label">
                                {i === el.correctAnswer ? '✓ ' : ''}{opt}
                              </span>
                              <div className="ws-present-bar-track">
                                <div
                                  className={`ws-present-bar-fill${i === el.correctAnswer ? ' ws-present-bar-fill--correct' : ''}`}
                                  style={{ width: `${(counts[i] / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="ws-present-bar-val">
                                {counts[i]} <span className="ws-present-bar-pct">({Math.round((counts[i] / count) * 100)}%)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                        {topRanking.length > 0 && (
                          <div className="ws-present-quiz-leaderboard">
                            <div className="ws-present-quiz-leaderboard-title">🏆 Classifica — risposte corrette</div>
                            {topRanking.slice(0, 5).map((e, i) => (
                              <div key={e.id} className="ws-present-lb-row">
                                <span className="ws-present-lb-rank">#{i + 1}</span>
                                <span className="ws-present-lb-name">{e.name}</span>
                                <span className="ws-present-lb-time">{(e.ms / 1000).toFixed(1)}s</span>
                              </div>
                            ))}
                            {topRanking.length > 5 && (
                              <div className="ws-present-lb-row" style={{ opacity: 0.5 }}>
                                <span className="ws-present-lb-rank">···</span>
                                <span className="ws-present-lb-name">+{topRanking.length - 5} altri</span>
                              </div>
                            )}
                          </div>
                        )}
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
