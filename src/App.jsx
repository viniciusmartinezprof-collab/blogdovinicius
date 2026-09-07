import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";

const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const BisectionSimulatorPage = lazy(() => import("./pages/BisectionSimulatorPage.jsx"));
const FalsePositionSimulatorPage = lazy(() => import("./pages/FalsePositionSimulatorPage.jsx"));
const FixedPointSimulatorPage = lazy(() => import("./pages/FixedPointSimulatorPage.jsx"));
const NewtonRaphsonSimulatorPage = lazy(() => import("./pages/NewtonRaphsonSimulatorPage.jsx"));
const PoincareHubPage = lazy(() => import("./pages/PoincareHubPage.jsx"));
const PublicPortal = lazy(() => import("./pages/PublicPortal.jsx"));
const SecantSimulatorPage = lazy(() => import("./pages/SecantSimulatorPage.jsx"));

const PAGE_TITLES = {
  "/": "VMM Space",
  "/disciplinas": "Disciplinas | VMM Space",
  "/espaco-poincare": "Espaço Poincaré | VMM Space",
  "/espaco-poincare/bissecao": "Método da bisseção | Espaço Poincaré",
  "/espaco-poincare/falsa-posicao": "Falsa posição | Espaço Poincaré",
  "/espaco-poincare/ponto-fixo": "Ponto fixo | Espaço Poincaré",
  "/espaco-poincare/newton-raphson": "Newton–Raphson | Espaço Poincaré",
  "/espaco-poincare/secantes": "Método das secantes | Espaço Poincaré",
  "/admin": "Administração | VMM Space",
};

function RouteEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    document.title = PAGE_TITLES[normalizedPath] || "VMM Space";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function RouteFallback() {
  return (
    <div className="page-shell portal-state" role="status">
      <span aria-hidden="true">∫</span>
      <h1>Preparando o espaço…</h1>
    </div>
  );
}

function App() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/disciplinas" element={<PublicPortal />} />
          <Route path="/espaco-poincare" element={<PoincareHubPage />} />
          <Route path="/espaco-poincare/bissecao" element={<BisectionSimulatorPage />} />
          <Route path="/espaco-poincare/falsa-posicao" element={<FalsePositionSimulatorPage />} />
          <Route path="/espaco-poincare/ponto-fixo" element={<FixedPointSimulatorPage />} />
          <Route path="/espaco-poincare/newton-raphson" element={<NewtonRaphsonSimulatorPage />} />
          <Route path="/espaco-poincare/secantes" element={<SecantSimulatorPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
