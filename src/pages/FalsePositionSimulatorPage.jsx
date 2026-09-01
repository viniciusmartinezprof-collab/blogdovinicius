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
import FalsePositionPlot from "../components/poincare/FalsePositionPlot.jsx";
import FalsePositionTerminal from "../components/poincare/FalsePositionTerminal.jsx";
import { runFalsePosition } from "../lib/falsePosition.js";

const DEFAULT_INPUTS = {
  expression: "x^3 - x - 2",
  a: "1",
  b: "2",
  epsilon1: "0.0001",
  epsilon2: "0.0001",
  stopMode: "all",
  maxIterations: "50",
};

const EXAMPLES = [
  { label: "Polinômio", expression: "x^3 - x - 2", a: "1", b: "2" },
  { label: "Transcendental", expression: "cos(x) - x", a: "0", b: "1" },
  { label: "Raiz cúbica", expression: "x^3 - 2*x - 5", a: "2", b: "3" },
];

const SPEEDS = [
  { label: "0,5×", delay: 1100 },
  { label: "1×", delay: 650 },
  { label: "2×", delay: 300 },
  { label: "4×", delay: 150 },
  { label: "8×", delay: 75 },
];

function parseDecimal(value, field, label) {
  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number(normalized);
  if (!normalized || !Number.isFinite(parsed)) {
    const error = new Error(`Informe um valor numérico válido para ${label}.`);
    error.field = field;
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

  const a = parseDecimal(inputs.a, "a", "a");
  const b = parseDecimal(inputs.b, "b", "b");
  const epsilon1 = parseDecimal(inputs.epsilon1, "epsilon1", "a precisão ε₁");
  const epsilon2 = parseDecimal(inputs.epsilon2, "epsilon2", "a precisão ε₂");
  const stopMode = inputs.stopMode;
  const maxIterations = Number(inputs.maxIterations);

  if (a >= b) {
    const error = new Error("O limite a precisa ser menor que o limite b.");
    error.field = "interval";
    throw error;
  }
  if (epsilon1 <= 0) {
    const error = new Error("A precisão ε₁ precisa ser maior que zero.");
    error.field = "epsilon1";
    throw error;
  }
  if (epsilon2 <= 0) {
    const error = new Error("A precisão ε₂ precisa ser maior que zero.");
    error.field = "epsilon2";
    throw error;
  }
  if (stopMode !== "all" && stopMode !== "any") {
    const error = new Error("Escolha se a parada exige ambos ou qualquer um dos critérios.");
    error.field = "stopMode";
    throw error;
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 200) {
    const error = new Error("Use um máximo entre 1 e 200 atualizações.");
    error.field = "maxIterations";
    throw error;
  }

  return { expression, a, b, epsilon1, epsilon2, stopMode, maxIterations };
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
    "endpoint-root": "uma das extremidades já era raiz",
    "exact-root": "a interseção da secante encontrou uma raiz exata",
    "both-criteria": "os dois critérios de precisão foram satisfeitos",
    "function-value": "o resíduo |f(xₙ)| ficou menor que ε₂",
    "interval-width": "a largura |b − a| ficou menor que ε₁",
    "machine-precision": "a precisão numérica do navegador foi alcançada",
    "max-iterations": "o limite de atualizações foi alcançado",
  };
  return labels[reason] || "o critério de parada foi alcançado";
}

function formatSign(value) {
  if (value < 0) return "−1";
  if (value > 0) return "+1";
  return "0";
}

function IterationTable({ run, activeIndex, onSelect }) {
  return (
    <details className="bisection-table-panel false-position-table-panel">
      <summary>Consultar tabela completa ({run.iterations.length} linhas)</summary>
      <div className="bisection-table-scroll false-position-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Iteração</th>
              <th scope="col">a</th>
              <th scope="col">b</th>
              <th scope="col">xₙ</th>
              <th scope="col">sign(f(a))</th>
              <th scope="col">sign(f(b))</th>
              <th scope="col">sign(f(xₙ))</th>
              <th scope="col">|b − a|</th>
              <th scope="col">|f(xₙ)|</th>
              <th scope="col">Stop?</th>
            </tr>
          </thead>
          <tbody>
            {run.iterations.map((step, index) => (
              <tr key={`${step.iteration}-${step.estimate}`} className={index === activeIndex ? "is-active" : ""}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(index)} aria-label={`Ver iteração ${step.iteration}`}>
                    {step.iteration}
                  </button>
                </th>
                <td>{formatNumber(step.a)}</td>
                <td>{formatNumber(step.b)}</td>
                <td>{formatNumber(step.estimate)}</td>
                <td>{formatSign(step.signFA)}</td>
                <td>{formatSign(step.signFB)}</td>
                <td>{formatSign(step.signFEstimate)}</td>
                <td>{formatNumber(step.intervalWidth)}</td>
                <td>{formatNumber(step.residual)}</td>
                <td>{step.stop ? "sim" : "não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function FalsePositionSimulatorPage() {
  const playbackRef = useRef(null);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [formError, setFormError] = useState(null);
  const [run, setRun] = useState(() => runFalsePosition(normalizeInputs(DEFAULT_INPUTS)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);

  const hasIterations = run.iterations.length > 0;
  const canPlay = run.iterations.length > 1;
  const lastIndex = Math.max(0, run.iterations.length - 1);
  const activeStep = run.iterations[Math.min(activeIndex, lastIndex)] || null;
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

  function executeSimulation(nextInputs = inputs) {
    try {
      const normalized = normalizeInputs(nextInputs);
      const result = runFalsePosition(normalized);
      setRun(result);
      setActiveIndex(0);
      setFormError(null);
      setIsPlaying(false);
      return true;
    } catch (error) {
      setIsPlaying(false);
      const field = error.code === "NO_SIGN_CHANGE" ? "interval" : error.field || "expression";
      setFormError({ field, message: error.message });
      return false;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!executeSimulation()) return;

    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      playbackRef.current?.scrollIntoView?.({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
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
    <div className="page-shell bisection-page false-position-page">
      <header className="poincare-simulator-header false-position-header">
        <MathRibbon />
        <Link className="poincare-back-link false-position-back-link" to="/espaco-poincare">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao Espaço Poincaré
        </Link>
        <div className="poincare-simulator-title false-position-title">
          <p className="eyebrow">Espaço Poincaré · Simulador 02</p>
          <h1>Método da <em>falsa posição</em></h1>
          <p>
            Acompanhe a reta secante transformar os valores de f(a) e f(b) em uma
            aproximação mais informada, sempre preservando um intervalo com raiz.
          </p>
        </div>
        <div className="poincare-header-formula false-position-header-formula" aria-hidden="true">
          <span>aₙf(bₙ) − bₙf(aₙ)</span>
          <span>─────────────── = xₙ</span>
          <span>f(bₙ) − f(aₙ)</span>
        </div>
      </header>

      <main className="bisection-main false-position-main">
        <section className="bisection-setup false-position-setup" aria-labelledby="false-position-parameters-title">
          <div className="bisection-section-heading false-position-section-heading">
            <span>01</span>
            <div>
              <p className="section-kicker">Prepare o experimento</p>
              <h2 id="false-position-parameters-title">Parâmetros da simulação</h2>
            </div>
          </div>

          <form className="bisection-form false-position-form" onSubmit={handleSubmit} noValidate>
            <label className="bisection-function-field false-position-function-field" htmlFor="false-position-expression">
              <span>Função <i>f(x)</i></span>
              <span className="bisection-expression-input false-position-expression-input">
                <b aria-hidden="true">f(x) =</b>
                <input
                  id="false-position-expression"
                  name="expression"
                  type="text"
                  value={inputs.expression}
                  onChange={(event) => updateInput("expression", event.target.value)}
                  aria-invalid={formError?.field === "expression"}
                  aria-describedby="false-position-function-help false-position-error"
                  autoComplete="off"
                  spellCheck="false"
                />
              </span>
              <small id="false-position-function-help">
                Use x, +, −, *, /, ^; sin/sen, cos, sqrt/raiz, exp, ln e log. Ângulos em radianos.
              </small>
            </label>

            <div className="bisection-form-grid false-position-form-grid">
              <label htmlFor="false-position-a">
                <span>Limite esquerdo <i>a</i></span>
                <input
                  id="false-position-a"
                  type="text"
                  inputMode="decimal"
                  value={inputs.a}
                  onChange={(event) => updateInput("a", event.target.value)}
                  aria-invalid={formError?.field === "a" || formError?.field === "interval"}
                  aria-describedby="false-position-error"
                />
              </label>
              <label htmlFor="false-position-b">
                <span>Limite direito <i>b</i></span>
                <input
                  id="false-position-b"
                  type="text"
                  inputMode="decimal"
                  value={inputs.b}
                  onChange={(event) => updateInput("b", event.target.value)}
                  aria-invalid={formError?.field === "b" || formError?.field === "interval"}
                  aria-describedby="false-position-error"
                />
              </label>
              <label htmlFor="false-position-epsilon-1">
                <span>Precisão <i>ε₁</i> para |b − a|</span>
                <input
                  id="false-position-epsilon-1"
                  type="text"
                  inputMode="decimal"
                  value={inputs.epsilon1}
                  onChange={(event) => updateInput("epsilon1", event.target.value)}
                  aria-invalid={formError?.field === "epsilon1"}
                  aria-describedby="false-position-error"
                />
              </label>
              <label htmlFor="false-position-epsilon-2">
                <span>Precisão <i>ε₂</i> para |f(xₙ)|</span>
                <input
                  id="false-position-epsilon-2"
                  type="text"
                  inputMode="decimal"
                  value={inputs.epsilon2}
                  onChange={(event) => updateInput("epsilon2", event.target.value)}
                  aria-invalid={formError?.field === "epsilon2"}
                  aria-describedby="false-position-error"
                />
              </label>
              <label className="bisection-speed false-position-stop-mode" htmlFor="false-position-stop-mode">
                <span>Combinação dos critérios</span>
                <select
                  id="false-position-stop-mode"
                  value={inputs.stopMode}
                  onChange={(event) => updateInput("stopMode", event.target.value)}
                  aria-invalid={formError?.field === "stopMode"}
                  aria-describedby="false-position-error"
                >
                  <option value="all">E · atingir ambos</option>
                  <option value="any">OU · atingir qualquer um</option>
                </select>
              </label>
              <label htmlFor="false-position-max-iterations">
                <span>Máx. de atualizações</span>
                <input
                  id="false-position-max-iterations"
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  value={inputs.maxIterations}
                  onChange={(event) => updateInput("maxIterations", event.target.value)}
                  aria-invalid={formError?.field === "maxIterations"}
                  aria-describedby="false-position-error"
                />
              </label>
            </div>

            <div className="bisection-examples false-position-examples" aria-label="Exemplos prontos">
              <span>Carregar exemplo:</span>
              {EXAMPLES.map((example) => (
                <button key={example.label} type="button" onClick={() => loadExample(example)}>
                  {example.label}
                </button>
              ))}
            </div>

            {formError ? (
              <p className="bisection-form-error false-position-form-error" id="false-position-error" role="alert">
                <TriangleAlert size={17} aria-hidden="true" /> {formError.message}
              </p>
            ) : (
              <p className="bisection-form-note false-position-form-note" id="false-position-error">
                A linha 0 usa o intervalo inicial. A parada exige {inputs.stopMode === "all" ? "os dois critérios (E)" : "qualquer critério (OU)"}, sempre com comparação estrita &lt; ε.
              </p>
            )}

            <button className="bisection-run-button false-position-run-button" type="submit">
              <Sparkles size={17} aria-hidden="true" /> Executar simulação
            </button>
          </form>
        </section>

        <section className="bisection-results false-position-results" aria-labelledby="false-position-simulation-title">
          <div className="bisection-results-heading false-position-results-heading">
            <div className="bisection-section-heading false-position-section-heading">
              <span>02</span>
              <div>
                <p className="section-kicker">Acompanhe a geometria</p>
                <h2 id="false-position-simulation-title">Secantes em movimento</h2>
              </div>
            </div>
            <div className={`bisection-run-status false-position-run-status ${isAtEnd ? (run.converged ? "is-finished" : "is-warning") : ""}`}>
              {isAtEnd
                ? run.converged
                  ? <CircleCheck size={16} aria-hidden="true" />
                  : <TriangleAlert size={16} aria-hidden="true" />
                : <Gauge size={16} aria-hidden="true" />}
              {isAtEnd
                ? run.converged
                  ? "Convergência concluída"
                  : run.reason === "machine-precision"
                    ? "Precisão da máquina"
                    : "Limite alcançado"
                : isPlaying
                  ? "Simulação em curso"
                  : activeIndex === 0
                    ? "Pronto para reproduzir"
                    : "Simulação pausada"}
            </div>
          </div>

          <div className="bisection-metrics false-position-metrics" aria-live="polite">
            <div>
              <span>Interseção da secante</span>
              <strong>xₙ ≈ {formatNumber(activeStep?.estimate ?? run.root, 10)}</strong>
            </div>
            <div>
              <span>Resíduo atual</span>
              <strong>|f(xₙ)| = {formatNumber(activeStep?.residual, 7)}</strong>
            </div>
            <div>
              <span>Largura exibida</span>
              <strong>|b − a| = {formatNumber(activeStep?.intervalWidth, 7)}</strong>
            </div>
            <div>
              <span>Critérios nesta linha</span>
              <strong>C₁ {activeStep?.intervalCriterionMet ? "sim" : "não"} · C₂ {activeStep?.functionCriterionMet ? "sim" : "não"}</strong>
            </div>
          </div>

          <div ref={playbackRef} className="bisection-playback false-position-playback">
            <div className="bisection-controls false-position-controls" aria-label="Controles da simulação">
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

            <label className="bisection-timeline false-position-timeline" htmlFor="false-position-timeline">
              <span>
                {hasIterations ? (
                  <>Iteração <strong>{activeStep.iteration}</strong> de {run.iterations.at(-1)?.iteration ?? 0}</>
                ) : (
                  <>Verificação das extremidades</>
                )}
              </span>
              <input
                id="false-position-timeline"
                type="range"
                min="0"
                max={lastIndex}
                value={activeIndex}
                disabled={!canPlay}
                style={{ "--timeline-progress": `${progress}%` }}
                onChange={(event) => selectIteration(Number(event.target.value))}
              />
            </label>

            <label className="bisection-speed false-position-speed" htmlFor="false-position-speed">
              Velocidade
              <select id="false-position-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                {SPEEDS.map((option) => <option key={option.delay} value={option.delay}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="bisection-workspace false-position-workspace">
            <div className="bisection-visual-panel false-position-visual-panel">
              <div className="bisection-panel-label false-position-panel-label">
                <span>Função, secante e histórico</span>
                <code>f(x) = {run.expression}</code>
              </div>
              <FalsePositionPlot run={run} activeIndex={activeIndex} />
            </div>
            <FalsePositionTerminal run={run} activeIndex={activeIndex} />
          </div>

          {isAtEnd ? (
            <p className={`bisection-conclusion false-position-conclusion ${run.converged ? "" : "is-warning"}`}>
              {run.converged ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
              <span>
                <strong>{run.converged ? `Raiz aproximada: x ≈ ${formatNumber(run.root, 12)}` : "A aproximação ainda não satisfez a regra de parada"}</strong>{" — "}
                {reasonLabel(run.reason)}.
              </span>
            </p>
          ) : null}

          {hasIterations ? <IterationTable run={run} activeIndex={activeIndex} onSelect={selectIteration} /> : null}
        </section>

        <aside className="bisection-method-note false-position-method-note">
          <span aria-hidden="true">i</span>
          <div>
            <h2>O que torna a falsa posição especial?</h2>
            <p>
              Como na bisseção, a troca de sinal mantém a raiz cercada. Mas c não é o
              ponto médio: é onde a reta que liga (a, f(a)) e (b, f(b)) cruza o eixo x.
              Assim, a altura da função influencia o próximo palpite. O gráfico mantém
              o domínio inicial fixo para tornar visíveis tanto o encolhimento do cerco
              quanto a trajetória de xₙ. Em funções muito assimétricas, um extremo pode
              permanecer quase imóvel; esse fenômeno explica por que o método às vezes
              avança bem mais devagar de um dos lados. Por isso, o simulador confirma a
              parada por |b − a| &lt; ε₁ e |f(xₙ)| &lt; ε₂. Você decide se basta um
              dos testes (OU) ou se ambos precisam ser satisfeitos (E).
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default FalsePositionSimulatorPage;
