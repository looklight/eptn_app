# EPTN - React + TypeScript Conversion

This is a Vite + React + TypeScript conversion of the original `EPTN_App.html`.

## Quick start

1. Copy `.env.example` to `.env` and fill Firebase values.
2. Install deps:
   ```
   npm install
   ```
3. Dev server:
   ```
   npm run dev
   ```
4. Build for production:
   ```
   npm run build
   ```
5. Deploy to Netlify: set build command `npm run build` and publish directory `dist`.
   Add a `_redirects` file in `public/` (already included) with `/* /index.html 200`.

## Notes
- Firebase config uses environment variables (`VITE_...`).
- The conversion splits the original single-file app into components (ProductCard, CategoryGrid, pages).
