import { useEffect, useRef, useState } from "react";
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
import SecantPlot from "../components/poincare/SecantPlot.jsx";
import SecantTerminal from "../components/poincare/SecantTerminal.jsx";
import { runSecant } from "../lib/secant.js";

const DEFAULT_INPUTS = {
  expression: "x^3 - x - 2",
  x0: "1",
  x1: "2",
  epsilon1: "0.000001",
  epsilon2: "0.000001",
  stopMode: "all",
  maxIterations: "50",
};

const EXAMPLES = [
  { label: "Polinômio", expression: "x^3 - x - 2", x0: "1", x1: "2" },
  { label: "√2", expression: "x^2 - 2", x0: "1", x1: "2" },
  { label: "Transcendental", expression: "cos(x) - x", x0: "0", x1: "1" },
  { label: "Secante horizontal", expression: "x^2 + 1", x0: "-1", x1: "1", maxIterations: "20" },
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
  const expression = String(inputs.expression).trim();
  if (!expression) {
    const error = new Error("Escreva a função cuja raiz deseja encontrar.");
    error.field = "expression";
    throw error;
  }

  const x0 = parseDecimal(inputs.x0, "o primeiro chute x₀", "x0");
  const x1 = parseDecimal(inputs.x1, "o segundo chute x₁", "x1");
  const epsilon1 = parseDecimal(inputs.epsilon1, "a precisão ε₁", "epsilon1");
  const epsilon2 = parseDecimal(inputs.epsilon2, "a precisão ε₂", "epsilon2");
  const maxIterations = Number(inputs.maxIterations);

  if (x0 === x1) {
    const error = new Error("Use dois chutes iniciais distintos.");
    error.field = "x1";
    throw error;
  }
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
  if (inputs.stopMode !== "all" && inputs.stopMode !== "any") {
    const error = new Error("Escolha o modo E ou OU para os critérios de parada.");
    error.field = "stopMode";
    throw error;
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 200) {
    const error = new Error("Use um máximo entre 1 e 200 iterações.");
    error.field = "maxIterations";
    throw error;
  }

  return { expression, x0, x1, epsilon1, epsilon2, stopMode: inputs.stopMode, maxIterations };
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
    "exact-root": "uma raiz exata foi encontrada",
    "both-criteria": "as duas precisões foram satisfeitas",
    "step-tolerance": "a variação entre aproximações satisfez ε₁",
    "residual-tolerance": "o resíduo satisfez ε₂",
    "zero-slope": "os dois pontos geraram uma secante horizontal",
    "slope-unavailable": "não foi possível calcular uma inclinação finita para a secante",
    "function-unavailable": "a nova aproximação ficou fora do domínio da função",
    "numeric-failure": "a correção ou a nova aproximação excedeu os limites numéricos",
    "machine-precision": "a precisão numérica da máquina foi alcançada antes do resíduo desejado",
    divergence: "a sequência deixou a região numérica segura e apresentou divergência",
    "max-iterations": "o limite de iterações foi alcançado",
  };
  return labels[reason] || "o critério de parada foi alcançado";
}

function statusLabel(run) {
  if (run.converged) return "Convergência concluída";
  const labels = {
    "zero-slope": "Secante horizontal",
    "slope-unavailable": "Inclinação indisponível",
    "function-unavailable": "Fora do domínio",
    "numeric-failure": "Falha numérica",
    "machine-precision": "Precisão da máquina",
    divergence: "Divergência detectada",
    "max-iterations": "Limite alcançado",
  };
  return labels[run.reason] || "Execução encerrada";
}

function warningTitle(reason) {
  const labels = {
    "zero-slope": "O próximo passo não pôde ser calculado",
    "slope-unavailable": "O próximo passo não pôde ser calculado",
    "function-unavailable": "O próximo ponto saiu do domínio da função",
    "numeric-failure": "A iteração saiu dos limites numéricos",
    "machine-precision": "A aproximação estagnou",
    divergence: "A sequência divergiu",
    "max-iterations": "A aproximação ainda não atingiu o critério selecionado",
  };
  return labels[reason] || "A execução foi encerrada";
}

function IterationTable({ run, activeIndex, onSelect }) {
  return (
    <details className="newton-table-panel bisection-table-panel">
      <summary>Consultar tabela completa ({run.iterations.length} linhas, de 0 a {run.iterations.at(-1)?.iteration ?? 0})</summary>
      <div className="newton-table-scroll bisection-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Iteração</th>
              <th scope="col">xₙ₋₁</th>
              <th scope="col">xₙ</th>
              <th scope="col">xₙ₊₁</th>
              <th scope="col">|xₙ₊₁ − xₙ|</th>
              <th scope="col">|f(x)|</th>
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
                <td>{formatNumber(step.previousX, 10)}</td>
                <td>{formatNumber(step.currentBeforeStep ?? step.x, 10)}</td>
                <td>{step.iteration === 0 ? "—" : formatNumber(step.x, 10)}</td>
                <td>{formatNumber(step.delta, 8)}</td>
                <td>{formatNumber(step.residual, 8)}</td>
                <td>{step.stop ? "sim" : "não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function SecantSimulatorPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [formError, setFormError] = useState(null);
  const [run, setRun] = useState(() => runSecant(normalizeInputs(DEFAULT_INPUTS)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);
  const playbackRef = useRef(null);

  const hasIterations = run.iterations.length > 0;
  const canPlay = run.iterations.length > 1;
  const lastIndex = Math.max(0, run.iterations.length - 1);
  const activeStep = run.iterations[Math.min(activeIndex, lastIndex)] || null;
  const activeApproximation = finite(activeStep?.x) ?? finite(run.root);
  const activeResidual = finite(activeStep?.residual);
  const isAtEnd = activeIndex >= lastIndex;

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
      const result = runSecant(normalized);
      setRun(result);
      setActiveIndex(0);
      setFormError(null);
      setIsPlaying(false);

      if (scrollToPlayback) {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
        window.requestAnimationFrame(() => {
          playbackRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        });
      }
    } catch (error) {
      setIsPlaying(false);
      setFormError({ field: error.field || "expression", message: error.message });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    executeSimulation(inputs, true);
  }

  function loadExample(example) {
    const { label: _label, ...exampleInputs } = example;
    const nextInputs = { ...DEFAULT_INPUTS, ...exampleInputs };
    setInputs(nextInputs);
    executeSimulation(nextInputs);
  }

  function selectIteration(index) {
    setIsPlaying(false);
    setActiveIndex(Math.max(0, Math.min(index, lastIndex)));
  }

  return (
    <div className="newton-page page-shell bisection-page">
      <header className="newton-header poincare-simulator-header">
        <MathRibbon />
        <Link className="newton-back-link poincare-back-link" to="/espaco-poincare">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao Espaço Poincaré
        </Link>
        <div className="newton-title poincare-simulator-title">
          <p className="eyebrow">Espaço Poincaré · Simulador 05</p>
          <h1>Método das <em>secantes</em></h1>
          <p>
            Acompanhe duas aproximações livres definirem uma reta secante e veja
            cada interseção com o eixo x virar o próximo candidato à raiz.
          </p>
        </div>
        <div className="newton-header-formula poincare-header-formula" aria-hidden="true" style={{ lineHeight: 1.35 }}>
          <span>xₙ₊₁ = xₙ − f(xₙ)(xₙ − xₙ₋₁)</span>
          <span>────────────────────</span>
          <span>f(xₙ) − f(xₙ₋₁)</span>
        </div>
      </header>

      <main className="newton-main bisection-main">
        <section className="newton-setup bisection-setup" aria-labelledby="secant-parameters-title">
          <div className="newton-section-heading bisection-section-heading">
            <span>01</span>
            <div>
              <p className="section-kicker">Escolha dois pontos de partida</p>
              <h2 id="secant-parameters-title">Parâmetros da simulação</h2>
            </div>
          </div>

          <form className="newton-form bisection-form" onSubmit={handleSubmit} noValidate>
            <label className="newton-function-field bisection-function-field" htmlFor="secant-expression">
              <span>Função <i>f(x)</i></span>
              <span className="newton-expression-input bisection-expression-input">
                <b aria-hidden="true">f(x) =</b>
                <input
                  id="secant-expression"
                  name="expression"
                  type="text"
                  value={inputs.expression}
                  onChange={(event) => updateInput("expression", event.target.value)}
                  aria-invalid={formError?.field === "expression"}
                  aria-describedby="secant-function-help secant-simulator-error"
                  autoComplete="off"
                  spellCheck="false"
                />
              </span>
              <small id="secant-function-help">
                Use x, +, −, *, /, ^; sin/sen, cos, sqrt/raiz, cbrt, exp, ln e log. Ângulos em radianos.
              </small>
            </label>

            <div className="newton-form-grid bisection-form-grid">
              <label htmlFor="secant-x0">
                <span>Primeiro chute <i>x₀</i></span>
                <input id="secant-x0" type="text" inputMode="decimal" value={inputs.x0} onChange={(event) => updateInput("x0", event.target.value)} aria-invalid={formError?.field === "x0"} aria-describedby="secant-simulator-error" />
              </label>
              <label htmlFor="secant-x1">
                <span>Segundo chute <i>x₁</i></span>
                <input id="secant-x1" type="text" inputMode="decimal" value={inputs.x1} onChange={(event) => updateInput("x1", event.target.value)} aria-invalid={formError?.field === "x1"} aria-describedby="secant-simulator-error" />
              </label>
              <label htmlFor="secant-epsilon-1">
                <span>Precisão <i>ε₁</i> · variação</span>
                <input id="secant-epsilon-1" type="text" inputMode="decimal" value={inputs.epsilon1} onChange={(event) => updateInput("epsilon1", event.target.value)} aria-invalid={formError?.field === "epsilon1"} aria-describedby="secant-simulator-error" />
              </label>
              <label htmlFor="secant-epsilon-2">
                <span>Precisão <i>ε₂</i> · resíduo</span>
                <input id="secant-epsilon-2" type="text" inputMode="decimal" value={inputs.epsilon2} onChange={(event) => updateInput("epsilon2", event.target.value)} aria-invalid={formError?.field === "epsilon2"} aria-describedby="secant-simulator-error" />
              </label>
              <label htmlFor="secant-stop-mode">
                <span>Critérios de parada</span>
                <select id="secant-stop-mode" value={inputs.stopMode} onChange={(event) => updateInput("stopMode", event.target.value)} aria-invalid={formError?.field === "stopMode"} aria-describedby="secant-simulator-error">
                  <option value="all">Ambos os critérios (E)</option>
                  <option value="any">Qualquer critério (OU)</option>
                </select>
                <small>E é o modo padrão.</small>
              </label>
              <label htmlFor="secant-max-iterations">
                <span>Máx. de iterações</span>
                <input id="secant-max-iterations" type="number" min="1" max="200" step="1" value={inputs.maxIterations} onChange={(event) => updateInput("maxIterations", event.target.value)} aria-invalid={formError?.field === "maxIterations"} aria-describedby="secant-simulator-error" />
                <small>N atualizações, além da linha inicial n = 0.</small>
              </label>
            </div>

            <div className="newton-examples bisection-examples" aria-label="Exemplos prontos">
              <span>Carregar exemplo:</span>
              {EXAMPLES.map((example) => (
                <button key={example.label} type="button" onClick={() => loadExample(example)}>{example.label}</button>
              ))}
            </div>

            {formError ? (
              <p className="newton-form-error bisection-form-error" id="secant-simulator-error" role="alert">
                <TriangleAlert size={17} aria-hidden="true" /> {formError.message}
              </p>
            ) : (
              <p className="newton-form-note bisection-form-note" id="secant-simulator-error">
                Parada quando |xₙ₊₁ − xₙ| &lt; ε₁ e/ou |f(xₙ₊₁)| &lt; ε₂. Não é necessário intervalo com troca de sinal.
              </p>
            )}

            <button className="newton-run-button bisection-run-button" type="submit">
              <Sparkles size={17} aria-hidden="true" /> Executar simulação
            </button>
          </form>
        </section>

        <section className="newton-results bisection-results" aria-labelledby="secant-simulation-title">
          <div className="newton-results-heading bisection-results-heading">
            <div className="newton-section-heading bisection-section-heading">
              <span>02</span>
              <div>
                <p className="section-kicker">Siga x₀, x₁, x₂, …</p>
                <h2 id="secant-simulation-title">Secantes em movimento</h2>
              </div>
            </div>
            <div className={`newton-run-status bisection-run-status ${isAtEnd ? (run.converged ? "is-finished" : "is-warning") : ""}`} aria-live="polite">
              {isAtEnd ? (run.converged ? <CircleCheck size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />) : <Gauge size={16} aria-hidden="true" />}
              {isAtEnd ? statusLabel(run) : isPlaying ? "Simulação em curso" : activeIndex === 0 ? "Pronto para reproduzir" : "Simulação pausada"}
            </div>
          </div>

          <div className="newton-metrics bisection-metrics" aria-live="polite">
            <div>
              <span>Aproximação atual</span>
              <strong>x ≈ {formatNumber(activeApproximation, 10)}</strong>
            </div>
            <div>
              <span>Variação</span>
              <strong>|xₙ₊₁ − xₙ| = {formatNumber(activeStep?.delta, 7)}</strong>
            </div>
            <div>
              <span>Resíduo</span>
              <strong>|f(x)| = {formatNumber(activeResidual, 7)}</strong>
            </div>
            <div>
              <span>Critério selecionado</span>
              <strong>{run.stopMode === "all" ? "ε₁ E ε₂" : "ε₁ OU ε₂"} · Stop? {activeStep?.stop ? "sim" : "não"}</strong>
            </div>
          </div>

          <div ref={playbackRef} className="newton-playback bisection-playback">
            <div className="newton-controls bisection-controls" aria-label="Controles da simulação">
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

            <label className="newton-timeline bisection-timeline" htmlFor="secant-iteration-timeline">
              <span>
                {hasIterations ? <>Iteração <strong>{activeStep.iteration}</strong> de {lastIndex}</> : <>Verificação dos chutes iniciais</>}
              </span>
              <input id="secant-iteration-timeline" type="range" min="0" max={lastIndex} value={activeIndex} disabled={!canPlay} style={{ "--timeline-progress": `${progress}%` }} onChange={(event) => selectIteration(Number(event.target.value))} />
            </label>

            <label className="newton-speed bisection-speed" htmlFor="secant-simulation-speed">
              Velocidade
              <select id="secant-simulation-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                {SPEEDS.map((option) => <option key={option.delay} value={option.delay}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="newton-workspace bisection-workspace">
            <div className="newton-visual-panel bisection-visual-panel">
              <div className="newton-panel-label bisection-panel-label">
                <span>Gráfico da secante + histórico</span>
                <code>f(x) = {run.expression}</code>
              </div>
              <SecantPlot run={run} activeIndex={activeIndex} />
            </div>
            <SecantTerminal run={run} activeIndex={activeIndex} />
          </div>

          {isAtEnd ? (
            <p className={`newton-conclusion bisection-conclusion ${run.converged ? "" : "is-warning"}`}>
              {run.converged ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
              <span>
                <strong>
                  {run.converged ? `Raiz aproximada: x* ≈ ${formatNumber(run.root, 12)}` : warningTitle(run.reason)}
                </strong>{" — "}{reasonLabel(run.reason)}.
                {finite(run.fRoot) !== null ? ` Resíduo final |f(x)| = ${formatNumber(Math.abs(run.fRoot), 7)}.` : ""}
              </span>
            </p>
          ) : null}

          {hasIterations ? <IterationTable run={run} activeIndex={activeIndex} onSelect={selectIteration} /> : null}
        </section>

        <aside className="newton-method-note bisection-method-note">
          <span aria-hidden="true">i</span>
          <div>
            <h2>Como a secante substitui a derivada?</h2>
            <p>
              O método usa a inclinação média entre dois pontos recentes no lugar de f′(xₙ). A interseção dessa
              reta com o eixo x produz a próxima aproximação. Diferente da falsa posição, os pontos não precisam
              cercar uma raiz, então o método pode ser rápido quando os chutes são bons e frágil quando a secante
              fica horizontal ou leva a sequência para longe.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default SecantSimulatorPage;
