import React from 'react';

const TopBar: React.FC = () => (
  <nav className="topbar">
    <div className="topbar-inner">
      <span className="topbar-logo">
        <svg width="108" height="20" viewBox="0 0 108 20" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="16" fontFamily="'Segoe UI', sans-serif" fontSize="18" fontWeight="700" fill="white">Siemens</text>
        </svg>
      </span>
      <span className="topbar-divider" />
      <span className="topbar-title">EP Workshop</span>
    </div>
  </nav>
);

export default TopBar;
