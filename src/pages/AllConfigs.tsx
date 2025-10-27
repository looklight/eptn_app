import React from 'react';

const AllConfigs: React.FC = () => {
  return (
    <div className="container">
      <div className="siemens-logo"><h1>SIEMENS</h1></div>
      <h1>👥 Team Configuration</h1>
      <p className="subtitle">Show all configured solutions</p>
      <div className="stats-bar">
        <div className="stat-card"><div className="stat-number">0</div><div className="stat-label">Total configuration</div></div>
        <div className="stat-card"><div className="stat-number">€0</div><div className="stat-label">Average Price</div></div>
      </div>
      <div className="loading">Caricamento configurazioni</div>
    </div>
  );
};

export default AllConfigs;
