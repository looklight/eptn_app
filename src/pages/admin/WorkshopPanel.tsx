import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Download, QrCode, CheckCircle2, Circle } from 'lucide-react';
import { db } from '../../firebase';
import type { Workshop } from '../../types';

const WorkshopPanel: React.FC = () => {
  const [workshop, setWorkshop] = useState<Workshop>({ name: 'EP Workshop', isActive: false });
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

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

  const toggleActive = async () => {
    const next = !workshop.isActive;
    setWorkshop(prev => ({ ...prev, isActive: next }));
    await setDoc(doc(db, 'workshop', 'config'), { isActive: next }, { merge: true });
  };

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qr-workshop.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const url = window.location.origin + '/';

  return (
    <div className="ws-nav-workshop">
      <span className="ws-slide-nav-label">Workshop</span>

      <div className="ws-nav-workshop-name-row">
        <input
          className="ws-field ws-nav-workshop-name-input"
          type="text"
          value={workshop.name}
          onChange={e => setWorkshop(prev => ({ ...prev, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && saveName()}
          placeholder="Nome workshop"
        />
        <button className="ws-btn ws-btn-primary ws-btn-sm ws-nav-workshop-save-btn" onClick={saveName} disabled={savingName}>
          {savedName ? <Check size={12} /> : 'Salva'}
        </button>
      </div>

      <div className="ws-nav-workshop-toggle-row">
        <button
          className={`ws-toggle-btn${workshop.isActive ? ' active' : ''}`}
          onClick={toggleActive}
        >
          <span className="ws-toggle-dot" />
        </button>
        <span className="ws-nav-workshop-toggle-label">
          {workshop.isActive
            ? <><CheckCircle2 size={12} /> Attivo</>
            : <><Circle size={12} /> Inattivo</>}
        </span>
        <button className="ws-btn ws-btn-secondary ws-btn-sm ws-nav-workshop-dl" onClick={downloadQR} title="Scarica QR code">
          <QrCode size={12} /><Download size={12} />
        </button>
      </div>

      <QRCodeCanvas ref={qrRef} value={url} size={96} marginSize={1} style={{ display: 'none' }} />
    </div>
  );
};

export default WorkshopPanel;
