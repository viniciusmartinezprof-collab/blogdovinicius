import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import MathRibbon from "../components/MathRibbon.jsx";
import PoincareSpace from "../components/PoincareSpace.jsx";

function PoincareHubPage() {
  return (
    <div className="page-shell bisection-page">
      <header className="poincare-simulator-header">
        <MathRibbon />
        <Link className="poincare-back-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar à página inicial
        </Link>

        <div className="poincare-simulator-title">
          <p className="eyebrow">Laboratório de matemática computacional</p>
          <h1>Espaço <em>Poincaré</em></h1>
          <p>
            Um lugar para experimentar algoritmos, observar cada passo e descobrir
            a matemática por meio de simulações que você pode manipular.
          </p>
        </div>

        <div className="poincare-header-formula" aria-hidden="true">
          <span>ideia + experimento</span>
          <span>──────────────</span>
          <span>descoberta</span>
        </div>
      </header>

      <main className="bisection-main">
        <PoincareSpace />
      </main>

      <Footer />
    </div>
  );
}

export default PoincareHubPage;
