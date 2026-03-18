import React from 'react';
import type { QuestionElement, AnswerValue } from '../../types';

type Props = {
  element: QuestionElement;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
};

const QuestionEl: React.FC<Props> = ({ element, value, onChange }) => (
  <div className="ws-el-question">
    <h3 className="ws-question">{element.text}</h3>

    {element.questionType === 'multiple_choice' && (
      <div className="ws-options">
        {(element.options || []).map((opt, i) => (
          <button key={i} className={`ws-option-btn ${value === opt ? 'selected' : ''}`} onClick={() => onChange(opt)}>
            {opt}
          </button>
        ))}
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

export default QuestionEl;
