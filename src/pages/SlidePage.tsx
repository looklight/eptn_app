import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, Eye, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, orderBy, query, setDoc, doc, serverTimestamp, onSnapshot, increment } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, Answers, AnswerValue, ConfigAnswer, QuizElement, QuizAnswer, WorkshopResponse, CarouselElement, CarouselAnswer, RatingElement, RatingAnswer, ResultsElement } from '../types';
import { buildLeaderboard } from '../utils/leaderboard';
import { getSlideMode } from '../types';
import InfoEl from '../components/elements/InfoEl';
import QuestionEl from '../components/elements/QuestionEl';
import ConfiguratorEl from '../components/elements/ConfiguratorEl';
import QuizEl from '../components/elements/QuizEl';
import CarouselEl from '../components/elements/CarouselEl';
import RatingEl from '../components/elements/RatingEl';
import PinModal from '../components/PinModal';

const preloadSlideImages = (slide: Slide | undefined) => {
  if (!slide) return;
  const coverSrc = slide.thumbnailUrl ?? slide.imageUrl;
  if (coverSrc) new Image().src = coverSrc;
  slide.elements.forEach(el => {
    if (el.type === 'carousel') {
      (el as CarouselElement).items.forEach(item => {
        const src = item.thumbnailUrl ?? item.imageUrl;
        if (src) new Image().src = src;
      });
    }
  });
};

const getSessionId = () => {
  let id = sessionStorage.getItem('ws_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('ws_session_id', id);
  }
  return id;
};

// ---- Helpers ----

const AnswersList: React.FC<{ slide: Slide; answers: Answers }> = ({ slide, answers }) => {
  const interactive = slide.elements.filter(el => el.type !== 'info' && el.type !== 'results');
  return (
    <div className="ws-recap-items">
      {interactive.map(el => {
        const answer = answers[el.id];
        if (answer === undefined) return null;
        if (el.type === 'question') {
          const display = typeof answer === 'boolean' ? (answer ? 'Sì' : 'No') : Array.isArray(answer) ? (answer as string[]).join(', ') : String(answer);
          return (
            <div key={el.id} className="ws-response-item">
              <span className="ws-response-question">{el.text}</span>
              <span className="ws-response-answer">{display}</span>
            </div>
          );
        }
        if (el.type === 'configurator') {
          const config = answer as ConfigAnswer;
          return el.categories.map(cat => {
            const prodId = config[cat.id];
            if (!prodId) return null;
            const prod = cat.products.find(p => p.id === prodId);
            if (!prod) return null;
            return (
              <div key={cat.id} className="ws-response-item">
                <span className="ws-response-question">{cat.label}</span>
                <span className="ws-response-answer">{prod.icon ? `${prod.icon} ` : ''}{prod.name}</span>
              </div>
            );
          });
        }
        if (el.type === 'carousel') {
          const itemId = answer as CarouselAnswer;
          if (!itemId) return null;
          const item = (el as CarouselElement).items.find(it => it.id === itemId);
          if (!item) return null;
          return (
            <div key={el.id} className="ws-response-item">
              <span className="ws-response-question">{(el as CarouselElement).title || 'Carosello'}</span>
              <span className="ws-response-answer">{item.title}</span>
            </div>
          );
        }
        if (el.type === 'quiz') {
          const qa = answer as QuizAnswer;
          const correct = qa.answer === (el as QuizElement).correctAnswer;
          return (
            <div key={el.id} className="ws-response-item">
              <span className="ws-response-question">{(el as QuizElement).text}</span>
              <span className="ws-response-answer">
                {(el as QuizElement).options[qa.answer]} {correct ? '✓' : '✗'} · {(qa.responseTimeMs / 1000).toFixed(1)}s
              </span>
            </div>
          );
        }
        if (el.type === 'rating') {
          const ra = answer as RatingAnswer;
          const ratingEl = el as RatingElement;
          const scores = ratingEl.categories.map(c => ra[c.id] ?? 0).filter(s => s > 0);
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          return (
            <div key={el.id} className="ws-recap-rating">
              {ratingEl.title && <div className="ws-recap-rating-title">{ratingEl.title}</div>}
              {ratingEl.categories.map(cat => (
                <div key={cat.id} className="ws-response-item">
                  <span className="ws-response-question">{cat.label}</span>
                  <span className="ws-response-answer" style={{ color: '#f59e0b' }}>
                    {'★'.repeat(ra[cat.id] ?? 0)}{'☆'.repeat(5 - (ra[cat.id] ?? 0))}
                  </span>
                </div>
              ))}
              {avg > 0 && (
                <div className="ws-recap-rating-avg">
                  Media <strong>{avg.toFixed(1)} / 5</strong>
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

// ---- Rating group average (shown in recap/waiting when showSummary is enabled) ----

type RatingStats = Record<string, Record<string, { sum: number; count: number }>>;

const RatingGroupSection: React.FC<{ slide: Slide }> = ({ slide }) => {
  const [stats, setStats] = useState<RatingStats>({});

  useEffect(() => {
    return onSnapshot(doc(db, 'workshop', 'ratingStats'), snap =>
      setStats((snap.data() ?? {}) as RatingStats)
    );
  }, []);

  const ratingEls = slide.elements.filter(
    el => el.type === 'rating' && (el as RatingElement).showSummary
  ) as RatingElement[];

  if (ratingEls.length === 0) return null;

  const hasData = ratingEls.some(el =>
    el.categories.some(cat => (stats[el.id]?.[cat.id]?.count ?? 0) > 0)
  );
  if (!hasData) return null;

  return (
    <div className="ws-recap-group-avg">
      <div className="ws-recap-group-avg-title">Media del gruppo</div>
      {ratingEls.map(el => {
        let totalSum = 0, totalCount = 0;
        const rows = el.categories.map(cat => {
          const s = stats[el.id]?.[cat.id];
          const avg = s && s.count > 0 ? s.sum / s.count : null;
          if (s) { totalSum += s.sum; totalCount += s.count; }
          return (
            <div key={cat.id} className="ws-summary-rating-row">
              <span className="ws-summary-rating-cat">{cat.label}</span>
              <span className="ws-summary-rating-group">
                {avg !== null ? <strong>{avg.toFixed(1)} / 5</strong> : '—'}
              </span>
            </div>
          );
        });
        const overallAvg = totalCount > 0 ? totalSum / totalCount : null;
        return (
          <div key={el.id} className="ws-summary-rating-card">
            {el.title && (
              <div className="ws-summary-rating-header">
                <span className="ws-summary-rating-subtitle">{el.title}</span>
              </div>
            )}
            {rows}
            {overallAvg !== null && (
              <div className="ws-summary-rating-footer">
                Media totale: <strong>{overallAvg.toFixed(1)} / 5</strong>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---- Results element view (shown to users on a results slide) ----

const ResultsElView: React.FC<{ element: ResultsElement; slides: Slide[]; answers: Answers }> = ({ element, slides, answers }) => {
  const [stats, setStats] = useState<RatingStats>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Trova tutti gli elementi sorgente (solo rating e quiz)
  const sourceEls: (RatingElement | QuizElement)[] = [];
  for (const id of element.sourceElementIds) {
    for (const s of slides) {
      const el = s.elements.find(e => e.id === id);
      if (el && (el.type === 'rating' || el.type === 'quiz')) {
        sourceEls.push(el as RatingElement | QuizElement);
        break;
      }
    }
  }

  const hasRating = sourceEls.some(e => e.type === 'rating');

  useEffect(() => {
    if (!hasRating) return;
    return onSnapshot(doc(db, 'workshop', 'ratingStats'), snap =>
      setStats((snap.data() ?? {}) as RatingStats)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (sourceEls.length === 0) return (
    <div className="ws-results-el">
      <div className="ws-results-no-data">Elemento non configurato</div>
    </div>
  );

  // Media totale per elemento rating (per ordinamento classifica)
  const ratingAvgs = new Map<string, number>();
  for (const el of sourceEls) {
    if (el.type !== 'rating') continue;
    const rating = el as RatingElement;
    let totalSum = 0, totalCount = 0;
    for (const cat of rating.categories) {
      const s = stats[rating.id]?.[cat.id];
      if (s && s.count > 0) { totalSum += s.sum; totalCount += s.count; }
    }
    if (totalCount > 0) ratingAvgs.set(rating.id, totalSum / totalCount);
  }

  const sortedEls = ratingAvgs.size > 0
    ? [...sourceEls].sort((a, b) => {
        if (a.type === 'rating' && b.type === 'rating')
          return (ratingAvgs.get(b.id) ?? 0) - (ratingAvgs.get(a.id) ?? 0);
        return 0;
      })
    : sourceEls;

  return (
    <>
      {sortedEls.map((sourceEl, rank) => {
        if (sourceEl.type === 'rating') {
          const rating = sourceEl as RatingElement;
          const overallAvg = ratingAvgs.get(rating.id) ?? null;
          const isOpen = expanded.has(rating.id);
          return (
            <div key={rating.id} className="ws-results-el">
              <div className="ws-results-el-header ws-results-el-header--clickable" onClick={() => toggleExpanded(rating.id)}>
                {overallAvg !== null && (
                  <span className="ws-results-el-rank">#{rank + 1}</span>
                )}
                {rating.title && <span className="ws-results-el-title">{rating.title}</span>}
                {overallAvg !== null && (
                  <span className="ws-results-el-overall">{overallAvg.toFixed(1)} ★</span>
                )}
                <span className={`ws-results-chevron${isOpen ? ' ws-results-chevron--open' : ''}`}>
                  <ChevronDown size={15} />
                </span>
              </div>
              {isOpen && (
                <div className="ws-results-cats">
                  {rating.categories.map(cat => {
                    const s = stats[rating.id]?.[cat.id];
                    const avg = s && s.count > 0 ? s.sum / s.count : null;
                    return (
                      <div key={cat.id} className="ws-results-cat-row">
                        <span className="ws-results-cat-label">{cat.label}</span>
                        {avg !== null ? (
                          <>
                            <span className="ws-results-cat-stars">
                              {'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}
                            </span>
                            <span className="ws-results-cat-avg">{avg.toFixed(1)}</span>
                          </>
                        ) : (
                          <span className="ws-results-cat-avg">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        if (sourceEl.type === 'quiz') {
          const quiz = sourceEl as QuizElement;
          const userAnswer = answers[quiz.id] as QuizAnswer | undefined;
          return (
            <div key={quiz.id} className="ws-results-el">
              <div className="ws-results-el-title">{quiz.text}</div>
              <div className="ws-results-quiz-options">
                {quiz.options.map((opt, i) => {
                  const isCorrect = i === quiz.correctAnswer;
                  const isMine = userAnswer?.answer === i;
                  return (
                    <div
                      key={i}
                      className={`ws-results-quiz-opt${isCorrect ? ' ws-results-quiz-opt--correct' : ''}${isMine && !isCorrect ? ' ws-results-quiz-opt--wrong' : ''}`}
                    >
                      <span className="ws-results-quiz-opt-marker">{isCorrect ? '✓' : isMine ? '✗' : ''}</span>
                      <span>{opt}</span>
                      {isMine && <span className="ws-results-quiz-opt-mine">← tua risposta</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
};

// ---- Recap screen ----

const SlideRecap: React.FC<{ slide: Slide; answers: Answers; onContinue: () => void }> = ({ slide, answers, onContinue }) => (
  <div className="ws-slide-page">
    <div className="ws-slide-inner">
      <div className="ws-recap-header">
        <div className="ws-recap-icon"><Check size={28} strokeWidth={2.5} /></div>
        <h2 className="ws-recap-title">Le tue risposte</h2>
        <p className="ws-recap-sub">{slide.title}</p>
      </div>
      <AnswersList slide={slide} answers={answers} />
      <RatingGroupSection slide={slide} />
      <div className="ws-slide-nav" style={{ marginTop: 32 }}>
        <button className="ws-btn ws-btn-primary ws-btn-full" onClick={onContinue}>
          Continua <ArrowRight size={16} />
        </button>
      </div>
    </div>
  </div>
);

// ---- Waiting screen ----

const WaitingScreen: React.FC<{ slide: Slide; answers: Answers }> = ({ slide, answers }) => (
  <div className="ws-slide-page">
    <div className="ws-slide-inner">
      <div className="ws-recap-header">
        <div className="ws-waiting-icon">
          <span className="ws-waiting-dot" />
          <span className="ws-waiting-dot" />
          <span className="ws-waiting-dot" />
        </div>
        <h2 className="ws-recap-title">Risposte inviate</h2>
        <p className="ws-recap-sub">Il facilitatore avanzerà il gruppo alla slide successiva</p>
      </div>
      <AnswersList slide={slide} answers={answers} />
      <RatingGroupSection slide={slide} />
    </div>
  </div>
);

// ---- Leaderboard screen ----

const LeaderboardScreen: React.FC<{
  slides: Slide[];
  currentSlideIndex: number;
  sessionId: string;
  onContinue: () => void;
}> = ({ slides, currentSlideIndex, sessionId, onContinue }) => {
  const [responses, setResponses] = useState<WorkshopResponse[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'responses'), snap =>
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopResponse)))
    );
    return unsub;
  }, []);

  // Tutti i quiz nelle slide dalla 0 alla corrente (inclusa), raggruppati per slide
  const quizBySlide: QuizElement[][] = slides
    .slice(0, currentSlideIndex + 1)
    .map(s => s.elements.filter(e => e.type === 'quiz') as QuizElement[])
    .filter(qs => qs.length > 0);

  const totalQuizCount = quizBySlide.reduce((sum, qs) => sum + qs.length, 0);

  // Classifica provvisoria se ci sono altri quiz in slide successive
  const isProvisional = slides.slice(currentSlideIndex + 1).some(s =>
    s.elements.some(e => e.type === 'quiz')
  );

  const entries = buildLeaderboard(quizBySlide, responses);
  const myRank = entries.findIndex(e => e.id === sessionId) + 1;
  const myEntry = entries.find(e => e.id === sessionId);

  return (
    <div className="ws-slide-page">
      <div className="ws-slide-inner">
        <div className="ws-recap-header">
          <div className="ws-leaderboard-trophy">🏆</div>
          <h2 className="ws-recap-title">
            {isProvisional ? 'Classifica provvisoria' : 'Classifica finale'}
          </h2>
          {myEntry && (
            <p className="ws-recap-sub">
              {myEntry.numCorrect === totalQuizCount
                ? `Sei al ${myRank}° posto!`
                : `${myEntry.numCorrect}/${totalQuizCount} risposte corrette · ${myRank}° posto`}
            </p>
          )}
        </div>
        <div className="ws-leaderboard">
          {entries.slice(0, 10).map((entry, i) => (
            <div key={entry.id} className={`ws-leaderboard-row${entry.id === sessionId ? ' ws-leaderboard-row--me' : ''}`}>
              <span className="ws-leaderboard-rank">{i + 1}</span>
              <span className="ws-leaderboard-name">{entry.name}</span>
              <span className="ws-leaderboard-score">{entry.numCorrect}/{totalQuizCount} ✓</span>
              <span className="ws-leaderboard-time">{(entry.totalMs / 1000).toFixed(1)}s</span>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="ws-leaderboard-row" style={{ justifyContent: 'center', color: 'var(--ws-muted)' }}>
              Nessuna risposta ancora
            </div>
          )}
        </div>
        <div className="ws-slide-nav" style={{ marginTop: 32 }}>
          <button className="ws-btn ws-btn-primary ws-btn-full" onClick={onContinue}>
            Continua <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Main SlidePage ----

const SlidePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).has('preview');

  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const [showingRecap, setShowingRecap] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [showingLeaderboard, setShowingLeaderboard] = useState(false);
  // Refs per leggere valori aggiornati dentro il callback Firestore
  const waitingRef = useRef(false);
  const slideIndexRef = useRef(slideIndex);
  const adminCurrentSlideRef = useRef(-1);
  const leaderboardShownRef = useRef(false);
  const slidesRef = useRef<Slide[]>([]);
  const answersRef = useRef<Answers>({});
  useEffect(() => { waitingRef.current = waiting; }, [waiting]);
  useEffect(() => { slideIndexRef.current = slideIndex; }, [slideIndex]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Scroll to top after any screen transition (runs after DOM update)
  useEffect(() => { window.scrollTo(0, 0); }, [slideIndex, showingRecap, showingLeaderboard, waiting]);

  // Preload next slide images while the user is on the current slide
  useEffect(() => { preloadSlideImages(slidesRef.current[slideIndex + 1]); }, [slideIndex]);

  const name = isPreview ? 'Anteprima' : sessionStorage.getItem('ws_name');

  useEffect(() => {
    if (!isPreview && !name) { navigate('/'); return; }
    if (!isPreview) {
      setSlideIndex(parseInt(sessionStorage.getItem('ws_slide') || '0', 10));
      try { setAnswers(JSON.parse(sessionStorage.getItem('ws_answers') || '{}')); } catch { /* */ }
    }
    const load = async () => {
      const q = query(collection(db, 'slides'), orderBy('order'));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide));
      setSlides(loaded);
      slidesRef.current = loaded;
      setLoading(false);
      preloadSlideImages(loaded[slideIndex]);
      preloadSlideImages(loaded[slideIndex + 1]);
    };
    load();
  }, [navigate, name, isPreview]);

  useEffect(() => {
    return onSnapshot(doc(db, 'workshop', 'config'), snap => {
      const data = snap.data();
      if (data?.currentSlide === undefined) return;
      const adminSlide = data.currentSlide as number;
      adminCurrentSlideRef.current = adminSlide;
      // Auto-avanza se in attesa e admin ha sbloccato questa slide
      if (waitingRef.current && adminSlide > slideIndexRef.current) {
        const currentEls = slidesRef.current[slideIndexRef.current]?.elements ?? [];
        const quizWithLeaderboard = currentEls.find(e => e.type === 'quiz' && (e as QuizElement).showLeaderboard);
        if (quizWithLeaderboard && !leaderboardShownRef.current) {
          leaderboardShownRef.current = true;
          setWaiting(false);
          setShowingLeaderboard(true);
          return;
        }
        flushRatingStats(slideIndexRef.current, answersRef.current);
        const next = slideIndexRef.current + 1;
        setSlideIndex(next);
        sessionStorage.setItem('ws_slide', String(next));
        setWaiting(false);
      }
    });
  }, []);

  const setAnswer = (elementId: string, value: AnswerValue) => {
    const updated = { ...answers, [elementId]: value };
    setAnswers(updated);
    if (!isPreview) sessionStorage.setItem('ws_answers', JSON.stringify(updated));
  };

  const saveProgress = (currentAnswers: Answers) => {
    if (isPreview) return;
    setDoc(doc(db, 'responses', getSessionId()), {
      name, answers: currentAnswers, partial: true,
    }, { merge: true }).catch(console.error);
  };

  // Aggiorna ratingStats per gli elementi rating di una slide specifica (best-effort)
  const flushRatingStats = (slideIdx: number, currentAnswers: Answers) => {
    if (isPreview) return;
    const slide = slidesRef.current[slideIdx];
    if (!slide) return;
    const statsUpdate: Record<string, unknown> = {};
    for (const el of slide.elements) {
      if (el.type !== 'rating') continue;
      const ra = currentAnswers[el.id] as RatingAnswer | undefined;
      if (!ra) continue;
      for (const cat of (el as RatingElement).categories) {
        const stars = ra[cat.id];
        if (typeof stars === 'number' && stars > 0) {
          statsUpdate[`${el.id}.${cat.id}.sum`] = increment(stars);
          statsUpdate[`${el.id}.${cat.id}.count`] = increment(1);
        }
      }
    }
    if (Object.keys(statsUpdate).length > 0) {
      setDoc(doc(db, 'workshop', 'ratingStats'), statsUpdate, { merge: true }).catch(console.error);
    }
  };

  const advanceSlide = (currentAnswers: Answers) => {
    saveProgress(currentAnswers);
    flushRatingStats(slideIndex, currentAnswers);
    leaderboardShownRef.current = false;
    const next = slideIndex + 1;
    setSlideIndex(next);
    if (!isPreview) sessionStorage.setItem('ws_slide', String(next));
    setShowPin(false);
    setPinError('');
    setShowingRecap(false);
  };

  const handleModeratedAdvance = () => {
    if (isPreview) { advanceSlide(answers); return; }
    const quizWithLeaderboard = slides[slideIndex]?.elements.find(e => e.type === 'quiz' && (e as QuizElement).showLeaderboard);
    if (adminCurrentSlideRef.current > slideIndex) {
      if (quizWithLeaderboard && !leaderboardShownRef.current) {
        leaderboardShownRef.current = true;
        setShowingLeaderboard(true);
      } else {
        advanceSlide(answers);
      }
    } else {
      saveProgress(answers);
      setWaiting(true);
    }
  };

  const handlePinSubmit = (pin: string) => {
    if (pin === slides[slideIndex].pin) {
      setShowPin(false);
      setPinError('');
      if (slides[slideIndex].showRecap) {
        setShowingRecap(true);
      } else {
        advanceSlide(answers);
      }
    } else {
      setPinError('PIN errato. Riprova.');
    }
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    if (isPreview) {
      sessionStorage.setItem('ws_summary_answers', JSON.stringify(answers));
      sessionStorage.setItem('ws_summary_name', 'Anteprima');
      navigate('/summary');
      return;
    }
    try {
      await setDoc(doc(db, 'responses', getSessionId()), {
        name, answers, partial: false, submittedAt: serverTimestamp(),
      }, { merge: true });
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setSubmitError('Errore durante l\'invio. Riprova.');
      return;
    }
    // Le slide precedenti sono già state aggiornate in advanceSlide/flushRatingStats.
    // Qui aggiorniamo solo l'ultima slide (che non passa per advanceSlide).
    flushRatingStats(slideIndex, answers);
    sessionStorage.setItem('ws_summary_name', name || '');
    sessionStorage.setItem('ws_summary_session_id', getSessionId());
    sessionStorage.removeItem('ws_slide');
    sessionStorage.removeItem('ws_answers');
    sessionStorage.removeItem('ws_name');
    sessionStorage.removeItem('ws_session_id');
    navigate('/summary');
  };

  if (loading) return <div className="ws-page-center"><p style={{ color: 'var(--ws-muted)' }}>Caricamento...</p></div>;

  if (slides.length === 0) return (
    <div className="ws-page-center">
      <div className="ws-card"><p style={{ color: 'var(--ws-muted)' }}>Il workshop non ha ancora slide. Riprova tra poco.</p></div>
    </div>
  );

  const slide = slides[slideIndex];
  if (!slide) return (
    <div className="ws-page-center">
      <div className="ws-card">
        <p style={{ color: 'var(--ws-muted)' }}>Slide non trovata. Il workshop potrebbe essere stato modificato.</p>
        <button className="ws-btn ws-btn-secondary ws-btn-full" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          Torna alla home
        </button>
      </div>
    </div>
  );
  const isLast = slideIndex === slides.length - 1;
  const progress = ((slideIndex + 1) / slides.length) * 100;

  if (showingRecap) {
    return <SlideRecap slide={slide} answers={answers} onContinue={() => advanceSlide(answers)} />;
  }

  if (showingLeaderboard) {
    return (
      <LeaderboardScreen
        slides={slides}
        currentSlideIndex={slideIndex}
        sessionId={isPreview ? '' : getSessionId()}
        onContinue={() => { setShowingLeaderboard(false); advanceSlide(answers); }}
      />
    );
  }

  if (waiting) {
    return <WaitingScreen slide={slide} answers={answers} />;
  }

  return (
    <div className="ws-slide-page">
      {isPreview && (
        <div className="ws-preview-banner">
          <Eye size={13} />
          <span>Modalità anteprima — le risposte non vengono salvate</span>
          <button className="ws-preview-banner-close" onClick={() => window.close()}>✕</button>
        </div>
      )}

      <div className="ws-slide-progress">
        <div className="ws-slide-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ws-slide-inner">
        <div className="ws-slide-header">
          <h1 className="ws-slide-title">{slide.title}</h1>
        </div>

        <div className="ws-slide-content">
          {slide.imageUrl && (
            <div className="ws-slide-image-wrap">
              <img src={slide.thumbnailUrl ?? slide.imageUrl} alt="" className="ws-slide-image" />
            </div>
          )}
          {slide.elements.map(el => {
            if (el.type === 'info') return <InfoEl key={el.id} element={el} />;
            if (el.type === 'question') return (
              <QuestionEl key={el.id} element={el} value={answers[el.id]} onChange={v => setAnswer(el.id, v)} />
            );
            if (el.type === 'configurator') return (
              <ConfiguratorEl key={el.id} element={el} value={answers[el.id] as ConfigAnswer | undefined} onChange={v => setAnswer(el.id, v)} />
            );
            if (el.type === 'quiz') return (
              <QuizEl key={el.id} element={el} value={answers[el.id] as QuizAnswer | undefined} onChange={v => setAnswer(el.id, v)} />
            );
            if (el.type === 'carousel') return (
              <CarouselEl key={el.id} element={el as CarouselElement} value={answers[el.id] as CarouselAnswer | undefined} onChange={v => setAnswer(el.id, v)} />
            );
            if (el.type === 'rating') return (
              <RatingEl key={el.id} element={el as RatingElement} value={answers[el.id] as RatingAnswer | undefined} onChange={v => setAnswer(el.id, v)} />
            );
            if (el.type === 'results') return (
              <ResultsElView key={el.id} element={el as ResultsElement} slides={slides} answers={answers} />
            );
            return null;
          })}
        </div>

        <div className="ws-slide-nav">
          {!isLast ? (
            (getSlideMode(slide) === 'pin' && !isPreview) ? (
              <button className="ws-btn ws-btn-primary ws-btn-full" onClick={() => setShowPin(true)}>
                Avanti <ArrowRight size={16} />
              </button>
            ) : (
              <button className="ws-btn ws-btn-primary ws-btn-full"
                onClick={getSlideMode(slide) === 'moderated' ? handleModeratedAdvance : () => advanceSlide(answers)}>
                Avanti <ArrowRight size={16} />
              </button>
            )
          ) : (
            <>
              {submitError && <p className="ws-error-msg" style={{ marginBottom: 8 }}>{submitError}</p>}
              <button className="ws-btn ws-btn-success ws-btn-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Invio...' : <><Check size={16} /> {isPreview ? 'Fine anteprima' : 'Invia e vedi il riepilogo'}</>}
              </button>
            </>
          )}
        </div>
      </div>

      {showPin && !isPreview && (
        <PinModal
          onConfirm={handlePinSubmit}
          onClose={() => { setShowPin(false); setPinError(''); }}
          error={pinError}
        />
      )}
    </div>
  );
};

export default SlidePage;
