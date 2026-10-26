import {
  Activity,
  ArrowUpRight,
  ChartSpline,
  GitCompareArrows,
  Grid3X3,
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

function MiniSecantPlot() {
  return (
    <svg className="poincare-card-plot" viewBox="0 0 420 150">
      <MiniGrid />
      <path className="poincare-card-axis" d="M20 98H400M58 139V14" />
      <path className="poincare-card-curve is-secant" d="M29 127 C88 118, 134 107, 174 82 S247 31, 294 51 S349 91, 395 18" />
      <path className="poincare-card-secant" d="M118 112L318 39" />
      <path className="poincare-card-projection" d="M253 63V98M178 98V130" />
      <circle className="poincare-card-endpoint" cx="118" cy="112" r="5" />
      <circle className="poincare-card-endpoint" cx="253" cy="63" r="5" />
      <circle className="poincare-card-root" cx="178" cy="98" r="5" />
      <text x="101" y="130">xₙ₋₁</text>
      <text x="243" y="55">xₙ</text>
      <text x="166" y="90">xₙ₊₁</text>
    </svg>
  );
}

function MiniGaussianPlot() {
  const cells = [
    ["2", "1", "−1", "8"],
    ["0", "0.5", "0.5", "1"],
    ["0", "0", "−1", "1"],
  ];

  return (
    <svg className="poincare-card-plot poincare-card-matrix" viewBox="0 0 420 150">
      <MiniGrid />
      <path className="poincare-card-bracket" d="M95 25H85V125H95M330 25H340V125H330" />
      <path className="poincare-card-secant" d="M275 28V122" />
      {cells.map((row, rowIndex) => (
        row.map((value, columnIndex) => (
          <g key={`${rowIndex}-${columnIndex}`}>
            <rect
              className={`poincare-card-matrix-cell ${rowIndex === columnIndex ? "is-pivot" : ""} ${columnIndex === 3 ? "is-result" : ""}`}
              x={108 + columnIndex * 54}
              y={33 + rowIndex * 34}
              width="38"
              height="24"
            />
            <text x={127 + columnIndex * 54} y={50 + rowIndex * 34} textAnchor="middle">{value}</text>
          </g>
        ))
      ))}
      <path className="poincare-card-projection" d="M108 91H254M108 125H254" />
    </svg>
  );
}

function MiniLUPlot({ cholesky = false }) {
  return (
    <svg className="poincare-card-plot poincare-card-matrix" viewBox="0 0 420 150">
      <MiniGrid />
      <text x="64" y="82" textAnchor="middle">{cholesky ? "" : "P"}</text>
      <text x="113" y="82" textAnchor="middle">A</text>
      <text x="158" y="82" textAnchor="middle">=</text>
      <path className="poincare-card-bracket" d="M190 33H182V119H190M263 33H271V119H263" />
      <path className="poincare-card-bracket" d="M307 33H299V119H307M380 33H388V119H380" />
      {[0, 1, 2].map((row) => (
        [0, 1, 2].map((column) => (
          <rect
            className={`poincare-card-matrix-cell ${row === column ? "is-pivot" : ""} ${row > column ? "is-result" : ""}`}
            x={195 + column * 22}
            y={42 + row * 24}
            width="16"
            height="16"
            key={`l-${row}-${column}`}
          />
        ))
      ))}
      {[0, 1, 2].map((row) => (
        [0, 1, 2].map((column) => (
          <rect
            className={`poincare-card-matrix-cell ${row <= column ? "is-pivot" : ""}`}
            x={312 + column * 22}
            y={42 + row * 24}
            width="16"
            height="16"
            key={`u-${row}-${column}`}
          />
        ))
      ))}
      <text x="226" y="136" textAnchor="middle">{cholesky ? "G" : "L"}</text>
      <text x="343" y="136" textAnchor="middle">{cholesky ? "Gᵀ" : "U"}</text>
    </svg>
  );
}

function MiniCholeskyPlot() { return <MiniLUPlot cholesky />; }

function MiniIterationPlot() {
  return <svg className="poincare-card-plot" viewBox="0 0 420 150">
    <MiniGrid />
    <path className="poincare-card-axis" d="M40 15V125H400" />
    <path className="poincare-card-curve" d="M50 25L110 68L170 91L230 107L290 117L350 121" />
    <text x="60" y="145">k →</text><text x="260" y="35">ρ(T) &lt; 1</text>
  </svg>;
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
  {
    to: "/espaco-poincare/secantes",
    number: "05",
    title: "Método das secantes",
    description: "Use dois chutes livres para aproximar a derivada por uma reta secante e gerar a próxima raiz candidata.",
    formula: "xₙ₊₁ = xₙ − f(xₙ)(xₙ − xₙ₋₁)/(f(xₙ) − f(xₙ₋₁))",
    modifier: "is-secant",
    Plot: MiniSecantPlot,
    features: [
      { Icon: GitCompareArrows, label: "Dois chutes livres" },
      { Icon: Activity, label: "Inclinação sem derivada" },
    ],
  },
  {
    to: "/espaco-poincare/eliminacao-gaussiana",
    number: "06",
    title: "Eliminação gaussiana",
    description: "Reduza sistemas lineares por operações elementares, acompanhe pivôs e resolva por substituição retroativa.",
    formula: "Lᵢ ← Lᵢ − mᵢₖLₖ",
    modifier: "is-gaussian",
    Plot: MiniGaussianPlot,
    features: [
      { Icon: Grid3X3, label: "Matriz aumentada" },
      { Icon: Terminal, label: "Operações de linha" },
    ],
  },
  {
    to: "/espaco-poincare/fatoracao-lu",
    number: "07",
    title: "Fatoração LU",
    description: "Decomponha A em fatores triangulares, visualize os multiplicadores e leia a forma PA = LU passo a passo.",
    formula: "PA = LU",
    modifier: "is-lu",
    Plot: MiniLUPlot,
    features: [
      { Icon: Grid3X3, label: "Fatores P, L e U" },
      { Icon: Terminal, label: "Multiplicadores" },
    ],
  },
  {
    to: "/espaco-poincare/fatoracao-cholesky",
    number: "08",
    title: "Fatoração de Cholesky",
    description: "Verifique simetria e definição positiva, explore os três critérios e construa G passo a passo.",
    formula: "A = GGᵀ",
    modifier: "is-lu",
    Plot: MiniCholeskyPlot,
    features: [
      { Icon: Grid3X3, label: "Simetria e definição positiva" },
      { Icon: Terminal, label: "Fatores G e Gᵀ" },
    ],
  },
  {
    to: "/espaco-poincare/gauss-jacobi", number: "09", title: "Método de Gauss-Jacobi",
    description: "Atualize as componentes usando a iteração anterior e explore dominância diagonal e raio espectral.", formula: "A = D + L + U", modifier: "is-lu", Plot: MiniIterationPlot,
    features: [{ Icon: Grid3X3, label: "Matriz de iteração" }, { Icon: Activity, label: "Critérios de convergência" }],
  },
  {
    to: "/espaco-poincare/gauss-seidel", number: "10", title: "Método de Gauss-Seidel",
    description: "Use os novos valores imediatamente e acompanhe como a matriz de iteração determina a convergência.", formula: "A = D + L + U", modifier: "is-lu", Plot: MiniIterationPlot,
    features: [{ Icon: Grid3X3, label: "Matriz de iteração" }, { Icon: Activity, label: "Critérios de convergência" }],
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
