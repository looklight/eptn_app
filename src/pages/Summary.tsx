import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { collection, getDocs, orderBy, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Slide, WorkshopResponse, QuizAnswer, QuizElement, RatingElement, RatingAnswer } from '../types';

const Summary: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [responses, setResponses] = useState<WorkshopResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const name = sessionStorage.getItem('ws_summary_name') || '';
  const sessionId = sessionStorage.getItem('ws_summary_session_id') || '';

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, 'slides'), orderBy('order'));
      const snap = await getDocs(q);
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)));
      setLoading(false);
    };
    load();
    return onSnapshot(collection(db, 'responses'), snap =>
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopResponse)))
    );
  }, []);

  if (loading) return <div className="ws-page-center"><p style={{ color: 'var(--ws-muted)' }}>Caricamento...</p></div>;

  const sorted = [...slides].sort((a, b) => a.order - b.order);

  // Leaderboard quiz
  const quizBySlide = sorted
    .map(s => s.elements.filter(e => e.type === 'quiz') as QuizElement[])
    .filter(qs => qs.length > 0);
  const hasQuizzes = quizBySlide.length > 0;
  const totalQuizCount = quizBySlide.reduce((sum, qs) => sum + qs.length, 0);
  const allQuizIds = new Set(quizBySlide.flat().map(q => q.id));

  type Entry = { name: string; id: string; numCorrect: number; totalMs: number };
  const entries: Entry[] = responses
    .filter(r => [...allQuizIds].some(id => r.answers?.[id] !== undefined))
    .map(r => {
      let numCorrect = 0;
      let totalMs = 0;
      quizBySlide.forEach(quizEls => {
        let slideMaxMs = 0;
        quizEls.forEach(q => {
          const qa = r.answers?.[q.id] as QuizAnswer | undefined;
          if (qa && typeof qa === 'object' && 'responseTimeMs' in qa) {
            if (qa.answer === q.correctAnswer) {
              numCorrect++;
              slideMaxMs = Math.max(slideMaxMs, qa.responseTimeMs);
            }
          }
        });
        totalMs += slideMaxMs;
      });
      return { name: r.name, id: r.id, numCorrect, totalMs };
    })
    .sort((a, b) => b.numCorrect - a.numCorrect || a.totalMs - b.totalMs);

  const myRank = entries.findIndex(e => e.id === sessionId) + 1;
  const myEntry = entries.find(e => e.id === sessionId);

  return (
    <div className="ws-summary-page">
      <div className="ws-summary-header">
        <div className="ws-thankyou-icon"><Check size={30} strokeWidth={2.5} /></div>
        <h1 className="ws-title">Grazie, <strong>{name}</strong>!</h1>
        <div className="ws-thankyou-bar" />
        <p className="ws-subtitle">Hai completato il workshop.</p>
      </div>

      {/* Rating comparison */}
      {(() => {
        const myResponse = responses.find(r => r.id === sessionId);
        const completeResponses = responses.filter(r => !r.partial);
        const ratingBlocks: React.ReactNode[] = [];

        sorted.forEach(slide => {
          slide.elements.forEach(el => {
            if (el.type !== 'rating') return;
            const ratingEl = el as RatingElement;
            if (!ratingEl.showSummary) return;

            const myRa = myResponse?.answers?.[el.id] as RatingAnswer | undefined;
            const myScores = ratingEl.categories.map(c => myRa?.[c.id] ?? 0).filter(s => s > 0);
            const myAvg = myScores.length > 0 ? myScores.reduce((a, b) => a + b, 0) / myScores.length : 0;

            ratingBlocks.push(
              <div key={el.id} className="ws-summary-rating-card">
                <div className="ws-summary-rating-header">
                  <span className="ws-summary-rating-slide">{slide.title}</span>
                  {ratingEl.title && <span className="ws-summary-rating-subtitle">{ratingEl.title}</span>}
                </div>
                {ratingEl.categories.map(cat => {
                  const myStars = myRa?.[cat.id] ?? 0;
                  const groupScores = completeResponses
                    .map(r => (r.answers?.[el.id] as RatingAnswer)?.[cat.id])
                    .filter((v): v is number => typeof v === 'number' && v > 0);
                  const groupAvg = groupScores.length > 0
                    ? groupScores.reduce((a, b) => a + b, 0) / groupScores.length
                    : 0;
                  return (
                    <div key={cat.id} className="ws-summary-rating-row">
                      <span className="ws-summary-rating-cat">{cat.label}</span>
                      {myRa && (
                        <span className="ws-summary-rating-mine" style={{ color: '#f59e0b' }}>
                          {'★'.repeat(myStars)}{'☆'.repeat(5 - myStars)}
                        </span>
                      )}
                      {groupAvg > 0 && (
                        <span className="ws-summary-rating-group">
                          media gruppo: <strong>{groupAvg.toFixed(1)}</strong>
                        </span>
                      )}
                    </div>
                  );
                })}
                {myAvg > 0 && (
                  <div className="ws-summary-rating-footer">
                    La tua media: <strong style={{ color: '#f59e0b' }}>{myAvg.toFixed(1)} / 5</strong>
                    {(() => {
                      const allGroupScores = ratingEl.categories.flatMap(cat =>
                        completeResponses
                          .map(r => (r.answers?.[el.id] as RatingAnswer)?.[cat.id])
                          .filter((v): v is number => typeof v === 'number' && v > 0)
                      );
                      const groupOverallAvg = allGroupScores.length > 0
                        ? allGroupScores.reduce((a, b) => a + b, 0) / allGroupScores.length
                        : 0;
                      return groupOverallAvg > 0
                        ? <> · Media gruppo: <strong>{groupOverallAvg.toFixed(1)} / 5</strong></>
                        : null;
                    })()}
                  </div>
                )}
              </div>
            );
          });
        });

        return ratingBlocks.length > 0 ? (
          <div className="ws-summary-ratings">
            <h2 className="ws-summary-lb-title">Valutazioni</h2>
            {ratingBlocks}
          </div>
        ) : null;
      })()}

      {hasQuizzes && (
        <div className="ws-summary-leaderboard">
          <h2 className="ws-summary-lb-title">🏆 Classifica finale</h2>
          {myEntry && (
            <p className="ws-summary-lb-sub">
              {myEntry.numCorrect === totalQuizCount
                ? `Perfetto! Sei al ${myRank}° posto`
                : `${myEntry.numCorrect}/${totalQuizCount} risposte corrette · ${myRank}° posto`}
            </p>
          )}
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
                Nessun risultato disponibile
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;
