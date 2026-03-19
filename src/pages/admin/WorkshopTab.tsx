import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Check, Download } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import { db } from '../../firebase';
import type { Workshop } from '../../types';

const WorkshopTab: React.FC = () => {
  const [workshop, setWorkshop] = useState<Workshop>({ name: 'EP Workshop', isActive: false });
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qr-workshop.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    return onSnapshot(doc(db, 'workshop', 'config'), snap => {
      if (snap.exists()) setWorkshop(snap.data() as Workshop);
    });
  }, []);

  const saveName = async () => {
    setSavingName(true);
    await setDoc(doc(db, 'workshop', 'config'), { name: workshop.name }, { merge: true });
    setSavingName(false);
    setSavedName(true);
    setTimeout(() => setSavedName(false), 2000);
  };

  const toggleField = async (field: 'isActive' | 'showLobby', value: boolean) => {
    setWorkshop(prev => ({ ...prev, [field]: value }));
    await setDoc(doc(db, 'workshop', 'config'), { [field]: value }, { merge: true });
  };

  const url = window.location.origin + '/';

  return (
    <div>
      <div className="ws-add-card">
        <h3 className="ws-add-title">Impostazioni workshop</h3>

        <label className="ws-label">Nome workshop</label>
        <div className="ws-name-save-row">
          <input
            className="ws-field"
            type="text"
            value={workshop.name}
            onChange={e => setWorkshop({ ...workshop, name: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Es. EP Workshop Q1 2026"
          />
          <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={saveName} disabled={savingName}>
            {savedName ? <><Check size={13} /> Salvato</> : 'Salva'}
          </button>
        </div>

        <label className="ws-label">Stato accesso partecipanti</label>
        <div className="ws-toggle-row">
          <button
            className={`ws-toggle-btn ${workshop.isActive ? 'active' : ''}`}
            onClick={() => toggleField('isActive', !workshop.isActive)}
          >
            <span className="ws-toggle-dot" />
          </button>
          <span className="ws-toggle-label">
            {workshop.isActive
              ? <><CheckCircle2 size={14} /> Workshop attivo — i partecipanti possono accedere</>
              : <><Circle size={14} /> Workshop inattivo</>}
          </span>
        </div>
      </div>

      <div className="ws-add-card">
        <h3 className="ws-add-title">Link partecipanti</h3>
        <p className="ws-label" style={{ marginBottom: 10 }}>Condividi questo link durante il workshop:</p>
        <div className="ws-link-box">
          <span className="ws-link-text">{url}</span>
          <button className="ws-btn ws-btn-secondary ws-btn-sm" onClick={() => navigator.clipboard.writeText(url)}>
            Copia
          </button>
        </div>
        <div className="ws-qr-section">
          <QRCodeCanvas ref={qrRef} value={url} size={160} marginSize={2} />
          <button className="ws-btn ws-btn-secondary ws-btn-sm" onClick={downloadQR} style={{ marginTop: 12 }}>
            <Download size={13} /> Scarica PNG
          </button>
        </div>

        <div className="ws-lobby-toggle-section">
          <label className="ws-label">Schermata lobby iniziale</label>
          <div className="ws-toggle-row">
            <button
              className={`ws-toggle-btn ${(workshop.showLobby ?? true) ? 'active' : ''}`}
              onClick={() => toggleField('showLobby', !(workshop.showLobby ?? true))}
            >
              <span className="ws-toggle-dot" />
            </button>
            <span className="ws-toggle-label">
              {(workshop.showLobby ?? true)
                ? <><CheckCircle2 size={14} /> Mostra QR e lobby prima delle slide</>
                : <><Circle size={14} /> Inizia direttamente dalla prima slide</>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopTab;
