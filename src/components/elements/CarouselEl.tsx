import React, { useRef, useState } from 'react';
import { Check, ImageOff } from 'lucide-react';
import type { CarouselElement, CarouselAnswer } from '../../types';

type Props = {
  element: CarouselElement;
  value: CarouselAnswer | undefined;
  onChange: (v: CarouselAnswer) => void;
};

const CarouselEl: React.FC<Props> = ({ element, value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const select = (itemId: string) => {
    onChange(value === itemId ? null : itemId);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    // Se siamo alla fine dello scroll → ultimo dot
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) {
      setActiveIndex(element.items.length - 1);
      return;
    }
    const cardWidth = (track.children[0] as HTMLElement).offsetWidth + 12; // card + gap
    const index = Math.round(track.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(index, element.items.length - 1)));
  };

  return (
    <div className="ws-el-carousel">
      {element.title && <h3 className="ws-carousel-title">{element.title}</h3>}
      <div className="ws-carousel-track" ref={trackRef} onScroll={handleScroll}>
        {element.items.map(item => {
          const selected = value === item.id;
          return (
            <div
              key={item.id}
              className={`ws-carousel-card${selected ? ' selected' : ''}`}
              onClick={() => select(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && select(item.id)}
            >
              <div className="ws-carousel-card-img-wrap">
                {item.imageUrl ? (
                  <img src={item.thumbnailUrl ?? item.imageUrl} alt={item.title} className="ws-carousel-card-img" loading="lazy" />
                ) : (
                  <div className="ws-carousel-card-img-placeholder">
                    <ImageOff size={22} />
                  </div>
                )}
                {selected && (
                  <div className="ws-carousel-card-check">
                    <Check size={13} strokeWidth={2.5} />
                  </div>
                )}
              </div>
              <div className="ws-carousel-card-body">
                <div className="ws-carousel-card-title">{item.title}</div>
                {item.description && (
                  <div className="ws-carousel-card-desc">{item.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {element.items.length > 1 && (
        <div className="ws-carousel-dots">
          {element.items.map((_, i) => (
            <div key={i} className={`ws-carousel-dot${i === activeIndex ? ' active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CarouselEl;
