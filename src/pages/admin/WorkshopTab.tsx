import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Check, Download } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import { db } from '../../firebase';
import type { Workshop } from '../../types';

const WorkshopTab: React.FC = () => {
  const [workshop, setWorkshop] = useState<Workshop>({ name: 'EP Workshop', isActive: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const save = async () => {
    setSaving(true);
    await setDoc(doc(db, 'workshop', 'config'), workshop);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const url = window.location.origin + '/';

  return (
    <div>
      <div className="ws-add-card">
        <h3 className="ws-add-title">Impostazioni workshop</h3>

        <label className="ws-label">Nome workshop</label>
        <input
          className="ws-field"
          type="text"
          value={workshop.name}
          onChange={e => setWorkshop({ ...workshop, name: e.target.value })}
          placeholder="Es. EP Workshop Q1 2026"
        />

        <label className="ws-label">Stato accesso partecipanti</label>
        <div className="ws-toggle-row">
          <button className={`ws-toggle-btn ${workshop.isActive ? 'active' : ''}`} onClick={() => setWorkshop({ ...workshop, isActive: !workshop.isActive })}>
            <span className="ws-toggle-dot" />
          </button>
          <span className="ws-toggle-label">
            {workshop.isActive
              ? <><CheckCircle2 size={14} /> Workshop attivo — i partecipanti possono accedere</>
              : <><Circle size={14} /> Workshop inattivo</>}
          </span>
        </div>

        <button className="ws-btn ws-btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Salvataggio...' : saved ? <><Check size={14} /> Salvato</> : 'Salva impostazioni'}
        </button>
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
      </div>
    </div>
  );
};

export default WorkshopTab;
