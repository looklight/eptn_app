import React from 'react';
import type { InfoElement } from '../../../types';

const InfoEditor: React.FC<{ element: InfoElement; onChange: (el: InfoElement) => void }> = ({ element, onChange }) => (
  <div className="ws-el-editor">
    <label className="ws-label">Testo / contenuto</label>
    <textarea className="ws-field ws-textarea" rows={4} value={element.content}
      onChange={e => onChange({ ...element, content: e.target.value })}
      placeholder="Testo introduttivo, istruzioni, note..." />
  </div>
);

export default InfoEditor;
