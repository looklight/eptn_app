import React, { useState, useEffect, useCallback } from 'react';
import { Play, Eye } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Slide } from '../../types';
import WorkshopTab from './WorkshopTab';
import SlidesTab from './SlidesTab';
import ResultsTab from './ResultsTab';
import { useTopBarSlot } from '../../components/TopBarContext';

const AdminPage: React.FC = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ep_admin_auth') === '1');
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState<'workshop' | 'slides' | 'results'>('workshop');
  const [slides, setSlides] = useState<Slide[]>([]);
  const setSlot = useTopBarSlot();

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

  const logout = useCallback(() => {
    sessionStorage.removeItem('ep_admin_auth');
    setAuthed(false);
    setPw('');
  }, []);

  useEffect(() => {
    if (!authed) {
      setSlot(null);
      return;
    }
    setSlot(
      <>
        <span className="topbar-admin-sep" />
        <div className="topbar-admin-tabs">
          <button className={`topbar-admin-tab${tab === 'workshop' ? ' active' : ''}`} onClick={() => setTab('workshop')}>
            Workshop
          </button>
          <button className={`topbar-admin-tab${tab === 'slides' ? ' active' : ''}`} onClick={() => setTab('slides')}>
            Slide ({slides.length})
          </button>
          <button className={`topbar-admin-tab${tab === 'results' ? ' active' : ''}`} onClick={() => setTab('results')}>
            Risultati
          </button>
        </div>
        <div className="topbar-admin-actions">
          <button className="topbar-admin-btn" onClick={() => window.open('/slide?preview=1', '_blank')}>
            <Eye size={12} /> Anteprima
          </button>
          <button className="topbar-admin-btn" onClick={() => window.open('/present', '_blank')}>
            <Play size={12} /> Presentatore
          </button>
          <button className="topbar-admin-btn" onClick={logout}>Esci</button>
        </div>
      </>
    );
    return () => setSlot(null);
  }, [authed, tab, slides.length, logout, setSlot]);

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
      <div className="ws-tab-content">
        {tab === 'workshop' && <WorkshopTab />}
        {tab === 'slides' && <SlidesTab slides={slides} />}
        {tab === 'results' && <ResultsTab slides={slides} />}
      </div>
    </div>
  );
};

export default AdminPage;
