import React from 'react';
import type { ConfiguratorElement, ConfigCategory, ConfigProduct } from '../../../types';
import { X } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

const ConfiguratorEditor: React.FC<{ element: ConfiguratorElement; onChange: (el: ConfiguratorElement) => void }> = ({ element, onChange }) => {
  const updateCat = (catId: string, update: Partial<ConfigCategory>) =>
    onChange({ ...element, categories: element.categories.map(c => c.id === catId ? { ...c, ...update } : c) });

  const updateProd = (catId: string, prodId: string, update: Partial<ConfigProduct>) => {
    const cat = element.categories.find(c => c.id === catId);
    if (!cat) return;
    updateCat(catId, { products: cat.products.map(p => p.id === prodId ? { ...p, ...update } : p) });
  };

  return (
    <div className="ws-el-editor">
      <label className="ws-label">Titolo configuratore</label>
      <input className="ws-field" type="text" value={element.title} placeholder="Es. Seleziona la tua soluzione"
        onChange={e => onChange({ ...element, title: e.target.value })} />

      {element.categories.length > 0 && <label className="ws-label" style={{ marginTop: 4 }}>Categorie</label>}
      {element.categories.map((cat, ci) => (
        <div key={cat.id} className="ws-config-cat-editor">
          <div className="ws-config-cat-header">
            <span className="ws-config-cat-num">{ci + 1}</span>
            <input className="ws-field" type="text" value={cat.label} placeholder="Nome categoria"
              onChange={e => updateCat(cat.id, { label: e.target.value })} />
            <button className="ws-icon-btn" title="Elimina categoria"
              onClick={() => onChange({ ...element, categories: element.categories.filter(c => c.id !== cat.id) })}><X size={14} /></button>
          </div>
          <div className="ws-products-editor">
            {cat.products.map(prod => (
              <div key={prod.id} className="ws-product-editor">
                <div className="ws-product-editor-row">
                  <input className="ws-field ws-product-icon-field" type="text" value={prod.icon || ''} placeholder="🔌"
                    onChange={e => updateProd(cat.id, prod.id, { icon: e.target.value })} />
                  <input className="ws-field" type="text" value={prod.name} placeholder="Nome prodotto"
                    onChange={e => updateProd(cat.id, prod.id, { name: e.target.value })} style={{ flex: 2 }} />
                  <input className="ws-field ws-product-price-field" type="number" value={prod.price ?? ''} placeholder="€"
                    onChange={e => updateProd(cat.id, prod.id, { price: Number(e.target.value) })} />
                  <button className="ws-icon-btn" title="Elimina prodotto"
                    onClick={() => updateCat(cat.id, { products: cat.products.filter(p => p.id !== prod.id) })}><X size={14} /></button>
                </div>
                <div className="ws-product-editor-details">
                  <input className="ws-field" type="text" value={prod.description} placeholder="Descrizione"
                    onChange={e => updateProd(cat.id, prod.id, { description: e.target.value })} />
                  <input className="ws-field" type="text" value={prod.specs || ''} placeholder="Specifiche (opzionale)"
                    onChange={e => updateProd(cat.id, prod.id, { specs: e.target.value })} />
                </div>
              </div>
            ))}
            <button className="ws-add-option-link" onClick={() =>
              updateCat(cat.id, { products: [...cat.products, { id: uid(), name: '', description: '', specs: '', price: 0, icon: '⚡' }] })
            }>+ Aggiungi prodotto</button>
          </div>
        </div>
      ))}
      <button className="ws-add-cat-btn"
        onClick={() => onChange({ ...element, categories: [...element.categories, { id: uid(), label: '', products: [] }] })}>
        + Aggiungi categoria
      </button>
    </div>
  );
};

export default ConfiguratorEditor;
