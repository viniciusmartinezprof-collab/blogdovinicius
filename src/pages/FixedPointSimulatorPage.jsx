import { useEffect, useMemo, useRef, useState } from "react";
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
import FixedPointPlot from "../components/poincare/FixedPointPlot.jsx";
import FixedPointTerminal from "../components/poincare/FixedPointTerminal.jsx";
import { runFixedPoint } from "../lib/fixedPoint.js";

const DEFAULT_INPUTS = {
  functionExpression: "cos(x) - x",
  iterationExpression: "cos(x)",
  x0: "0.5",
  epsilon1: "0.000001",
  epsilon2: "0.000001",
  stopMode: "all",
  maxIterations: "80",
};

const EXAMPLES = [
  {
    label: "cos(x)",
    functionExpression: "cos(x) - x",
    iterationExpression: "cos(x)",
    x0: "0.5",
    maxIterations: "80",
  },
  {
    label: "√2 babilônico",
    functionExpression: "x^2 - 2",
    iterationExpression: "(x + 2 / x) / 2",
    x0: "1",
    maxIterations: "30",
  },
  {
    label: "Cúbica",
    functionExpression: "x^3 - 2 * x - 5",
    iterationExpression: "cbrt(2 * x + 5)",
    x0: "2",
    maxIterations: "60",
  },
  {
    label: "Ver divergência",
    functionExpression: "x + 1",
    iterationExpression: "2 * x + 1",
    x0: "0",
    maxIterations: "30",
  },
];

const SPEEDS = [
  { label: "0,5×", delay: 1100 },
  { label: "1×", delay: 650 },
  { label: "2×", delay: 300 },
  { label: "4×", delay: 150 },
  { label: "8×", delay: 75 },
];

function parseDecimal(value, fieldLabel, field) {
  const normalized = String(value).trim().replace(",", ".");
  const number = Number(normalized);
  if (!normalized || !Number.isFinite(number)) {
    const error = new Error(`Informe um valor numérico válido para ${fieldLabel}.`);
    error.field = field;
    throw error;
  }
  return number;
}

function normalizeInputs(inputs) {
  const functionExpression = String(inputs.functionExpression).trim();
  if (!functionExpression) {
    const error = new Error("Escreva a função f(x) usada para medir o resíduo.");
    error.field = "functionExpression";
    throw error;
  }
  const iterationExpression = String(inputs.iterationExpression).trim();
  if (!iterationExpression) {
    const error = new Error("Escreva a função de iteração g(x).");
    error.field = "iterationExpression";
    throw error;
  }

  const x0 = parseDecimal(inputs.x0, "o chute inicial x₀", "x0");
  const epsilon1 = parseDecimal(inputs.epsilon1, "a precisão ε₁", "epsilon1");
  const epsilon2 = parseDecimal(inputs.epsilon2, "a precisão ε₂", "epsilon2");
  const stopMode = String(inputs.stopMode || "all");
  const maxIterations = Number(inputs.maxIterations);

  if (!(epsilon1 > 0)) {
    const error = new Error("A precisão ε₁ precisa ser maior que zero.");
    error.field = "epsilon1";
    throw error;
  }
  if (!(epsilon2 > 0)) {
    const error = new Error("A precisão ε₂ precisa ser maior que zero.");
    error.field = "epsilon2";
    throw error;
  }
  if (stopMode !== "all" && stopMode !== "any") {
    const error = new Error("Escolha se a parada exige ambos os critérios ou apenas um deles.");
    error.field = "stopMode";
    throw error;
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 200) {
    const error = new Error("Use um máximo entre 1 e 200 atualizações.");
    error.field = "maxIterations";
    throw error;
  }
  return {
    functionExpression,
    iterationExpression,
    x0,
    epsilon1,
    epsilon2,
    stopMode,
    maxIterations,
  };
}

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 8) {
  const number = finite(value);
  if (number === null) return "—";
  if (number === 0) return "0";
  const magnitude = Math.abs(number);
  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return number.toExponential(Math.min(digits - 1, 6)).replace("e+", "e");
  }
  return Number(number.toPrecision(digits)).toString();
}

function reasonLabel(reason) {
  const labels = {
    "exact-root": "uma raiz exata de f foi encontrada",
    "both-criteria": "as duas precisões foram atingidas",
    "step-tolerance": "a precisão do passo foi atingida",
    "residual-tolerance": "a precisão do resíduo foi atingida",
    divergence: "a órbita apresentou comportamento divergente",
    "machine-precision": "a precisão numérica da máquina foi alcançada",
    "numeric-failure": "a sequência excedeu os limites numéricos",
    "max-iterations": "o limite de atualizações foi alcançado",
  };
  return labels[reason] || "o critério de parada foi alcançado";
}

function contractionInfo(value) {
  const derivative = finite(value);
  if (derivative === null) {
    return { magnitude: null, label: "não estimada", detail: "derivada indisponível", color: "#91aabd" };
  }
  const magnitude = Math.abs(derivative);
  if (magnitude < 0.35) return { magnitude, label: "contração forte", detail: "erros encolhem rapidamente", color: "#62c9bd" };
  if (magnitude < 1) return { magnitude, label: "contração local", detail: "convergência local favorecida", color: "#78c2b9" };
  return { magnitude, label: "região expansiva", detail: "convergência não garantida", color: "#e5a36d" };
}

function IterationTable({ run, activeIndex, onSelect }) {
  return (
    <details className="fixed-point-table-panel bisection-table-panel">
      <summary>Consultar tabela completa (iterações 0 a {run.iterations.at(-1)?.iteration ?? 0})</summary>
      <div className="fixed-point-table-scroll bisection-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Iteração</th>
              <th scope="col">xₙ</th>
              <th scope="col">|xₙ − xₙ₋₁|</th>
              <th scope="col">|f(xₙ)|</th>
              <th scope="col">Stop?</th>
            </tr>
          </thead>
          <tbody>
            {run.iterations.map((step, index) => (
              <tr key={`${step.iteration}-${step.x}`} className={index === activeIndex ? "is-active" : ""}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(index)} aria-label={`Ver iteração ${step.iteration}`}>
                    {step.iteration}
                  </button>
                </th>
                <td>{formatNumber(step.x, 10)}</td>
                <td>{formatNumber(step.delta, 7)}</td>
                <td>{formatNumber(step.residual, 7)}</td>
                <td>{step.stop ? "sim" : "não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function FixedPointSimulatorPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [formError, setFormError] = useState(null);
  const [run, setRun] = useState(() => runFixedPoint(normalizeInputs(DEFAULT_INPUTS)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);
  const playbackRef = useRef(null);

  const hasIterations = run.iterations.length > 0;
  const canPlay = run.iterations.length > 1;
  const lastIndex = Math.max(0, run.iterations.length - 1);
  const fallbackStep = useMemo(() => ({
    iteration: 0,
    x: run.initialX,
    previousX: null,
    delta: null,
    functionValue: run.fRoot,
    residual: run.residual,
    derivativeEstimate: null,
    criterion1Met: null,
    criterion2Met: false,
    stop: false,
  }), [run]);
  const activeStep = run.iterations[Math.min(activeIndex, lastIndex)] || fallbackStep;
  const visualRun = useMemo(
    () => hasIterations ? run : { ...run, iterations: [fallbackStep] },
    [fallbackStep, hasIterations, run],
  );
  const isAtEnd = activeIndex >= lastIndex;
  const diagnostic = contractionInfo(activeStep?.derivativeEstimate);

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
  }, [activeIndex, isAtEnd, isPlaying, lastIndex, speed]);

  const progress = lastIndex === 0 ? 100 : (activeIndex / lastIndex) * 100;

  function updateInput(field, value) {
    setInputs((current) => ({ ...current, [field]: value }));
    if (formError) setFormError(null);
  }

  function executeSimulation(nextInputs = inputs, scrollToPlayback = false) {
    try {
      const normalized = normalizeInputs(nextInputs);
      const result = runFixedPoint(normalized);
      setRun(result);
      setActiveIndex(0);
      setFormError(null);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      setIsPlaying(false);
      if (scrollToPlayback) {
        window.requestAnimationFrame(() => {
          playbackRef.current?.scrollIntoView?.({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        });
      }
    } catch (error) {
      setIsPlaying(false);
      setFormError({ field: error.field || "functionExpression", message: error.message });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    executeSimulation(inputs, true);
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
    <div className="fixed-point-page page-shell bisection-page">
      <header className="fixed-point-header poincare-simulator-header">
        <MathRibbon />
        <Link className="fixed-point-back-link poincare-back-link" to="/espaco-poincare">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao Espaço Poincaré
        </Link>
        <div className="fixed-point-title poincare-simulator-title">
          <p className="eyebrow">Espaço Poincaré · Simulador 03</p>
          <h1>Método do <em>ponto fixo</em></h1>
          <p>
            Transforme o problema em x = g(x), siga a órbita das aproximações e
            veja a teia revelar — ou negar — a convergência.
          </p>
        </div>
        <div className="fixed-point-header-formula poincare-header-formula" aria-hidden="true" style={{ lineHeight: 1.35 }}>
          <span>xₙ₊₁ = g(xₙ)</span>
          <span>f(x*) = 0</span>
        </div>
      </header>

      <main className="fixed-point-main bisection-main">
        <section className="fixed-point-setup bisection-setup" aria-labelledby="fixed-point-parameters-title">
          <div className="fixed-point-section-heading bisection-section-heading">
            <span>01</span>
            <div>
              <p className="section-kicker">Defina a órbita</p>
              <h2 id="fixed-point-parameters-title">Parâmetros da simulação</h2>
            </div>
          </div>

          <form className="fixed-point-form bisection-form" onSubmit={handleSubmit} noValidate>
            <label
              className="fixed-point-function-field bisection-function-field"
              htmlFor="fixed-point-function-expression"
              style={{ gridRow: "auto" }}
            >
              <span>Função da equação <i>f(x)</i></span>
              <span className="fixed-point-expression-input bisection-expression-input">
                <b aria-hidden="true">f(x) =</b>
                <input
                  id="fixed-point-function-expression"
                  name="functionExpression"
                  type="text"
                  value={inputs.functionExpression}
                  onChange={(event) => updateInput("functionExpression", event.target.value)}
                  aria-invalid={formError?.field === "functionExpression"}
                  aria-describedby="fixed-point-function-help fixed-point-simulator-error"
                  autoComplete="off"
                  spellCheck="false"
                />
              </span>
              <small id="fixed-point-function-help">
                O resíduo será medido por |f(xₙ)|; a raiz procurada satisfaz f(x*) = 0.
              </small>
            </label>

            <label
              className="fixed-point-function-field bisection-function-field"
              htmlFor="fixed-point-iteration-expression"
              style={{ gridRow: "auto" }}
            >
              <span>Função de iteração <i>g(x)</i></span>
              <span className="fixed-point-expression-input bisection-expression-input">
                <b aria-hidden="true">g(x) =</b>
                <input
                  id="fixed-point-iteration-expression"
                  name="iterationExpression"
                  type="text"
                  value={inputs.iterationExpression}
                  onChange={(event) => updateInput("iterationExpression", event.target.value)}
                  aria-invalid={formError?.field === "iterationExpression"}
                  aria-describedby="fixed-point-iteration-help fixed-point-simulator-error"
                  autoComplete="off"
                  spellCheck="false"
                />
              </span>
              <small id="fixed-point-iteration-help">
                g gera xₙ₊₁. As expressões f e g devem representar a mesma equação.
              </small>
            </label>

            <div
              className="fixed-point-form-grid bisection-form-grid"
              style={{ gridColumn: "1 / -1", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))" }}
            >
              <label htmlFor="fixed-point-x0">
                <span>Chute inicial <i>x₀</i></span>
                <input
                  id="fixed-point-x0"
                  type="text"
                  inputMode="decimal"
                  value={inputs.x0}
                  onChange={(event) => updateInput("x0", event.target.value)}
                  aria-invalid={formError?.field === "x0"}
                  aria-describedby="fixed-point-simulator-error"
                />
              </label>
              <label htmlFor="fixed-point-epsilon1">
                <span>Precisão do passo <i>ε₁</i></span>
                <input
                  id="fixed-point-epsilon1"
                  type="text"
                  inputMode="decimal"
                  value={inputs.epsilon1}
                  onChange={(event) => updateInput("epsilon1", event.target.value)}
                  aria-invalid={formError?.field === "epsilon1"}
                  aria-describedby="fixed-point-simulator-error"
                />
              </label>
              <label htmlFor="fixed-point-epsilon2">
                <span>Precisão do resíduo <i>ε₂</i></span>
                <input
                  id="fixed-point-epsilon2"
                  type="text"
                  inputMode="decimal"
                  value={inputs.epsilon2}
                  onChange={(event) => updateInput("epsilon2", event.target.value)}
                  aria-invalid={formError?.field === "epsilon2"}
                  aria-describedby="fixed-point-simulator-error"
                />
              </label>
              <label htmlFor="fixed-point-stop-mode">
                <span>Critérios de parada</span>
                <select
                  id="fixed-point-stop-mode"
                  value={inputs.stopMode}
                  onChange={(event) => updateInput("stopMode", event.target.value)}
                  aria-invalid={formError?.field === "stopMode"}
                  aria-describedby="fixed-point-simulator-error"
                  style={{
                    width: "100%",
                    minHeight: "45px",
                    padding: "10px 12px",
                    border: "1px solid #5a7c96",
                    borderRadius: "1px",
                    color: "#eff8ff",
                    background: "#081c2d",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: ".78rem",
                  }}
                >
                  <option value="all">Ambos os critérios (E)</option>
                  <option value="any">Qualquer critério (OU)</option>
                </select>
              </label>
              <label htmlFor="fixed-point-max-iterations">
                <span>Máx. de atualizações</span>
                <input
                  id="fixed-point-max-iterations"
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  value={inputs.maxIterations}
                  onChange={(event) => updateInput("maxIterations", event.target.value)}
                  aria-invalid={formError?.field === "maxIterations"}
                  aria-describedby="fixed-point-simulator-error"
                />
              </label>
            </div>

            <div className="fixed-point-examples bisection-examples" aria-label="Exemplos prontos" style={{ gridColumn: "1 / -1" }}>
              <span>Carregar exemplo:</span>
              {EXAMPLES.map((example) => (
                <button key={example.label} type="button" onClick={() => loadExample(example)}>{example.label}</button>
              ))}
            </div>

            {formError ? (
              <p className="fixed-point-form-error bisection-form-error" id="fixed-point-simulator-error" role="alert" style={{ gridColumn: "1 / -1", gridRow: "auto" }}>
                <TriangleAlert size={17} aria-hidden="true" /> {formError.message}
              </p>
            ) : (
              <p className="fixed-point-form-note bisection-form-note" id="fixed-point-simulator-error" style={{ gridColumn: "1 / -1", gridRow: "auto" }}>
                Critérios: |xₙ − xₙ₋₁| &lt; ε₁ e |f(xₙ)| &lt; ε₂. Em n = 0, apenas o critério do resíduo está disponível.
              </p>
            )}

            <button className="fixed-point-run-button bisection-run-button" type="submit" style={{ gridColumn: "1 / -1" }}>
              <Sparkles size={17} aria-hidden="true" /> Executar simulação
            </button>
          </form>
        </section>

        <section className="fixed-point-results bisection-results" aria-labelledby="fixed-point-simulation-title">
          <div className="fixed-point-results-heading bisection-results-heading">
            <div className="fixed-point-section-heading bisection-section-heading">
              <span>02</span>
              <div>
                <p className="section-kicker">Siga x₀, x₁, x₂, …</p>
                <h2 id="fixed-point-simulation-title">A órbita em movimento</h2>
              </div>
            </div>
            <div className={`fixed-point-run-status bisection-run-status ${isAtEnd ? (run.converged ? "is-finished" : "is-warning") : ""}`}>
              {isAtEnd
                ? run.converged
                  ? <CircleCheck size={16} aria-hidden="true" />
                  : <TriangleAlert size={16} aria-hidden="true" />
                : <Gauge size={16} aria-hidden="true" />}
              {isAtEnd
                ? run.converged
                  ? "Convergência concluída"
                  : run.reason === "divergence"
                    ? "Divergência detectada"
                    : "Execução encerrada"
                : isPlaying
                  ? "Simulação em curso"
                  : activeIndex === 0
                    ? "Pronto para reproduzir"
                    : "Simulação pausada"}
            </div>
          </div>

          <div className="fixed-point-metrics bisection-metrics" aria-live="polite">
            <div>
              <span>Aproximação atual</span>
              <strong>xₙ ≈ {formatNumber(activeStep?.x ?? run.root, 10)}</strong>
            </div>
            <div>
              <span>Erro do passo</span>
              <strong>|xₙ − xₙ₋₁| = {formatNumber(activeStep?.delta, 7)}</strong>
            </div>
            <div>
              <span>Resíduo da equação</span>
              <strong>|f(xₙ)| = {formatNumber(activeStep?.residual, 7)}</strong>
            </div>
            <div>
              <span>Indicador de contração</span>
              <strong style={{ color: diagnostic.color }}>
                {diagnostic.magnitude === null ? "|g′| não estimado" : `|g′| ≈ ${formatNumber(diagnostic.magnitude, 6)}`}
              </strong>
            </div>
          </div>

          <div
            className="fixed-point-diagnostics"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: "1px",
              marginTop: "1px",
              border: "1px solid #345771",
              color: "#abc4d4",
              background: "#345771",
            }}
          >
            <div className="fixed-point-contraction-diagnostic" style={{ padding: "13px 16px", background: "#0a2132" }}>
              <span style={{ color: "#87a5ba", fontFamily: "IBM Plex Mono, monospace", fontSize: ".62rem", letterSpacing: ".05em", textTransform: "uppercase" }}>
                Leitura local · {diagnostic.label}
              </span>
              <div aria-hidden="true" style={{ position: "relative", height: "7px", margin: "10px 0 7px", background: "#27485f" }}>
                <span style={{ position: "absolute", left: "50%", top: "-3px", width: "1px", height: "13px", background: "#e5b85e" }} />
                <span style={{ display: "block", width: `${diagnostic.magnitude === null ? 0 : Math.min(diagnostic.magnitude / 2, 1) * 100}%`, height: "100%", background: diagnostic.color }} />
              </div>
              <small style={{ color: "#94adbf" }}>{diagnostic.detail}. A marca central representa |g′| = 1.</small>
            </div>
            <div className="fixed-point-residual-diagnostic" style={{ padding: "13px 16px", background: "#0a2132" }}>
              <span style={{ color: "#87a5ba", fontFamily: "IBM Plex Mono, monospace", fontSize: ".62rem", letterSpacing: ".05em", textTransform: "uppercase" }}>
                Teste de equilíbrio
              </span>
              <p style={{ margin: "7px 0 0", fontFamily: "IBM Plex Mono, monospace", fontSize: ".78rem" }}>
                f(xₙ) = {formatNumber(activeStep?.functionValue, 9)}
              </p>
              <small style={{ color: "#94adbf" }}>
                C₁ {activeStep?.criterion1Met === null ? "—" : activeStep?.criterion1Met ? "✓" : "×"} · C₂ {activeStep?.criterion2Met ? "✓" : "×"} · regra {run.stopMode === "all" ? "E" : "OU"} · Stop? {activeStep?.stop ? "sim" : "não"}.
              </small>
            </div>
          </div>

          <div ref={playbackRef} className="fixed-point-playback bisection-playback">
            <div className="fixed-point-controls bisection-controls" aria-label="Controles da simulação">
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

            <label className="fixed-point-timeline bisection-timeline" htmlFor="fixed-point-iteration-timeline">
              <span>
                {hasIterations ? <>Iteração <strong>{activeStep.iteration}</strong> de {run.iterations.at(-1)?.iteration ?? 0}</> : <>Verificação inicial</>}
              </span>
              <input
                id="fixed-point-iteration-timeline"
                type="range"
                min="0"
                max={lastIndex}
                value={activeIndex}
                disabled={!canPlay}
                style={{ "--timeline-progress": `${progress}%` }}
                onChange={(event) => selectIteration(Number(event.target.value))}
              />
            </label>

            <label className="fixed-point-speed bisection-speed" htmlFor="fixed-point-simulation-speed">
              Velocidade
              <select id="fixed-point-simulation-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                {SPEEDS.map((option) => <option key={option.delay} value={option.delay}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="fixed-point-workspace bisection-workspace">
            <div className="fixed-point-visual-panel bisection-visual-panel">
              <div className="fixed-point-panel-label bisection-panel-label">
                <span>Diagrama de teia + histórico</span>
                <code>g(x) = {run.iterationExpression}</code>
              </div>
              <FixedPointPlot run={visualRun} activeIndex={activeIndex} />
            </div>
            <FixedPointTerminal run={run} activeIndex={activeIndex} />
          </div>

          {isAtEnd ? (
            <p className={`fixed-point-conclusion bisection-conclusion ${run.converged ? "" : "is-warning"}`}>
              {run.converged ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
              <span>
                <strong>
                  {run.converged
                    ? `Raiz aproximada: x* ≈ ${formatNumber(run.root, 12)}`
                    : run.reason === "divergence"
                      ? "A sequência não convergiu"
                      : "A aproximação ainda não atingiu a regra de parada"}
                </strong>{" — "}{reasonLabel(run.reason)}.
              </span>
            </p>
          ) : null}

          {hasIterations ? <IterationTable run={run} activeIndex={activeIndex} onSelect={selectIteration} /> : null}
        </section>

        <aside className="fixed-point-method-note bisection-method-note">
          <span aria-hidden="true">i</span>
          <div>
            <h2>Por que a teia converge?</h2>
            <p>
              Um ponto fixo é a interseção entre y = g(x) e y = x. Se g leva um intervalo fechado para ele mesmo
              e existe uma constante q &lt; 1 com |g′(x)| ≤ q nesse intervalo, o Teorema do Ponto Fixo de Banach
              garante um único ponto fixo e a convergência a partir de qualquer x₀ do intervalo. O indicador acima é
              local: ele ajuda a interpretar a órbita, mas sozinho não substitui a verificação no intervalo inteiro.
            </p>
          </div>
        </aside>

        <aside className="fixed-point-reading-note bisection-method-note">
          <span aria-hidden="true">↗</span>
          <div>
            <h2>Como ler o diagrama de teia</h2>
            <p>
              Parta de xₙ na reta amarela, suba ou desça até a curva azul y = g(x), e caminhe horizontalmente de volta
              à reta y = x. Essa dupla movimentação produz xₙ₊₁. Uma espiral ou escada que se fecha indica convergência;
              degraus que se ampliam revelam instabilidade ou divergência.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default FixedPointSimulatorPage;
