import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import SlidePage from "./pages/SlidePage";
import Summary from "./pages/Summary";
import Present from "./pages/Present";
import TopBar from "./components/TopBar";
import ErrorBoundary from "./components/ErrorBoundary";
import { TopBarProvider } from "./components/TopBarContext";

const AdminPage = lazy(() => import("./pages/admin/AdminPage"));

import './styles/index.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <TopBarProvider>
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
    </TopBarProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
