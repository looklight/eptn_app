# Todo — Emotion app

## Completato

### Slide risultati ✓ (2026-03-25)
- [x] Tipo `ResultsElement` con `sourceElementIds: string[]` in `types.ts`
- [x] `ResultsEditor` in admin per selezionare rating/quiz sorgenti (checkbox multipli)
- [x] Vista utente in `SlidePage.tsx` — `ResultsElView` con accordion e medal ranking
- [x] Vista presenter in `Present.tsx` — card dedicate con classi `ws-present-results-*`
- [x] `flushRatingStats()` chiamata su `advanceSlide()` e auto-advance (non solo al submit finale)
- [x] Retrocompatibilità con documenti Firestore vecchi (`sourceElementId` → `sourceElementIds ?? []`)
- [x] Design: card con shadow, medaglie 🥇🥈🥉 per top 3, dropdown integrato, zebra rows

---

## Prossimo

<!-- nessuna task pianificata -->
