import React from 'react';
import { Check } from 'lucide-react';
import type { ConfiguratorElement, ConfigAnswer } from '../../types';

type Props = {
  element: ConfiguratorElement;
  value: ConfigAnswer | undefined;
  onChange: (v: ConfigAnswer) => void;
};

const ConfiguratorEl: React.FC<Props> = ({ element, value = {}, onChange }) => {
  const select = (catId: string, prodId: string) => {
    onChange({ ...value, [catId]: value[catId] === prodId ? null : prodId });
  };

  return (
    <div className="ws-el-configurator">
      {element.title && <h3 className="ws-config-title">{element.title}</h3>}
      {element.categories.map(cat => (
        <div key={cat.id} className="ws-config-cat">
          <h4 className="ws-config-cat-label">{cat.label}</h4>
          <div className="ws-config-products">
            {cat.products.map(prod => {
              const selected = value[cat.id] === prod.id;
              return (
                <div key={prod.id} className={`ws-config-product ${selected ? 'selected' : ''}`} onClick={() => select(cat.id, prod.id)}>
                  <div className="ws-config-product-check">{selected && <Check size={13} strokeWidth={2.5} />}</div>
                  {prod.icon && <div className="ws-config-product-icon">{prod.icon}</div>}
                  <div className="ws-config-product-info">
                    <div className="ws-config-product-name">{prod.name}</div>
                    {prod.description && <div className="ws-config-product-desc">{prod.description}</div>}
                    {prod.specs && <div className="ws-config-product-specs">{prod.specs}</div>}
                    {prod.price !== undefined && prod.price > 0 && (
                      <div className="ws-config-product-price">€{prod.price}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConfiguratorEl;
