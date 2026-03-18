import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import SlidePage from "./pages/SlidePage";
import Summary from "./pages/Summary";
import Present from "./pages/Present";
import TopBar from "./components/TopBar";
import ErrorBoundary from "./components/ErrorBoundary";

const AdminPage = lazy(() => import("./pages/admin/AdminPage"));

import './workshop.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/slide" element={<SlidePage />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/present" element={<Present />} />
        <Route path="/admin" element={
          <Suspense fallback={null}>
            <AdminPage />
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
