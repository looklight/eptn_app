import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Header from '../components/Header';
import CategoryGrid from '../components/CategoryGrid';
import { categoriesData } from '../data';
import type { CategoriesData } from '../types';

type Selections = Record<string, string | null>;

const Home: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [selections, setSelections] = useState<Selections>({
    category1: null,
    category2: null,
    category3: null,
    category4: null
  });
  const [screen, setScreen] = useState<'login'|'select'|'summary'>('login');
  const navigate = useNavigate();

  const handleStart = () => {
    if (!userName.trim()) { alert('Inserisci il nome'); return; }
    setScreen('select');
  };

  const handleSelect = (categoryKey: string, id: string) => {
    setSelections(prev => ({ ...prev, [categoryKey]: prev[categoryKey] === id ? null : id }));
  };

  const showSummary = () => {
    const selectedCount = Object.values(selections).filter(v => v !== null).length;
    if (selectedCount === 0) { alert('⚠️ Choose one before to proceed!'); return; }
    setScreen('summary');
  };

  const reset = () => {
    setUserName('');
    setSelections({ category1:null, category2:null, category3:null, category4:null });
    setScreen('login');
  };

  const totalPrice = Object.keys(selections).reduce((acc, key) => {
    const id = selections[key];
    if (!id) return acc;
    const item = (categoriesData as CategoriesData)[key].find(i => i.id === id);
    return acc + (item?.price ?? 0);
  }, 0);

  const saveConfig = async () => {
    if (!userName.trim()) { alert('Inserisci il nome'); return; }

    await addDoc(collection(db, "configs"), {
      userName,
      selections,
      totalPrice,
      createdAt: serverTimestamp()
    });

    alert('✓ Configurazione salvata con successo!');
    navigate('/all-configs'); // vai alla schermata delle configurazioni salvate
  };

  return (
    <div className="container">
      {screen === 'login' && (
        <div className="screen active">
          <Header title="Welcome!" subtitle="Add your name to start the configuration" />
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <div className="welcome-icon">⚡</div>
            <div style={{ maxWidth: 400, margin: '20px auto' }}>
              <label htmlFor="userName">User Name</label>
              <input id="userName" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Add your name..." />
              <button className="btn-primary" onClick={handleStart} style={{ marginTop: 10 }}>Start the configuration →</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'select' && (
        <div className="screen active">
          <Header title="Low Voltage selection tool" subtitle="Choose the best components for your applications" user={userName} />
          <section className="section-header"><h2>⚡️ Main Circuit Breaker</h2></section>
          <CategoryGrid categoryKey="category1" products={categoriesData.category1} selectedId={selections.category1} onSelect={handleSelect} />

          <section className="section-header"><h2>⚙️ Big Motor Starter</h2></section>
          <CategoryGrid categoryKey="category2" products={categoriesData.category2} selectedId={selections.category2} onSelect={handleSelect} />

          <section className="section-header"><h2>⚙️ Small Motor Starter (10 motors)</h2></section>
          <CategoryGrid categoryKey="category3" products={categoriesData.category3} selectedId={selections.category3} onSelect={handleSelect} />

          <section className="section-header"><h2>🔧 Supervision System</h2></section>
          <CategoryGrid categoryKey="category4" products={categoriesData.category4} selectedId={selections.category4} onSelect={handleSelect} />

          <div className="navigation-buttons">
            <button className="btn-secondary" onClick={reset}>← Change User</button>
            <button className="btn-primary" onClick={showSummary}>Show recap →</button>
          </div>
        </div>
      )}

      {screen === 'summary' && (
        <div className="screen active">
          <Header title="📋 Configuration summary" subtitle="Check your solution" user={userName} />
          <div className="summary-box">
            {Object.keys(selections).map((key) => {
              const id = selections[key];
              if (!id) return null;
              const item = (categoriesData as CategoriesData)[key].find(i => i.id === id);
              if (!item) return null;
              return (
                <div key={key} className="summary-item">
                  <div className="summary-item-info">
                    <div className="summary-icon">{item.icon}</div>
                    <div className="summary-details">
                      <h4>{item.description}</h4>
                      <div className="product-code">{item.name}</div>
                      <p>{item.specs}</p>
                    </div>
                  </div>
                  <div className="summary-price">€{item.price}</div>
                </div>
              );
            })}
            <div className="total-box">
              <h3>💰 Total</h3>
              <div className="total-amount">€{totalPrice}</div>
            </div>
          </div>

          <div className="navigation-buttons">
            <button className="btn-secondary" onClick={() => setScreen('select')}>← Change selection</button>
            <button className="btn-primary" onClick={saveConfig}>✓ Save configuration</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;