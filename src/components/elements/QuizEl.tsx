import React, { useState, useEffect, useRef } from 'react';
import type { QuizElement, QuizAnswer } from '../../types';

type Props = {
  element: QuizElement;
  value: QuizAnswer | undefined;
  onChange: (v: QuizAnswer) => void;
};

const QuizEl: React.FC<Props> = ({ element, value, onChange }) => {
  const startTimeRef = useRef<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number | null>(element.timeLimit ?? null);
  const answered = value !== undefined;

  useEffect(() => {
    startTimeRef.current = Date.now();
    if (!element.timeLimit) { setTimeLeft(null); return; }
    setTimeLeft(element.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [element.id, element.timeLimit]);

  const timesUp = timeLeft === 0 && !answered;

  const handleAnswer = (idx: number) => {
    if (answered || timesUp) return;
    onChange({ answer: idx, responseTimeMs: Date.now() - startTimeRef.current });
  };

  const getOptionClass = (idx: number) => {
    if (!answered && !timesUp) return 'ws-quiz-option';
    if (idx === element.correctAnswer) return 'ws-quiz-option ws-quiz-option--correct';
    if (answered && idx === value!.answer) return 'ws-quiz-option ws-quiz-option--wrong';
    return 'ws-quiz-option ws-quiz-option--dim';
  };

  const timerPct = timeLeft !== null && element.timeLimit
    ? (timeLeft / element.timeLimit) * 100
    : 0;

  return (
    <div className="ws-el-quiz">
      {element.timeLimit !== undefined && (
        <div className="ws-quiz-timer">
          <div
            className={`ws-quiz-timer-bar${timeLeft === 0 ? ' ws-quiz-timer-bar--empty' : ''}`}
            style={{ width: answered ? '0%' : `${timerPct}%` }}
          />
          {timeLeft !== null && !answered && (
            <span className="ws-quiz-timer-num">{timeLeft}s</span>
          )}
        </div>
      )}
      <p className="ws-el-quiz-question">{element.text}</p>
      <div className="ws-quiz-options">
        {element.options.map((opt, i) => (
          <button
            key={i}
            className={getOptionClass(i)}
            onClick={() => handleAnswer(i)}
            disabled={answered || timeLeft === 0}
          >
            <span className="ws-quiz-option-letter">{String.fromCharCode(65 + i)}</span>
            <span className="ws-quiz-option-text">{opt}</span>
          </button>
        ))}
      </div>
      {(answered || timesUp) && (
        <p className={`ws-quiz-feedback${answered && value!.answer === element.correctAnswer ? ' ws-quiz-feedback--correct' : ' ws-quiz-feedback--wrong'}`}>
          {timesUp
            ? `⏱ Tempo scaduto — la risposta corretta era: ${element.options[element.correctAnswer]}`
            : value!.answer === element.correctAnswer
              ? `✓ Corretto! (${(value!.responseTimeMs / 1000).toFixed(1)}s)`
              : `✗ Sbagliato — la risposta corretta era: ${element.options[element.correctAnswer]}`}
        </p>
      )}
    </div>
  );
};

export default QuizEl;
