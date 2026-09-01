import {
  Activity,
  ArrowUpRight,
  ChartSpline,
  GitCompareArrows,
  Terminal,
  Waypoints,
} from "lucide-react";
import { Link } from "react-router-dom";

function MiniGrid() {
  return <path className="poincare-card-grid" d="M20 30H400M20 75H400M20 120H400M105 15V135M210 15V135M315 15V135" />;
}

function MiniBisectionPlot() {
  return (
    <svg className="poincare-card-plot" viewBox="0 0 420 150">
      <defs>
        <linearGradient id="poincare-bisection-gradient" x1="0" x2="1">
          <stop offset="0" stopColor="#5bc0b5" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#5bc0b5" stopOpacity="0.32" />
          <stop offset="1" stopColor="#5bc0b5" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <MiniGrid />
      <path className="poincare-card-axis" d="M20 84H400" />
      <rect className="poincare-card-interval" x="98" y="15" width="220" height="120" fill="url(#poincare-bisection-gradient)" />
      <path className="poincare-card-curve" d="M25 123 C80 120, 112 111, 148 97 S205 58, 250 64 S309 105, 395 21" />
      <path className="poincare-card-bracket" d="M98 129V139M98 134H318M318 129V139" />
      <circle className="poincare-card-root" cx="181" cy="84" r="5" />
      <text x="91" y="149">a₀</text>
      <text x="173" y="75">x*</text>
      <text x="311" y="149">b₀</text>
    </svg>
  );
}

function MiniFalsePositionPlot() {
  return (
    <svg className="poincare-card-plot" viewBox="0 0 420 150">
      <MiniGrid />
      <path className="poincare-card-axis" d="M20 91H400" />
      <path className="poincare-card-curve is-false-position" d="M28 128 C92 124, 118 112, 155 94 S229 54, 272 66 S332 86, 395 20" />
      <path className="poincare-card-secant" d="M72 119L340 30" />
      <path className="poincare-card-projection" d="M156 91V132" />
      <circle className="poincare-card-endpoint" cx="72" cy="119" r="4" />
      <rect className="poincare-card-endpoint" x="336" y="26" width="8" height="8" />
      <circle className="poincare-card-root" cx="156" cy="91" r="5" />
      <text x="65" y="143">aₙ</text>
      <text x="146" y="83">cₙ</text>
      <text x="332" y="20">bₙ</text>
    </svg>
  );
}

function MiniFixedPointPlot() {
  return (
    <svg className="poincare-card-plot" viewBox="0 0 420 150">
      <MiniGrid />
      <path className="poincare-card-axis" d="M22 130H400M43 139V12" />
      <path className="poincare-card-identity" d="M48 130L370 20" />
      <path className="poincare-card-curve is-fixed-point" d="M48 31 C121 31, 187 44, 239 68 S327 105, 389 113" />
      <path className="poincare-card-cobweb" d="M337 130V101H132V42H305V94H153V51H279V86H171V56H260V80H190" />
      <circle className="poincare-card-root" cx="207" cy="76" r="5" />
      <text x="318" y="24">y = x</text>
      <text x="50" y="24">y = g(x)</text>
    </svg>
  );
}

function MiniNewtonRaphsonPlot() {
  return (
    <svg className="poincare-card-plot" viewBox="0 0 420 150">
      <MiniGrid />
      <path className="poincare-card-axis" d="M20 103H400M58 139V14" />
      <path className="poincare-card-curve is-newton" d="M27 130 C92 123, 127 108, 168 79 S250 24, 295 47 S347 89, 395 20" />
      <path className="poincare-card-tangent" d="M116 137L337 19" />
      <path className="poincare-card-projection" d="M252 64V103M180 103V137" />
      <circle className="poincare-card-endpoint" cx="252" cy="64" r="5" />
      <circle className="poincare-card-root" cx="180" cy="103" r="5" />
      <text x="243" y="55">(xₙ, f(xₙ))</text>
      <text x="169" y="95">xₙ₊₁</text>
    </svg>
  );
}

const tools = [
  {
    to: "/espaco-poincare/bissecao",
    number: "01",
    title: "Método da bisseção",
    description: "Divida um intervalo com troca de sinal ao meio e acompanhe a raiz ser cercada com precisão garantida.",
    formula: "mₙ = (aₙ + bₙ) / 2",
    modifier: "is-bisection",
    Plot: MiniBisectionPlot,
    features: [
      { Icon: Terminal, label: "Console passo a passo" },
      { Icon: ChartSpline, label: "Intervalos encaixados" },
    ],
  },
  {
    to: "/espaco-poincare/falsa-posicao",
    number: "02",
    title: "Método da falsa posição",
    description: "Use a secante entre as extremidades para escolher uma aproximação informada pela forma da função.",
    formula: "cₙ = (aₙf(bₙ) − bₙf(aₙ)) / (f(bₙ) − f(aₙ))",
    modifier: "is-false-position",
    Plot: MiniFalsePositionPlot,
    features: [
      { Icon: GitCompareArrows, label: "Geometria da secante" },
      { Icon: ChartSpline, label: "Intervalo preservado" },
    ],
  },
  {
    to: "/espaco-poincare/ponto-fixo",
    number: "03",
    title: "Método do ponto fixo",
    description: "Itere xₙ₊₁ = g(xₙ) e enxergue convergência, oscilação ou afastamento em um diagrama de teia.",
    formula: "xₙ₊₁ = g(xₙ)",
    modifier: "is-fixed-point",
    Plot: MiniFixedPointPlot,
    features: [
      { Icon: Waypoints, label: "Diagrama de teia" },
      { Icon: Activity, label: "Diagnóstico local" },
    ],
  },
  {
    to: "/espaco-poincare/newton-raphson",
    number: "04",
    title: "Método de Newton–Raphson",
    description: "Trace a tangente a partir de um chute inicial e acompanhe suas interseções se aproximarem de uma raiz.",
    formula: "xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)",
    modifier: "is-newton",
    Plot: MiniNewtonRaphsonPlot,
    features: [
      { Icon: ChartSpline, label: "Geometria da tangente" },
      { Icon: Activity, label: "Histórico do resíduo" },
    ],
  },
];

function PoincareSpace() {
  return (
    <section className="poincare-home" aria-labelledby="poincare-home-title">
      <div className="poincare-home-intro">
        <div>
          <p className="section-kicker">Ferramentas interativas</p>
          <h2 id="poincare-home-title">Simuladores <em>disponíveis</em></h2>
        </div>
        <p>
          Escolha um experimento para acompanhar algoritmos passo a passo e
          transformar conceitos matemáticos em objetos que você pode manipular.
        </p>
      </div>

      <div className="poincare-tools-grid">
        {tools.map(({ to, number, title, description, formula, modifier, Plot, features }) => (
          <article className={`poincare-tool-card ${modifier}`} key={to}>
            <Link to={to} className="poincare-tool-link">
              <div className="poincare-tool-visual" aria-hidden="true">
                <span className="poincare-tool-formula">{formula}</span>
                <Plot />
              </div>

              <div className="poincare-tool-copy">
                <div className="poincare-tool-meta">
                  <span>Simulador {number}</span>
                  <span className="is-ready">Disponível</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <ul aria-label={`Recursos de ${title}`}>
                  {features.map(({ Icon, label }) => (
                    <li key={label}><Icon size={15} aria-hidden="true" /> {label}</li>
                  ))}
                </ul>
                <span className="poincare-tool-action">
                  Abrir simulador <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PoincareSpace;
