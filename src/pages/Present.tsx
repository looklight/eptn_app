import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Users, Unlock, KeyRound, CheckCircle2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, WorkshopResponse, ConfigAnswer, QuizAnswer, SlideMode, InfoElement, CarouselElement, RatingAnswer, RatingElement, ResultsElement } from '../types';
import { getSlideMode } from '../types';
import InfoEl from '../components/elements/InfoEl';

const ModeIcon: React.FC<{ mode: SlideMode }> = ({ mode }) => {
  if (mode === 'pin') return <KeyRound size={11} />;
  if (mode === 'autonomous') return <Unlock size={11} />;
  return <Users size={11} />;
};

const MODE_LABELS: Record<SlideMode, string> = {
  moderated: 'Moderata',
  pin: 'Con PIN',
  autonomous: 'Autonoma',
};

const Present: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [responses, setResponses] = useState<WorkshopResponse[]>([]);
  const [loading, setLoading] = useState(true);
  // -1 = welcome/QR screen (pre-start); 0+ = slide index
  const [currentSlide, setCurrentSlide] = useState<number>(-1);
  const [showLobby, setShowLobby] = useState<boolean>(true);
  const [workshopName, setWorkshopName] = useState<string>('');

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
      const lobbyEnabled = data?.showLobby !== false;
      setShowLobby(lobbyEnabled);
      if (data?.name) setWorkshopName(data.name as string);
      if (data?.currentSlide !== undefined) setCurrentSlide(data.currentSlide as number);
      // Se la lobby è disabilitata e currentSlide è ancora pre-start, inizializza a 0
      if (!lobbyEnabled && (data?.currentSlide === undefined || (data.currentSlide as number) < 0)) {
        setDoc(doc(db, 'workshop', 'config'), { currentSlide: 0 }, { merge: true }).catch(console.error);
      }
    });
    return () => { unsubResponses(); unsubConfig(); };
  }, []);

  const setAdminSlide = (idx: number) => {
    setDoc(doc(db, 'workshop', 'config'), { currentSlide: idx }, { merge: true }).catch(console.error);
  };

  const sorted = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const hasModerated = useMemo(() => sorted.some(s => getSlideMode(s) === 'moderated'), [sorted]);

  const isWelcome = showLobby && currentSlide < 0;
  const effectiveSlide = isWelcome ? -1 : Math.max(0, currentSlide);
  const slide = !isWelcome ? (sorted[effectiveSlide] ?? null) : null;
  const mode = slide ? getSlideMode(slide) : 'moderated';

  const interactive = useMemo(
    () => slide ? slide.elements.filter(el => el.type !== 'info' && el.type !== 'results') : [],
    [slide]
  );

  const answeredByElementId = useMemo(() => {
    const map = new Map<string, WorkshopResponse[]>();
    interactive.forEach(el => {
      map.set(el.id, responses.filter(r => r.answers?.[el.id] !== undefined));
    });
    return map;
  }, [interactive, responses]);

  const answeredCount = useMemo(
    () => interactive.length > 0
      ? responses.filter(r => interactive.some(el => r.answers?.[el.id] !== undefined)).length
      : null,
    [interactive, responses]
  );

  // Navigazione con frecce tastiera
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const eff = Math.max(0, currentSlide);
      const inLobby = showLobby && currentSlide < 0;
      if (e.key === 'ArrowRight' && !inLobby && eff < sorted.length - 1) setAdminSlide(eff + 1);
      if (e.key === 'ArrowLeft' && !inLobby && eff > 0) setAdminSlide(eff - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentSlide, showLobby, sorted.length]);

  if (loading) return <div className="ws-present-loading">Caricamento...</div>;

  const complete = responses.filter(r => !r.partial).length;
  const inProgress = responses.filter(r => r.partial).length;
  const totalParticipants = responses.length;

  return (
    <div className="ws-present">

      {/* ── TOP BAR ── */}
      <div className="ws-present-topbar">
        <div className="ws-present-topbar-row1">

          <div className="ws-present-topbar-left">
            <span className="ws-present-live"><span className="ws-live-dot" />Live</span>
            <span className="ws-present-count">
              <strong>{totalParticipants}</strong> partecipanti
              {inProgress > 0 && <span className="ws-present-count-sub"> · {inProgress} in corso</span>}
              {complete > 0 && <span className="ws-present-count-sub"> · {complete} completati</span>}
            </span>
          </div>

          {!isWelcome && (
            <div className="ws-present-nav">
              <button
                className="ws-present-nav-btn"
                disabled={!hasModerated || effectiveSlide <= 0}
                onClick={() => setAdminSlide(effectiveSlide - 1)}
                title="Slide precedente"
              ><ChevronLeft size={16} /></button>

              <div className="ws-present-nav-center">
                <div className="ws-present-nav-meta">
                  <span className="ws-present-nav-pos">
                    {effectiveSlide + 1}<span className="ws-present-nav-of"> / {sorted.length}</span>
                  </span>
                  <span className={`ws-present-mode-badge ws-present-mode-badge--${mode}`}>
                    <ModeIcon mode={mode} />{MODE_LABELS[mode]}
                  </span>
                  {answeredCount !== null && totalParticipants > 0 && (
                    <span className={`ws-present-hd-count${answeredCount === totalParticipants ? ' ws-present-hd-count--full' : ''}`}>
                      {answeredCount === totalParticipants && <CheckCircle2 size={11} />}
                      {answeredCount}/{totalParticipants}
                    </span>
                  )}
                </div>
                {slide?.title && (
                  <span className="ws-present-nav-title">{slide.title}</span>
                )}
              </div>

              <button
                className="ws-present-nav-btn"
                disabled={!hasModerated || effectiveSlide >= sorted.length - 1}
                onClick={() => setAdminSlide(effectiveSlide + 1)}
                title="Slide successiva"
              ><ChevronRight size={16} /></button>
            </div>
          )}

          <div className="ws-present-topbar-right">
            {showLobby && !isWelcome && (
              <button className="ws-present-lobby-btn" onClick={() => setAdminSlide(-1)} title="Torna alla lobby">
                <QrCode size={14} /> Lobby
              </button>
            )}
          </div>

        </div>

        {/* Slide strip — hidden on welcome screen */}
        {!isWelcome && (
          <div className="ws-present-strip">
            {sorted.map((s, i) => (
              <div
                key={s.id}
                className={`ws-present-strip-step${i === effectiveSlide ? ' ws-present-strip-step--current' : i < effectiveSlide ? ' ws-present-strip-step--done' : ''}`}
                title={s.title ? `Slide ${i + 1}: ${s.title}` : `Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="ws-present-body">

        {/* Welcome / QR screen */}
        {isWelcome && (
          <div className="ws-present-welcome">
            <div className="ws-present-welcome-inner">

              <div className="ws-present-welcome-left">
                <div className="ws-present-welcome-qr">
                  <QRCodeSVG value={window.location.origin + '/'} size={300} />
                </div>
                <div className="ws-present-welcome-url">{window.location.origin}/</div>
              </div>

              <div className="ws-present-welcome-right">
                {workshopName && (
                  <div className="ws-present-welcome-name">{workshopName}</div>
                )}
                <h1 className="ws-present-welcome-headline">Partecipa al workshop</h1>
                <p className="ws-present-welcome-hint">
                  Scannerizza il QR con il tuo telefono<br />
                  o visita l'indirizzo qui accanto
                </p>
                {totalParticipants > 0 ? (
                  <div className="ws-present-welcome-count">
                    {totalParticipants} {totalParticipants === 1 ? 'partecipante connesso' : 'partecipanti connessi'}
                  </div>
                ) : (
                  <div className="ws-present-welcome-waiting">In attesa di partecipanti...</div>
                )}
                <button className="ws-present-welcome-btn" onClick={() => setAdminSlide(0)}>
                  Avvia presentazione <ChevronRight size={18} />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Current slide */}
        {!isWelcome && !slide && (
          <div className="ws-present-empty">Nessuna slide disponibile.</div>
        )}

        {!isWelcome && slide && (
          <div className="ws-present-section">

            {/* Response progress bar — shown at top of content when there are interactive elements */}
            {answeredCount !== null && totalParticipants > 0 && (
              <div className="ws-present-resp-bar-wrap">
                <div
                  className={`ws-present-resp-bar-fill${answeredCount === totalParticipants ? ' ws-present-resp-bar-fill--full' : ''}`}
                  style={{ width: `${(answeredCount / totalParticipants) * 100}%` }}
                />
              </div>
            )}

            {/* Elements */}
            <div className="ws-present-elements">
              {slide.title && (
                <h2 className="ws-present-slide-title">{slide.title}</h2>
              )}
              {slide.imageUrl && (
                <div className="ws-present-slide-image-wrap">
                  <img src={slide.imageUrl} alt="" className="ws-present-slide-image" />
                </div>
              )}
              {interactive.length === 0 && (
                <div className="ws-present-info-els">
                  {slide.elements.filter(el => el.type === 'info').map(el => (
                    <InfoEl key={el.id} element={el as InfoElement} />
                  ))}
                </div>
              )}
              {interactive.length > 0 && interactive.map(el => {
                  const answered = answeredByElementId.get(el.id) ?? [];
                  const count = answered.length;

                  if (count === 0) return (
                    <div key={el.id} className="ws-present-el">
                      <div className="ws-present-el-label">
                        {el.type === 'configurator' ? el.title : el.type === 'carousel' ? (el as CarouselElement).title : el.type === 'rating' ? el.title : el.text}
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
                                <div className="ws-present-scale-bar-fill" style={{ height: `${(c / maxCount) * 100}%` }} />
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

                  /* Carousel */
                  if (el.type === 'carousel') {
                    const carousel = el as CarouselElement;
                    const counts: Record<string, number> = {};
                    carousel.items.forEach(it => { counts[it.id] = 0; });
                    answered.forEach(r => {
                      const v = r.answers[el.id] as string | null;
                      if (v && v in counts) counts[v]++;
                    });
                    const total = Object.values(counts).reduce((a, b) => a + b, 0);
                    const maxCount = Math.max(...Object.values(counts), 1);
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{carousel.title || 'Carosello'}</div>
                        <div className="ws-present-el-meta">{count} risposte</div>
                        <div className="ws-present-bars">
                          {carousel.items.map(item => {
                            const c = counts[item.id] || 0;
                            return (
                              <div key={item.id} className="ws-present-bar-row">
                                <span className="ws-present-bar-label">{item.title}</span>
                                <div className="ws-present-bar-track">
                                  <div className="ws-present-bar-fill" style={{ width: `${(c / maxCount) * 100}%` }} />
                                </div>
                                <span className="ws-present-bar-val">
                                  {c}
                                  {total > 0 && (
                                    <span className="ws-present-bar-pct"> ({Math.round((c / total) * 100)}%)</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
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

                  /* Rating */
                  if (el.type === 'rating') {
                    const rating = el as RatingElement;
                    const catAvgs = rating.categories.map(cat => {
                      let sum = 0, n = 0;
                      answered.forEach(r => {
                        const v = (r.answers[el.id] as RatingAnswer)?.[cat.id];
                        if (v && v >= 1 && v <= 5) { sum += v; n++; }
                      });
                      return { cat, avg: n > 0 ? sum / n : 0 };
                    });
                    const ranked = [...catAvgs].filter(s => s.avg > 0).sort((a, b) => b.avg - a.avg);
                    const maxAvg = ranked[0]?.avg ?? 0;
                    return (
                      <div key={el.id} className="ws-present-el">
                        <div className="ws-present-el-label">{rating.title || 'Valutazione'}</div>
                        <div className="ws-present-el-meta">{count} risposte</div>
                        {maxAvg > 0 && (
                          <div className="ws-present-rating-ranking">
                            {ranked.map((item, i) => {
                              const isWinner = item.avg === maxAvg;
                              return (
                                <div key={item.cat.id} className={`ws-present-rating-rank-row${isWinner ? ' ws-present-rating-rank-row--winner' : ''}`}>
                                  <span className="ws-present-rating-rank-pos">
                                    {isWinner ? '🏆' : `#${i + 1}`}
                                  </span>
                                  <span className="ws-present-rating-rank-label">{item.cat.label}</span>
                                  <span className="ws-present-rating-rank-stars">
                                    {'★'.repeat(Math.round(item.avg))}{'☆'.repeat(5 - Math.round(item.avg))}
                                  </span>
                                  <span className="ws-present-rating-rank-avg">{item.avg.toFixed(1)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}

              {/* Results elements */}
              {slide.elements.filter(el => el.type === 'results').map(el => {
                const resultsEl = el as ResultsElement;
                const sourceSlide = sorted.find(s => s.id === resultsEl.sourceSlideId);
                const sourceEl = sourceSlide?.elements.find(e => e.id === resultsEl.sourceElementId);

                if (!sourceEl) return (
                  <div key={el.id} className="ws-present-el">
                    <div className="ws-present-no-data">Elemento risultati non configurato</div>
                  </div>
                );

                const answered = responses.filter(r => r.answers?.[sourceEl.id] !== undefined);
                const count = answered.length;

                if (count === 0) return (
                  <div key={el.id} className="ws-present-el">
                    <div className="ws-present-el-label">
                      {sourceEl.type === 'rating' ? (sourceEl as RatingElement).title || 'Valutazione' : (sourceEl as { text: string }).text || 'Quiz'}
                    </div>
                    <div className="ws-present-no-data">Nessuna risposta ancora</div>
                  </div>
                );

                /* Rating results */
                if (sourceEl.type === 'rating') {
                  const rating = sourceEl as RatingElement;
                  const catAvgs = rating.categories.map(cat => {
                    let sum = 0, n = 0;
                    answered.forEach(r => {
                      const v = (r.answers[sourceEl.id] as RatingAnswer)?.[cat.id];
                      if (v && v >= 1 && v <= 5) { sum += v; n++; }
                    });
                    return { cat, avg: n > 0 ? sum / n : 0 };
                  });
                  const ranked = [...catAvgs].filter(s => s.avg > 0).sort((a, b) => b.avg - a.avg);
                  const maxAvg = ranked[0]?.avg ?? 0;
                  return (
                    <div key={el.id} className="ws-present-el">
                      <div className="ws-present-el-label">{rating.title || 'Valutazione'}</div>
                      <div className="ws-present-el-meta">{count} risposte</div>
                      {maxAvg > 0 && (
                        <div className="ws-present-rating-ranking">
                          {ranked.map((item, i) => {
                            const isWinner = item.avg === maxAvg;
                            return (
                              <div key={item.cat.id} className={`ws-present-rating-rank-row${isWinner ? ' ws-present-rating-rank-row--winner' : ''}`}>
                                <span className="ws-present-rating-rank-pos">
                                  {isWinner ? '🏆' : `#${i + 1}`}
                                </span>
                                <span className="ws-present-rating-rank-label">{item.cat.label}</span>
                                <span className="ws-present-rating-rank-stars">
                                  {'★'.repeat(Math.round(item.avg))}{'☆'.repeat(5 - Math.round(item.avg))}
                                </span>
                                <span className="ws-present-rating-rank-avg">{item.avg.toFixed(1)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                /* Quiz results */
                if (sourceEl.type === 'quiz') {
                  const quizEl = sourceEl as { type: 'quiz'; text: string; options: string[]; correctAnswer: number };
                  const counts = Array(quizEl.options.length).fill(0) as number[];
                  let correctCount = 0;
                  answered.forEach(r => {
                    const qa = r.answers[sourceEl.id] as QuizAnswer;
                    if (qa && typeof qa === 'object' && 'responseTimeMs' in qa) {
                      if (qa.answer >= 0 && qa.answer < counts.length) counts[qa.answer]++;
                      if (qa.answer === quizEl.correctAnswer) correctCount++;
                    }
                  });
                  const maxCount = Math.max(...counts, 1);
                  return (
                    <div key={el.id} className="ws-present-el">
                      <div className="ws-present-el-label">{quizEl.text}</div>
                      <div className="ws-present-el-meta">
                        {count} risposte · {correctCount} corrette ({Math.round((correctCount / count) * 100)}%)
                      </div>
                      <div className="ws-present-bars">
                        {quizEl.options.map((opt, i) => (
                          <div key={i} className="ws-present-bar-row">
                            <span className="ws-present-bar-label">
                              {i === quizEl.correctAnswer ? '✓ ' : ''}{opt}
                            </span>
                            <div className="ws-present-bar-track">
                              <div
                                className={`ws-present-bar-fill${i === quizEl.correctAnswer ? ' ws-present-bar-fill--correct' : ''}`}
                                style={{ width: `${(counts[i] / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="ws-present-bar-val">
                              {counts[i]} <span className="ws-present-bar-pct">({Math.round((counts[i] / count) * 100)}%)</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>


          </div>
        )}
      </div>
    </div>
  );
};

export default Present;
