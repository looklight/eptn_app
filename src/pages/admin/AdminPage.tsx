import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Slide } from '../../types';
import WorkshopTab from './WorkshopTab';
import SlidesTab from './SlidesTab';
import ResultsTab from './ResultsTab';

const AdminPage: React.FC = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ep_admin_auth') === '1');
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState<'workshop' | 'slides' | 'results'>('workshop');
  const [slides, setSlides] = useState<Slide[]>([]);

  useEffect(() => {
    if (!authed) return;
    const q = query(collection(db, 'slides'), orderBy('order'));
    return onSnapshot(q, snap =>
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)))
    );
  }, [authed]);

  const login = () => {
    if (pw === 'password') {
      sessionStorage.setItem('ep_admin_auth', '1');
      setAuthed(true);
    } else {
      setPwError('Password errata.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('ep_admin_auth');
    setAuthed(false);
    setPw('');
  };

  if (!authed) {
    return (
      <div className="ws-page-center">
        <div className="ws-card ws-login-card">
          <h2 className="ws-login-title">Admin Login</h2>
          <input
            className="ws-field"
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(''); }}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          {pwError && <p className="ws-error-msg">{pwError}</p>}
          <button className="ws-btn ws-btn-primary" onClick={login} style={{ marginTop: 12 }}>
            Accedi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-admin-page">
      <div className="ws-admin-header">
        <h1 className="ws-admin-title">Admin</h1>
        <button className="ws-btn ws-btn-secondary ws-btn-sm"
          onClick={() => window.open('/present', '_blank')}>
          ▶ Presentatore
        </button>
        <button className="ws-btn ws-btn-secondary ws-btn-sm" onClick={logout}>Esci</button>
      </div>

      <div className="ws-tabs">
        <button className={`ws-tab-btn${tab === 'workshop' ? ' active' : ''}`} onClick={() => setTab('workshop')}>
          Workshop
        </button>
        <button className={`ws-tab-btn${tab === 'slides' ? ' active' : ''}`} onClick={() => setTab('slides')}>
          Slide ({slides.length})
        </button>
        <button className={`ws-tab-btn${tab === 'results' ? ' active' : ''}`} onClick={() => setTab('results')}>
          Risultati
        </button>
      </div>

      <div className="ws-tab-content">
        {tab === 'workshop' && <WorkshopTab />}
        {tab === 'slides' && <SlidesTab slides={slides} />}
        {tab === 'results' && <ResultsTab slides={slides} />}
      </div>
    </div>
  );
};

export default AdminPage;
