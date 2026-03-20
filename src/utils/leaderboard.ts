import type { QuizElement, WorkshopResponse, QuizAnswer } from '../types';

export type LeaderboardEntry = {
  name: string;
  id: string;
  numCorrect: number;
  totalMs: number;
};

/**
 * Calcola la classifica partendo dai quiz delle slide e dalle risposte dei partecipanti.
 * Il tempo totale è la somma dei tempi massimi per slide (i timer sono indipendenti tra slide).
 */
export function buildLeaderboard(
  quizBySlide: QuizElement[][],
  responses: WorkshopResponse[],
): LeaderboardEntry[] {
  const allQuizIds = new Set(quizBySlide.flat().map(q => q.id));
  return responses
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
}
