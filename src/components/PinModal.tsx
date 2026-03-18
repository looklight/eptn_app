import React, { useState, useRef, useEffect } from 'react';

type Props = {
  onConfirm: (pin: string) => void;
  onClose: () => void;
  error: string;
};

const PinModal: React.FC<Props> = ({ onConfirm, onClose, error }) => {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => { if (pin.trim()) onConfirm(pin.trim()); };

  return (
    <div className="ws-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ws-modal">
        <h2 className="ws-modal-title">Inserisci il PIN</h2>
        <p className="ws-modal-sub">Chiedi il codice al facilitatore per avanzare</p>
        <input
          ref={inputRef}
          className="ws-field ws-pin-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="•••"
          maxLength={6}
        />
        {error && <p className="ws-field-error">{error}</p>}
        <div className="ws-modal-actions">
          <button className="ws-btn ws-btn-secondary" onClick={onClose}>Annulla</button>
          <button className="ws-btn ws-btn-primary" onClick={handleSubmit} disabled={!pin.trim()}>
            Conferma →
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
