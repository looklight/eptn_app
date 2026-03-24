import React from 'react';
import type { Slide, QuizElement, CarouselElement, RatingElement } from '../../types';
import InfoEl from '../../components/elements/InfoEl';
import QuestionEl from '../../components/elements/QuestionEl';
import ConfiguratorEl from '../../components/elements/ConfiguratorEl';
import QuizEl from '../../components/elements/QuizEl';
import CarouselEl from '../../components/elements/CarouselEl';
import RatingEl from '../../components/elements/RatingEl';

const SlidePreview: React.FC<{ slide: Slide }> = ({ slide }) => (
  <div className="ws-preview-panel">
    <div className="ws-preview-label">Anteprima mobile</div>
    <div className="ws-phone-frame">
      <div className="ws-phone-notch">
        <div className="ws-phone-notch-pill" />
      </div>
      <div className="ws-phone-screen">
        <div className="ws-preview-scaler">
          <div className="ws-slide-progress">
            <div className="ws-slide-progress-fill" style={{ width: '40%' }} />
          </div>
          <div className="ws-slide-inner">
            <div className="ws-slide-header">
              <h1 className="ws-slide-title" style={!slide.title ? { opacity: 0.35, fontStyle: 'italic' } : undefined}>
                {slide.title || 'Titolo slide'}
              </h1>
            </div>
            <div className="ws-slide-content">
              {slide.imageUrl && (
                <div className="ws-slide-image-wrap">
                  <img src={slide.thumbnailUrl ?? slide.imageUrl} alt="" className="ws-slide-image" />
                </div>
              )}
              {slide.elements.length === 0 ? (
                <div className="ws-preview-empty">Nessun elemento ancora</div>
              ) : (
                slide.elements.map(el => {
                  if (el.type === 'info') return <InfoEl key={el.id} element={el} />;
                  if (el.type === 'question') return <QuestionEl key={el.id} element={el} value={undefined} onChange={() => {}} />;
                  if (el.type === 'configurator') return <ConfiguratorEl key={el.id} element={el} value={undefined} onChange={() => {}} />;
                  if (el.type === 'quiz') return <QuizEl key={el.id} element={el as QuizElement} value={undefined} onChange={() => {}} />;
                  if (el.type === 'carousel') return <CarouselEl key={el.id} element={el as CarouselElement} value={undefined} onChange={() => {}} />;
                  if (el.type === 'rating') return <RatingEl key={el.id} element={el as RatingElement} value={undefined} onChange={() => {}} />;
                  return null;
                })
              )}
            </div>
            <div className="ws-slide-nav">
              <button className="ws-btn ws-btn-primary ws-btn-full">Avanti →</button>
            </div>
          </div>
        </div>
      </div>
      <div className="ws-phone-home">
        <div className="ws-phone-home-bar" />
      </div>
    </div>
  </div>
);

export default SlidePreview;
