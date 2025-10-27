import React from 'react';

type Props = { title?: string; subtitle?: string; user?: string };

export const Header: React.FC<Props> = ({ title, subtitle, user }) => {
  return (
    <header style={{ textAlign: 'center', marginBottom: 20 }}>
      <div className="siemens-logo"><h1>SIEMENS</h1></div>
      {user ? <div className="user-greeting">👤 {user} - Siemens SI-EP</div> : null}
      <h1>{title}</h1>
      {subtitle ? <p className="subtitle">{subtitle}</p> : null}
    </header>
  );
};

export default Header;
