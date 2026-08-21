import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import MathRibbon from "../components/MathRibbon.jsx";
import BisectionPlot from "../components/poincare/BisectionPlot.jsx";
import IterationTerminal from "../components/poincare/IterationTerminal.jsx";
import { runBisection } from "../lib/bisection.js";

const DEFAULT_INPUTS = {
  expression: "x^3 - x - 2",
  a: "1",
  b: "2",
  tolerance: "0.0001",
  maxIterations: "50",
};

const EXAMPLES = [
  { label: "Polinômio", expression: "x^3 - x - 2", a: "1", b: "2" },
  { label: "Ponto fixo", expression: "cos(x) - x", a: "0", b: "1" },
  { label: "√2", expression: "x^2 - 2", a: "1", b: "2" },
];

const SPEEDS = [
  { label: "0,5×", delay: 1100 },
  { label: "1×", delay: 650 },
  { label: "2×", delay: 300 },
];

function parseDecimal(value, fieldLabel) {
  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number(normalized);

  if (!normalized || !Number.isFinite(parsed)) {
    const error = new Error(`Informe um valor numérico válido para ${fieldLabel}.`);
    error.field = fieldLabel;
    throw error;
  }

  return parsed;
}

function normalizeInputs(inputs) {
  const expression = inputs.expression.trim();
  if (!expression) {
    const error = new Error("Escreva a função que deseja investigar.");
    error.field = "expression";
    throw error;
  }

  const a = parseDecimal(inputs.a, "a");
  const b = parseDecimal(inputs.b, "b");
  const tolerance = parseDecimal(inputs.tolerance, "tolerance");
  const maxIterations = Number(inputs.maxIterations);

  if (a >= b) {
    const error = new Error("O limite a precisa ser menor que o limite b.");
    error.field = "interval";
    throw error;
  }

  if (tolerance <= 0) {
    const error = new Error("A tolerância precisa ser maior que zero.");
    error.field = "tolerance";
    throw error;
  }

  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 200) {
    const error = new Error("Use um máximo entre 1 e 200 iterações.");
    error.field = "maxIterations";
    throw error;
  }

  return { expression, a, b, tolerance, maxIterations };
}

function formatNumber(value, digits = 8) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return value.toExponential(Math.min(digits - 1, 6)).replace("e+", "e");
  }

  return Number(value.toPrecision(digits)).toString();
}

function reasonLabel(reason) {
  const labels = {
    "function-value": "|f(m)| atingiu a tolerância",
    "interval-width": "o erro do intervalo atingiu a tolerância",
    "endpoint-a": "a extremidade a já era uma raiz",
    "endpoint-b": "a extremidade b já era uma raiz",
    "endpoint-root": "uma das extremidades já era uma raiz",
    "exact-root": "a raiz foi encontrada exatamente no ponto médio",
    tolerance: "o erro do intervalo atingiu a tolerância",
    "machine-precision": "a precisão numérica do navegador foi alcançada",
    "max-iterations": "limite de iterações alcançado",
  };

  return labels[reason] || "critério de parada alcançado";
}

function IterationTable({ run, activeIndex, onSelect }) {
  return (
    <details className="bisection-table-panel">
      <summary>Consultar tabela completa ({run.iterations.length} iterações)</summary>
      <div className="bisection-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">n</th>
              <th scope="col">aₙ</th>
              <th scope="col">mₙ</th>
              <th scope="col">bₙ</th>
              <th scope="col">f(mₙ)</th>
              <th scope="col">erro ≤</th>
            </tr>
          </thead>
          <tbody>
            {run.iterations.map((step, index) => (
              <tr key={`${step.iteration}-${step.midpoint}`} className={index === activeIndex ? "is-active" : ""}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(index)} aria-label={`Ver iteração ${step.iteration}`}>
                    {step.iteration}
                  </button>
                </th>
                <td>{formatNumber(step.a)}</td>
                <td>{formatNumber(step.midpoint)}</td>
                <td>{formatNumber(step.b)}</td>
                <td>{formatNumber(step.fMidpoint)}</td>
                <td>{formatNumber(step.errorEstimate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function BisectionSimulatorPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [formError, setFormError] = useState(null);
  const [run, setRun] = useState(() => runBisection(normalizeInputs(DEFAULT_INPUTS)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);

  const hasIterations = run.iterations.length > 0;
  const canPlay = run.iterations.length > 1;
  const lastIndex = Math.max(0, run.iterations.length - 1);
  const endpointStep = useMemo(() => ({
    iteration: 0,
    a: run.initialA,
    b: run.initialB,
    fA: run.fInitialA,
    fB: run.fInitialB,
    midpoint: run.root,
    fMidpoint: run.fRoot,
    errorEstimate: 0,
  }), [run]);
  const activeStep = run.iterations[Math.min(activeIndex, lastIndex)] || endpointStep;
  const visualRun = useMemo(
    () => hasIterations ? run : { ...run, iterations: [endpointStep] },
    [endpointStep, hasIterations, run],
  );
  const isAtEnd = activeIndex >= lastIndex;
  const stoppedByInterval = run.reason === "tolerance" || run.reason === "interval-width";

  useEffect(() => {
    if (!isPlaying) return undefined;

    if (isAtEnd) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => Math.min(current + 1, lastIndex));
    }, speed);

    return () => window.clearTimeout(timer);
  }, [isAtEnd, isPlaying, lastIndex, speed]);

  const progress = lastIndex === 0 ? 100 : (activeIndex / lastIndex) * 100;
  const intervalReduction = useMemo(() => {
    if (!activeStep) return 0;
    const initialWidth = run.initialB - run.initialA;
    const currentWidth = activeStep.b - activeStep.a;
    return initialWidth > 0 ? Math.max(0, (1 - currentWidth / initialWidth) * 100) : 0;
  }, [activeStep, run.initialA, run.initialB]);

  function updateInput(field, value) {
    setInputs((current) => ({ ...current, [field]: value }));
    if (formError) setFormError(null);
  }

  function executeSimulation(nextInputs = inputs, autoplay = true) {
    try {
      const normalized = normalizeInputs(nextInputs);
      const result = runBisection(normalized);
      setRun(result);
      setActiveIndex(0);
      setFormError(null);

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setIsPlaying(autoplay && !reduceMotion && result.iterations.length > 1);
    } catch (error) {
      setIsPlaying(false);
      const field = error.code === "NO_SIGN_CHANGE" ? "interval" : error.field || "expression";
      setFormError({ field, message: error.message });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    executeSimulation();
  }

  function loadExample(example) {
    const nextInputs = { ...DEFAULT_INPUTS, ...example };
    delete nextInputs.label;
    setInputs(nextInputs);
    executeSimulation(nextInputs);
  }

  function selectIteration(index) {
    setIsPlaying(false);
    setActiveIndex(Math.max(0, Math.min(index, lastIndex)));
  }

  return (
    <div className="page-shell bisection-page">
      <header className="poincare-simulator-header">
        <MathRibbon />
        <Link className="poincare-back-link" to="/espaco-poincare">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao Espaço Poincaré
        </Link>
        <div className="poincare-simulator-title">
          <p className="eyebrow">Espaço Poincaré · Simulador 01</p>
          <h1>Método da <em>bisseção</em></h1>
          <p>
            Observe o algoritmo preservar a troca de sinal e dividir o intervalo
            ao meio até cercar a raiz com a precisão desejada.
          </p>
        </div>
        <div className="poincare-header-formula" aria-hidden="true">
          <span>aₙ + bₙ</span>
          <span>──────── = mₙ</span>
          <span>2</span>
        </div>
      </header>

      <main className="bisection-main">
        <section className="bisection-setup" aria-labelledby="parameters-title">
          <div className="bisection-section-heading">
            <span>01</span>
            <div>
              <p className="section-kicker">Prepare o experimento</p>
              <h2 id="parameters-title">Parâmetros da simulação</h2>
            </div>
          </div>

          <form className="bisection-form" onSubmit={handleSubmit} noValidate>
            <label className="bisection-function-field" htmlFor="function-expression">
              <span>Função <i>f(x)</i></span>
              <span className="bisection-expression-input">
                <b aria-hidden="true">f(x) =</b>
                <input
                  id="function-expression"
                  name="expression"
                  type="text"
                  value={inputs.expression}
                  onChange={(event) => updateInput("expression", event.target.value)}
                  aria-invalid={formError?.field === "expression"}
                  aria-describedby="function-help simulator-error"
                  autoComplete="off"
                  spellCheck="false"
                />
              </span>
              <small id="function-help">
                Use x, +, −, *, /, ^; sin/sen, cos, sqrt/raiz, exp, ln e log. Ângulos em radianos.
              </small>
            </label>

            <div className="bisection-form-grid">
              <label htmlFor="interval-a">
                <span>Limite esquerdo <i>a</i></span>
                <input
                  id="interval-a"
                  type="text"
                  inputMode="decimal"
                  value={inputs.a}
                  onChange={(event) => updateInput("a", event.target.value)}
                  aria-invalid={formError?.field === "a" || formError?.field === "interval"}
                  aria-describedby="simulator-error"
                />
              </label>
              <label htmlFor="interval-b">
                <span>Limite direito <i>b</i></span>
                <input
                  id="interval-b"
                  type="text"
                  inputMode="decimal"
                  value={inputs.b}
                  onChange={(event) => updateInput("b", event.target.value)}
                  aria-invalid={formError?.field === "b" || formError?.field === "interval"}
                  aria-describedby="simulator-error"
                />
              </label>
              <label htmlFor="tolerance">
                <span>Tolerância <i>ε</i></span>
                <input
                  id="tolerance"
                  type="text"
                  inputMode="decimal"
                  value={inputs.tolerance}
                  onChange={(event) => updateInput("tolerance", event.target.value)}
                  aria-invalid={formError?.field === "tolerance"}
                  aria-describedby="simulator-error"
                />
              </label>
              <label htmlFor="max-iterations">
                <span>Máx. de iterações</span>
                <input
                  id="max-iterations"
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  value={inputs.maxIterations}
                  onChange={(event) => updateInput("maxIterations", event.target.value)}
                  aria-invalid={formError?.field === "maxIterations"}
                  aria-describedby="simulator-error"
                />
              </label>
            </div>

            <div className="bisection-examples" aria-label="Exemplos prontos">
              <span>Carregar exemplo:</span>
              {EXAMPLES.map((example) => (
                <button key={example.label} type="button" onClick={() => loadExample(example)}>
                  {example.label}
                </button>
              ))}
            </div>

            {formError ? (
              <p className="bisection-form-error" id="simulator-error" role="alert">
                <TriangleAlert size={17} aria-hidden="true" /> {formError.message}
              </p>
            ) : (
              <p className="bisection-form-note" id="simulator-error">
                Se f for contínua em [a, b], use uma troca de sinal: f(a) · f(b) &lt; 0. Raízes nas extremidades também são aceitas.
              </p>
            )}

            <button className="bisection-run-button" type="submit">
              <Sparkles size={17} aria-hidden="true" /> Executar simulação
            </button>
          </form>
        </section>

        <section className="bisection-results" aria-labelledby="simulation-title">
          <div className="bisection-results-heading">
            <div className="bisection-section-heading">
              <span>02</span>
              <div>
                <p className="section-kicker">Acompanhe o algoritmo</p>
                <h2 id="simulation-title">Convergência em movimento</h2>
              </div>
            </div>
            <div className={`bisection-run-status ${isAtEnd ? (run.converged ? "is-finished" : "is-warning") : ""}`}>
              {isAtEnd
                ? run.converged
                  ? <CircleCheck size={16} aria-hidden="true" />
                  : <TriangleAlert size={16} aria-hidden="true" />
                : <Gauge size={16} aria-hidden="true" />}
              {isAtEnd
                ? (run.converged
                    ? stoppedByInterval ? "Intervalo refinado" : "Raiz encontrada"
                    : run.reason === "machine-precision"
                      ? "Precisão da máquina"
                      : "Limite alcançado")
                : isPlaying
                  ? "Simulação em curso"
                  : activeIndex === 0
                    ? "Pronto para reproduzir"
                    : "Simulação pausada"}
            </div>
          </div>

          <div className="bisection-metrics" aria-live="polite">
            <div>
              <span>Aproximação atual</span>
              <strong>x ≈ {formatNumber(activeStep?.midpoint ?? run.root, 10)}</strong>
            </div>
            <div>
              <span>Valor da função</span>
              <strong>f(x) = {formatNumber(activeStep?.fMidpoint, 7)}</strong>
            </div>
            <div>
              <span>Erro em x (se f contínua)</span>
              <strong>≤ {formatNumber(activeStep?.errorEstimate, 7)}</strong>
            </div>
            <div>
              <span>Intervalo reduzido</span>
              <strong>{hasIterations ? `${formatNumber(intervalReduction, 5)}%` : "não necessário"}</strong>
            </div>
          </div>

          <div className="bisection-workspace">
            <div className="bisection-visual-panel">
              <div className="bisection-panel-label">
                <span>Gráfico da iteração</span>
                <code>f(x) = {run.expression}</code>
              </div>
              <BisectionPlot run={visualRun} activeIndex={activeIndex} />
            </div>
            <IterationTerminal run={run} activeIndex={activeIndex} />
          </div>

          <div className="bisection-playback">
            <div className="bisection-controls" aria-label="Controles da simulação">
              <button type="button" onClick={() => selectIteration(0)} disabled={activeIndex === 0} title="Reiniciar">
                <RotateCcw size={17} aria-hidden="true" /><span className="sr-only">Reiniciar</span>
              </button>
              <button type="button" onClick={() => selectIteration(activeIndex - 1)} disabled={activeIndex === 0}>
                <ChevronLeft size={18} aria-hidden="true" /> Anterior
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => {
                  if (isAtEnd) setActiveIndex(0);
                  setIsPlaying((current) => !current || isAtEnd);
                }}
                disabled={!canPlay}
                aria-pressed={isPlaying}
              >
                {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                {!canPlay ? "Concluído" : isPlaying ? "Pausar" : isAtEnd || activeIndex === 0 ? "Reproduzir" : "Continuar"}
              </button>
              <button type="button" onClick={() => selectIteration(activeIndex + 1)} disabled={isAtEnd}>
                Próxima <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            <label className="bisection-timeline" htmlFor="iteration-timeline">
              <span>
                {hasIterations ? (
                  <>Iteração <strong>{activeStep.iteration}</strong> de {run.iterations.length}</>
                ) : (
                  <>Verificação das extremidades</>
                )}
              </span>
              <input
                id="iteration-timeline"
                type="range"
                min="0"
                max={lastIndex}
                value={activeIndex}
                disabled={!canPlay}
                style={{ "--timeline-progress": `${progress}%` }}
                onChange={(event) => selectIteration(Number(event.target.value))}
              />
            </label>

            <label className="bisection-speed" htmlFor="simulation-speed">
              Velocidade
              <select id="simulation-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                {SPEEDS.map((option) => <option key={option.delay} value={option.delay}>{option.label}</option>)}
              </select>
            </label>
          </div>

          {isAtEnd ? (
            <p className={`bisection-conclusion ${run.converged ? "" : "is-warning"}`}>
              {run.converged ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
              <span>
                <strong>{run.converged ? `${stoppedByInterval ? "Candidato a raiz" : "Raiz"}: x ≈ ${formatNumber(run.root, 12)}` : "A aproximação ainda não atingiu a tolerância"}</strong>{" — "}
                {reasonLabel(run.reason)}.
                {stoppedByInterval ? ` A garantia pressupõe continuidade de f em [a, b]; resíduo atual |f(x)| = ${formatNumber(Math.abs(run.fRoot), 7)}.` : ""}
              </span>
            </p>
          ) : null}

          {hasIterations ? <IterationTable run={run} activeIndex={activeIndex} onSelect={selectIteration} /> : null}
        </section>

        <aside className="bisection-method-note">
          <span aria-hidden="true">i</span>
          <div>
            <h2>Por que o método funciona?</h2>
            <p>
              Se uma função contínua troca de sinal entre a e b, o Teorema do Valor
              Intermediário garante ao menos uma raiz no intervalo. A cada passo,
              descartamos a metade que não precisamos e preservamos essa garantia.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default BisectionSimulatorPage;
