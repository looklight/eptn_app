import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Workshop } from '../types';

const Landing: React.FC = () => {
  const [name, setName] = useState('');
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return onSnapshot(doc(db, 'workshop', 'config'), snap => {
      setWorkshop(snap.exists() ? (snap.data() as Workshop) : { name: 'EP Workshop', isActive: false });
    });
  }, []);

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    sessionStorage.removeItem('ws_slide');
    sessionStorage.removeItem('ws_answers');
    sessionStorage.removeItem('ws_name');
    sessionStorage.removeItem('ws_session_id');
    sessionStorage.setItem('ws_name', trimmed);
    sessionStorage.setItem('ws_slide', '0');
    sessionStorage.setItem('ws_answers', '{}');
    navigate('/slide');
  };

  return (
    <div className="ws-page-center">
      <div className="ws-card">
        <div className="ws-mark">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="4" width="8" height="8" rx="1" fill="white" />
            <rect x="16" y="4" width="8" height="8" rx="1" fill="white" opacity="0.6" />
            <rect x="4" y="16" width="8" height="8" rx="1" fill="white" opacity="0.6" />
            <rect x="16" y="16" width="8" height="8" rx="1" fill="white" />
          </svg>
        </div>
        <h1 className="ws-title">{workshop?.name || 'EP Workshop'}</h1>
        {!workshop?.isActive ? (
          <p className="ws-subtitle">Il workshop non è ancora iniziato.<br />Attendi le istruzioni del facilitatore.</p>
        ) : (
          <>
            <p className="ws-subtitle">Inserisci il tuo nome per partecipare</p>
            <input
              className="ws-field"
              type="text"
              placeholder="Nome e cognome"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              autoFocus
            />
            <button className="ws-btn ws-btn-primary ws-btn-full" onClick={handleStart} disabled={!name.trim()}>
              Partecipa →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Landing;
