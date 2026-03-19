import React from 'react';
import type { InfoElement } from '../../types';

const InfoEl: React.FC<{ element: InfoElement }> = ({ element }) => (
  <div className="ws-el-info">
<p className="ws-el-info-content">{element.content}</p>
  </div>
);

export default InfoEl;
