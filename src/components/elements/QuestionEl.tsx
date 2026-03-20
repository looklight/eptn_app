import React from 'react';
import type { QuestionElement, AnswerValue } from '../../types';

type Props = {
  element: QuestionElement;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
};

const QuestionEl: React.FC<Props> = ({ element, value, onChange }) => {
  const selected = Array.isArray(value) ? value as string[] : [];
  const toggleMulti = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next);
  };

  return (
  <div className="ws-el-question">
    <h3 className="ws-question">{element.text}</h3>

    {element.questionType === 'multiple_choice' && (
      <div className="ws-options">
        {(element.options || []).map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = element.multipleSelect ? selected.includes(opt) : value === opt;
          return (
            <button key={`opt-${i}-${opt}`}
              className={`ws-option-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => element.multipleSelect ? toggleMulti(opt) : onChange(opt)}>
              <span className="ws-option-letter">{letter}</span>
              {opt}
            </button>
          );
        })}
      </div>
    )}

    {element.questionType === 'scale' && element.scaleMin !== undefined && element.scaleMax !== undefined && (
      <div className="ws-scale">
        <div className="ws-scale-labels"><span>{element.scaleMin}</span><span>{element.scaleMax}</span></div>
        <div className="ws-scale-buttons">
          {Array.from({ length: element.scaleMax - element.scaleMin + 1 }, (_, i) => i + element.scaleMin!).map(n => (
            <button key={n} className={`ws-scale-btn ${value === n ? 'selected' : ''}`} onClick={() => onChange(n)}>{n}</button>
          ))}
        </div>
      </div>
    )}

    {element.questionType === 'text' && (
      <textarea
        className="ws-field ws-textarea"
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Scrivi qui la tua risposta..."
        rows={4}
      />
    )}

    {element.questionType === 'yes_no' && (
      <div className="ws-yes-no">
        <button className={`ws-yes-no-btn ws-yes ${value === true ? 'selected' : ''}`} onClick={() => onChange(true)}>Sì</button>
        <button className={`ws-yes-no-btn ws-no ${value === false ? 'selected' : ''}`} onClick={() => onChange(false)}>No</button>
      </div>
    )}
  </div>
  );
};

export default QuestionEl;
