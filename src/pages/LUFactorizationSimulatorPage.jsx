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
import LUFactorizationTerminal from "../components/poincare/LUFactorizationTerminal.jsx";
import LUFactorizationView from "../components/poincare/LUFactorizationView.jsx";
import { parseSquareMatrix, runLUFactorization } from "../lib/luFactorization.js";

const DEFAULT_INPUTS = {
  matrixText: "2 1 1\n4 -6 0\n-2 7 2",
  tolerance: "0.0000000001",
};

const EXAMPLES = [
  { label: "3×3 clássico", matrixText: "2 1 1\n4 -6 0\n-2 7 2" },
  { label: "Precisa pivô", matrixText: "0 2 1\n3 4 5\n6 7 8" },
  { label: "Singular", matrixText: "1 2 3\n2 4 6\n1 1 1" },
];

const SPEEDS = [
  { label: "0,5×", delay: 1100 },
  { label: "1×", delay: 650 },
  { label: "2×", delay: 300 },
  { label: "4×", delay: 150 },
  { label: "8×", delay: 75 },
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
  const matrix = parseSquareMatrix(inputs.matrixText);
  const tolerance = parseDecimal(inputs.tolerance, "tolerância");

  if (tolerance <= 0) {
    const error = new Error("A tolerância precisa ser maior que zero.");
    error.field = "tolerance";
    throw error;
  }

  return { matrix, tolerance };
}

function formatNumber(value, digits = 8) {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return value.toExponential(5).replace("e+", "e");
  }

  return Number(value.toPrecision(digits)).toString();
}

function stepKindLabel(type) {
  const labels = {
    initial: "Matriz inicial",
    pivot: "Escolha de pivô",
    swap: "Permutação",
    eliminate: "Multiplicador",
    singular: "Sistema singular",
    done: "Fatoração pronta",
  };

  return labels[type] || "Passo registrado";
}

function StepTable({ run, activeIndex, onSelect }) {
  return (
    <details className="bisection-table-panel">
      <summary>Consultar roteiro completo ({run.steps.length} passos)</summary>
      <div className="bisection-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Passo</th>
              <th scope="col">Tipo</th>
              <th scope="col">Pivô</th>
              <th scope="col">Linha alvo</th>
              <th scope="col">Multiplicador</th>
              <th scope="col">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {run.steps.map((step, index) => (
              <tr key={`${step.type}-${index}`} className={index === activeIndex ? "is-active" : ""}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(index)} aria-label={`Ver passo ${index}`}>
                    {index}
                  </button>
                </th>
                <td>{stepKindLabel(step.type)}</td>
                <td>{step.pivotRow === undefined ? "—" : `L${step.pivotRow + 1}`}</td>
                <td>{step.targetRow === undefined ? "—" : `L${step.targetRow + 1}`}</td>
                <td>{step.multiplier === undefined ? "—" : formatNumber(step.multiplier)}</td>
                <td>{step.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function makeRuns(inputs) {
  const normalized = normalizeInputs(inputs);

  return {
    withoutPivoting: runLUFactorization({ ...normalized, pivoting: false }),
    withPivoting: runLUFactorization({ ...normalized, pivoting: true }),
  };
}

function getStatusLabel(run, activeIndex, isPlaying) {
  const lastIndex = Math.max(0, run.steps.length - 1);
  const isAtEnd = activeIndex >= lastIndex;

  if (isAtEnd) return run.converged ? "Fatoração pronta" : "Pivô nulo";
  if (isPlaying) return "Simulação em curso";
  if (activeIndex === 0) return "Pronto para reproduzir";
  return "Simulação pausada";
}

function SimulationPanel({
  id,
  order,
  title,
  kicker,
  run,
  activeIndex,
  isPlaying,
  speed,
  setSpeed,
  onSelectStep,
  onTogglePlay,
  playbackRef,
}) {
  const lastIndex = Math.max(0, run.steps.length - 1);
  const activeStep = run.steps[Math.min(activeIndex, lastIndex)];
  const isAtEnd = activeIndex >= lastIndex;
  const canPlay = run.steps.length > 1;
  const progress = lastIndex === 0 ? 100 : (activeIndex / lastIndex) * 100;
  const size = run.matrix.length;

  return (
    <section className="bisection-results lu-simulation-panel" aria-labelledby={`${id}-simulation-title`}>
      <div className="bisection-results-heading">
        <div className="bisection-section-heading">
          <span>{order}</span>
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2 id={`${id}-simulation-title`}>{title}</h2>
          </div>
        </div>
        <div className={`bisection-run-status ${isAtEnd ? (run.converged ? "is-finished" : "is-warning") : ""}`}>
          {isAtEnd
            ? run.converged
              ? <CircleCheck size={16} aria-hidden="true" />
              : <TriangleAlert size={16} aria-hidden="true" />
            : <Gauge size={16} aria-hidden="true" />}
          {getStatusLabel(run, activeIndex, isPlaying)}
        </div>
      </div>

      <div className="bisection-metrics" aria-live="polite">
        <div>
          <span>Dimensão</span>
          <strong>{size} × {size}</strong>
        </div>
        <div>
          <span>Passo atual</span>
          <strong>{stepKindLabel(activeStep?.type)}</strong>
        </div>
        <div>
          <span>Pivô em foco</span>
          <strong>{activeStep?.pivotRow === undefined ? "—" : `L${activeStep.pivotRow + 1}, C${(activeStep.column ?? 0) + 1}`}</strong>
        </div>
        <div>
          <span>Forma</span>
          <strong>{run.pivoting ? "PA = LU" : "A = LU"}</strong>
        </div>
      </div>

      <div className="bisection-playback" ref={playbackRef}>
        <div className="bisection-controls" aria-label={`Controles da simulação ${title}`}>
          <button type="button" onClick={() => onSelectStep(0)} disabled={activeIndex === 0} title="Reiniciar">
            <RotateCcw size={17} aria-hidden="true" /><span className="sr-only">Reiniciar</span>
          </button>
          <button type="button" onClick={() => onSelectStep(activeIndex - 1)} disabled={activeIndex === 0}>
            <ChevronLeft size={18} aria-hidden="true" /> Anterior
          </button>
          <button
            className="is-primary"
            type="button"
            onClick={onTogglePlay}
            disabled={!canPlay}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {!canPlay ? "Concluído" : isPlaying ? "Pausar" : isAtEnd || activeIndex === 0 ? "Reproduzir" : "Continuar"}
          </button>
          <button type="button" onClick={() => onSelectStep(activeIndex + 1)} disabled={isAtEnd}>
            Próxima <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <label className="bisection-timeline" htmlFor={`${id}-timeline`}>
          <span>Passo <strong>{activeIndex}</strong> de {lastIndex}</span>
          <input
            id={`${id}-timeline`}
            type="range"
            min="0"
            max={lastIndex}
            value={activeIndex}
            disabled={!canPlay}
            style={{ "--timeline-progress": `${progress}%` }}
            onChange={(event) => onSelectStep(Number(event.target.value))}
          />
        </label>

        <label className="bisection-speed" htmlFor={`${id}-speed`}>
          Velocidade
          <select id={`${id}-speed`} value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {SPEEDS.map((option) => <option key={option.delay} value={option.delay}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className="bisection-workspace">
        <div className="bisection-visual-panel">
          <div className="bisection-panel-label">
            <span>Fatores da etapa</span>
            <code>{activeStep?.title}</code>
          </div>
          <LUFactorizationView step={activeStep} pivoting={run.pivoting} />
        </div>
        <LUFactorizationTerminal run={run} activeIndex={activeIndex} />
      </div>

      {isAtEnd ? (
        <p className={`bisection-conclusion ${run.converged ? "" : "is-warning"}`}>
          {run.converged ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
          <span>
            <strong>{run.converged ? `Fatoração concluída: ${run.pivoting ? "PA = LU" : "A = LU"}` : "Fatoração interrompida"}</strong>{" — "}
            {run.converged
              ? "L armazena os multiplicadores usados na eliminação e U é triangular superior."
              : "um pivô numericamente nulo impede a decomposição neste modo."}
          </span>
        </p>
      ) : null}

      <StepTable run={run} activeIndex={activeIndex} onSelect={onSelectStep} />
    </section>
  );
}

function LUFactorizationSimulatorPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [formError, setFormError] = useState(null);
  const [runs, setRuns] = useState(() => makeRuns(DEFAULT_INPUTS));
  const [activeIndexes, setActiveIndexes] = useState({ withoutPivoting: 0, withPivoting: 0 });
  const [playingPanel, setPlayingPanel] = useState(null);
  const [speed, setSpeed] = useState(650);
  const playbackRef = useRef(null);

  useEffect(() => {
    if (!playingPanel) return undefined;

    const run = runs[playingPanel];
    const activeIndex = activeIndexes[playingPanel];
    const lastIndex = Math.max(0, run.steps.length - 1);
    const isAtEnd = activeIndex >= lastIndex;
    if (isAtEnd) {
      setPlayingPanel(null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setActiveIndexes((current) => ({
        ...current,
        [playingPanel]: Math.min(current[playingPanel] + 1, lastIndex),
      }));
    }, speed);

    return () => window.clearTimeout(timer);
  }, [activeIndexes, playingPanel, runs, speed]);

  function updateInput(field, value) {
    setInputs((current) => ({ ...current, [field]: value }));
    if (formError) setFormError(null);
  }

  function executeSimulation(nextInputs = inputs, scrollToResults = false) {
    try {
      const result = makeRuns(nextInputs);
      setRuns(result);
      setActiveIndexes({ withoutPivoting: 0, withPivoting: 0 });
      setFormError(null);
      setPlayingPanel(null);

      if (scrollToResults) {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
        window.requestAnimationFrame(() => {
          playbackRef.current?.scrollIntoView?.({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        });
      }
    } catch (error) {
      setPlayingPanel(null);
      setFormError({ field: error.field || "matrix", message: error.message });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    executeSimulation(inputs, true);
  }

  function loadExample(example) {
    const nextInputs = { ...DEFAULT_INPUTS, matrixText: example.matrixText };
    setInputs(nextInputs);
    executeSimulation(nextInputs);
  }

  function selectStep(panel, index) {
    const lastIndex = Math.max(0, runs[panel].steps.length - 1);
    setPlayingPanel(null);
    setActiveIndexes((current) => ({
      ...current,
      [panel]: Math.max(0, Math.min(index, lastIndex)),
    }));
  }

  function togglePlay(panel) {
    const lastIndex = Math.max(0, runs[panel].steps.length - 1);
    const isAtEnd = activeIndexes[panel] >= lastIndex;

    if (isAtEnd) {
      setActiveIndexes((current) => ({ ...current, [panel]: 0 }));
    }

    setPlayingPanel((current) => (current === panel ? null : panel));
  }

  return (
    <div className="page-shell bisection-page">
      <header className="poincare-simulator-header">
        <MathRibbon />
        <Link className="poincare-back-link" to="/espaco-poincare">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao Espaço Poincaré
        </Link>
        <div className="poincare-simulator-title">
          <p className="eyebrow">Espaço Poincaré · Simulador 07</p>
          <h1>Fatoração <em>LU</em></h1>
          <p>
            Decomponha uma matriz em fatores triangulares, observe os
            multiplicadores entrarem em L e acompanhe U surgir pela eliminação.
          </p>
        </div>
        <div className="poincare-header-formula" aria-hidden="true">
          <span>PA = LU</span>
          <span>────────</span>
          <span>Ly = Pb · Ux = y</span>
        </div>
      </header>

      <main className="bisection-main">
        <section className="bisection-setup" aria-labelledby="parameters-title">
          <div className="bisection-section-heading">
            <span>01</span>
            <div>
              <p className="section-kicker">Prepare a matriz</p>
              <h2 id="parameters-title">Coeficientes de A</h2>
            </div>
          </div>

          <form className="bisection-form gaussian-form" onSubmit={handleSubmit} noValidate>
            <label className="gaussian-matrix-field" htmlFor="lu-matrix">
              <span>Matriz quadrada <i>A</i></span>
              <textarea
                id="lu-matrix"
                value={inputs.matrixText}
                onChange={(event) => updateInput("matrixText", event.target.value)}
                aria-invalid={formError?.field === "matrix"}
                aria-describedby="matrix-help simulator-error"
                spellCheck="false"
              />
              <small id="matrix-help">
                Escreva uma linha por vez. A matriz deve ser quadrada, sem a coluna dos termos independentes.
              </small>
            </label>

            <div className="bisection-form-grid gaussian-control-grid">
              <label htmlFor="lu-tolerance">
                <span>Tolerância numérica <i>τ</i></span>
                <input
                  id="lu-tolerance"
                  type="text"
                  inputMode="decimal"
                  value={inputs.tolerance}
                  onChange={(event) => updateInput("tolerance", event.target.value)}
                  aria-invalid={formError?.field === "tolerance"}
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
                A mesma matriz será fatorada primeiro sem pivotamento e depois com pivotamento parcial.
              </p>
            )}

            <button className="bisection-run-button" type="submit">
              <Sparkles size={17} aria-hidden="true" /> Executar fatoração
            </button>
          </form>
        </section>

        <SimulationPanel
          id="lu-without-pivoting"
          order="02"
          title="LU sem pivotamento"
          kicker="Primeiro, sem trocar linhas"
          run={runs.withoutPivoting}
          activeIndex={activeIndexes.withoutPivoting}
          isPlaying={playingPanel === "withoutPivoting"}
          speed={speed}
          setSpeed={setSpeed}
          onSelectStep={(index) => selectStep("withoutPivoting", index)}
          onTogglePlay={() => togglePlay("withoutPivoting")}
          playbackRef={playbackRef}
        />

        <SimulationPanel
          id="lu-with-pivoting"
          order="03"
          title="LU com pivotamento parcial"
          kicker="Depois, permitindo permutações"
          run={runs.withPivoting}
          activeIndex={activeIndexes.withPivoting}
          isPlaying={playingPanel === "withPivoting"}
          speed={speed}
          setSpeed={setSpeed}
          onSelectStep={(index) => selectStep("withPivoting", index)}
          onTogglePlay={() => togglePlay("withPivoting")}
        />

        <aside className="bisection-method-note">
          <span aria-hidden="true">i</span>
          <div>
            <h2>Por que LU é útil?</h2>
            <p>
              Depois de fatorar A, vários sistemas Ax = b com a mesma matriz
              podem ser resolvidos rapidamente em duas etapas triangulares:
              sem pivotamento usamos Ly = b e depois Ux = y; com pivotamento,
              a permutação entra como Ly = Pb. A simulação mostra exatamente de
              onde vêm esses fatores em cada caso.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default LUFactorizationSimulatorPage;
