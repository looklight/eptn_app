import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, Answers, AnswerValue, ConfigAnswer } from '../types';
import InfoEl from '../components/elements/InfoEl';
import QuestionEl from '../components/elements/QuestionEl';
import ConfiguratorEl from '../components/elements/ConfiguratorEl';
import PinModal from '../components/PinModal';

const getSessionId = () => {
  let id = sessionStorage.getItem('ws_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('ws_session_id', id);
  }
  return id;
};

// ---- Recap screen ----

const SlideRecap: React.FC<{ slide: Slide; answers: Answers; onContinue: () => void }> = ({ slide, answers, onContinue }) => {
  const interactive = slide.elements.filter(el => el.type !== 'info');
  return (
    <div className="ws-slide-page">
      <div className="ws-slide-inner">
        <div className="ws-recap-header">
          <div className="ws-recap-icon">✓</div>
          <h2 className="ws-recap-title">Le tue risposte</h2>
          <p className="ws-recap-sub">{slide.title}</p>
        </div>
        <div className="ws-recap-items">
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
            return null;
          })}
        </div>
        <div className="ws-slide-nav" style={{ marginTop: 32 }}>
          <button className="ws-btn ws-btn-primary ws-btn-full" onClick={onContinue}>
            Continua →
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Main SlidePage ----

const SlidePage: React.FC = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState<number>(() =>
    parseInt(sessionStorage.getItem('ws_slide') || '0', 10)
  );
  const [answers, setAnswers] = useState<Answers>(() => {
    try { return JSON.parse(sessionStorage.getItem('ws_answers') || '{}'); }
    catch { return {}; }
  });
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const [showingRecap, setShowingRecap] = useState(false);

  const name = sessionStorage.getItem('ws_name');

  useEffect(() => {
    if (!name) { navigate('/'); return; }
    const load = async () => {
      const q = query(collection(db, 'slides'), orderBy('order'));
      const snap = await getDocs(q);
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)));
      setLoading(false);
    };
    load();
  }, [navigate, name]);

  const setAnswer = (elementId: string, value: AnswerValue) => {
    const updated = { ...answers, [elementId]: value };
    setAnswers(updated);
    sessionStorage.setItem('ws_answers', JSON.stringify(updated));
  };

  const saveProgress = (currentAnswers: Answers) => {
    // Fire-and-forget: saves in background without blocking UI
    setDoc(doc(db, 'responses', getSessionId()), {
      name, answers: currentAnswers, partial: true,
    }, { merge: true }).catch(console.error);
  };

  const advanceSlide = (currentAnswers: Answers) => {
    saveProgress(currentAnswers);
    const next = slideIndex + 1;
    setSlideIndex(next);
    sessionStorage.setItem('ws_slide', String(next));
    setShowPin(false);
    setPinError('');
    setShowingRecap(false);
    window.scrollTo(0, 0);
  };

  const handlePinSubmit = (pin: string) => {
    if (pin === slides[slideIndex].pin) {
      setShowPin(false);
      setPinError('');
      if (slides[slideIndex].showRecap) {
        saveProgress(answers);
        setShowingRecap(true);
        window.scrollTo(0, 0);
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
    try {
      await setDoc(doc(db, 'responses', getSessionId()), {
        name, answers, partial: false, submittedAt: serverTimestamp(),
      }, { merge: true });
      sessionStorage.setItem('ws_summary_answers', JSON.stringify(answers));
      sessionStorage.setItem('ws_summary_name', name || '');
      sessionStorage.removeItem('ws_slide');
      sessionStorage.removeItem('ws_answers');
      sessionStorage.removeItem('ws_name');
      sessionStorage.removeItem('ws_session_id');
      navigate('/summary');
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setSubmitError('Errore durante l\'invio. Riprova.');
    }
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

  return (
    <div className="ws-slide-page">
      <div className="ws-slide-progress">
        <div className="ws-slide-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ws-slide-inner">
        <div className="ws-slide-header">
          <span className="ws-slide-counter">Slide {slideIndex + 1} di {slides.length}</span>
          <h1 className="ws-slide-title">{slide.title}</h1>
        </div>

        <div className="ws-slide-content">
          {slide.elements.map(el => {
            if (el.type === 'info') return <InfoEl key={el.id} element={el} />;
            if (el.type === 'question') return (
              <QuestionEl key={el.id} element={el} value={answers[el.id]} onChange={v => setAnswer(el.id, v)} />
            );
            if (el.type === 'configurator') return (
              <ConfiguratorEl key={el.id} element={el} value={answers[el.id] as ConfigAnswer | undefined} onChange={v => setAnswer(el.id, v)} />
            );
            return null;
          })}
        </div>

        <div className="ws-slide-nav">
          {!isLast ? (
            <button className="ws-btn ws-btn-primary ws-btn-full" onClick={() => setShowPin(true)}>
              Avanti →
            </button>
          ) : (
            <>
              {submitError && <p className="ws-error-msg" style={{ marginBottom: 8 }}>{submitError}</p>}
              <button className="ws-btn ws-btn-success ws-btn-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Invio...' : 'Invia e vedi il riepilogo ✓'}
              </button>
            </>
          )}
        </div>
      </div>

      {showPin && (
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
