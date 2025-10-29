import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import { categoriesData } from '../data';

type Config = {
  id: string;
  userName: string;
  selections: Record<string, string | null>;
  totalPrice: number;
  createdAt: any;
};

const AllConfigs: React.FC = () => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const q = query(collection(db, "configs"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Config));
        setConfigs(data);
      } catch (error) {
        console.error(error);
        alert("Errore nel recupero delle configurazioni");
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const categoryOrder = ['category1', 'category2', 'category3', 'category4'];

  // Funzione per resettare tutte le configurazioni
  const handleResetAll = async () => {
    const password = prompt("Inserisci la password per resettare tutte le configurazioni:");
    if (password !== "1234") {
      alert("Password errata!");
      return;
    }

    if (!window.confirm("Sei sicuro di voler eliminare TUTTE le configurazioni? Questa azione non è reversibile.")) {
      return;
    }

    try {
      for (const c of configs) {
        await deleteDoc(doc(db, "configs", c.id));
      }
      setConfigs([]);
      alert("Tutte le configurazioni sono state eliminate.");
    } catch (error) {
      console.error(error);
      alert("Errore durante l'eliminazione delle configurazioni.");
    }
  };

  return (
    <div className="container">
      <Header title="👥 Team Configurations" subtitle="Overview of all selections" />
      {loading ? (
        <div className="loading">Caricamento configurazioni...</div>
      ) : configs.length === 0 ? (
        <p className="no-configs">Nessuna configurazione salvata.</p>
      ) : (
        <div className="configs-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {configs.map(c => (
            <div key={c.id} className="summary-box" style={{ padding: '15px' }}>
              {/* Nome utente + totale */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '1rem', margin: 0 }}>{c.userName}</h4>
                <span style={{ fontSize: '0.9rem', color: '#009999', fontWeight: 600 }}>€{c.totalPrice}</span>
              </div>

              {/* Scelte */}
              <div className="categories-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {categoryOrder.map(catKey => {
                  const selId = c.selections[catKey];
                  if (!selId) return null;

                  const catCategory = categoriesData[catKey];
                  if (!catCategory) return null;

                  const cat = catCategory.find(item => item.id === selId);
                  if (!cat) return null;

                  return (
                    <div
                      key={cat.id}
                      className="category-card selected"
                      style={{
                        flex: '1 1 110px',
                        minWidth: '110px',
                        padding: '6px',
                        fontSize: '0.75rem',
                        textAlign: 'center',
                        lineHeight: '1.1',
                        overflow: 'hidden',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start'
                      }}
                    >
                      {/* Nome della scelta */}
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '4px'
                      }}>{cat.name}</span>

                      {/* Emoji */}
                      <div style={{ fontSize: '1.2rem', lineHeight: '1.1' }}>{cat.icon}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pulsante Reset */}
      {configs.length > 0 && (
        <button
          onClick={handleResetAll}
          style={{
            marginTop: '30px',
            backgroundColor: '#ff4d4f',
            color: 'white',
            fontWeight: 600,
            padding: '12px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Reset All Configurations
        </button>
      )}
    </div>
  );
};

export default AllConfigs;