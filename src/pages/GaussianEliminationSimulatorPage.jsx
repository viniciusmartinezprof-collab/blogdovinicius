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
import GaussianMatrixView from "../components/poincare/GaussianMatrixView.jsx";
import GaussianTerminal from "../components/poincare/GaussianTerminal.jsx";
import {
  parseAugmentedMatrix,
  runGaussianElimination,
} from "../lib/gaussianElimination.js";

const DEFAULT_INPUTS = {
  matrixText: "2 1 -1 | 8\n-3 -1 2 | -11\n-2 1 2 | -3",
  tolerance: "0.0000000001",
};

const EXAMPLES = [
  {
    label: "3×3 clássico",
    matrixText: "2 1 -1 | 8\n-3 -1 2 | -11\n-2 1 2 | -3",
  },
  {
    label: "Precisa pivô",
    matrixText: "0 2 | 9\n1 -1 | 1",
  },
  {
    label: "Singular",
    matrixText: "1 2 | 3\n2 4 | 6",
  },
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
  const matrix = parseAugmentedMatrix(inputs.matrixText);
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

function formatSolution(solution) {
  if (!solution) return "—";
  return solution.map((value, index) => `x${index + 1} ≈ ${formatNumber(value)}`).join(" · ");
}

function stepKindLabel(type) {
  const labels = {
    initial: "Matriz inicial",
    pivot: "Escolha de pivô",
    swap: "Troca de linhas",
    skip: "Linha já zerada",
    eliminate: "Eliminação",
    triangular: "Forma triangular",
    "back-substitution": "Substituição",
    singular: "Sistema singular",
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
              <th scope="col">Fator</th>
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
                <td>{step.factor === undefined ? "—" : formatNumber(step.factor)}</td>
                <td>{step.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function GaussianEliminationSimulatorPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [formError, setFormError] = useState(null);
  const [run, setRun] = useState(() => runGaussianElimination(normalizeInputs(DEFAULT_INPUTS)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);
  const playbackRef = useRef(null);

  const lastIndex = Math.max(0, run.steps.length - 1);
  const activeStep = run.steps[Math.min(activeIndex, lastIndex)];
  const isAtEnd = activeIndex >= lastIndex;
  const canPlay = run.steps.length > 1;
  const progress = lastIndex === 0 ? 100 : (activeIndex / lastIndex) * 100;
  const size = run.matrix.length;

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

  function updateInput(field, value) {
    setInputs((current) => ({ ...current, [field]: value }));
    if (formError) setFormError(null);
  }

  function executeSimulation(nextInputs = inputs, scrollToResults = false) {
    try {
      const normalized = normalizeInputs(nextInputs);
      const result = runGaussianElimination(normalized);
      setRun(result);
      setActiveIndex(0);
      setFormError(null);
      setIsPlaying(false);

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
      setIsPlaying(false);
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

  function selectStep(index) {
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
          <p className="eyebrow">Espaço Poincaré · Simulador 06</p>
          <h1>Eliminação <em>gaussiana</em></h1>
          <p>
            Transforme um sistema linear em matriz triangular, acompanhe cada
            operação elementar e veja a solução nascer na substituição retroativa.
          </p>
        </div>
        <div className="poincare-header-formula" aria-hidden="true">
          <span>Lᵢ ← Lᵢ − mᵢₖLₖ</span>
          <span>──────────────</span>
          <span>Ux = c</span>
        </div>
      </header>

      <main className="bisection-main">
        <section className="bisection-setup" aria-labelledby="parameters-title">
          <div className="bisection-section-heading">
            <span>01</span>
            <div>
              <p className="section-kicker">Prepare o sistema</p>
              <h2 id="parameters-title">Matriz aumentada</h2>
            </div>
          </div>

          <form className="bisection-form gaussian-form" onSubmit={handleSubmit} noValidate>
            <label className="gaussian-matrix-field" htmlFor="gaussian-matrix">
              <span>Sistema em forma <i>[A | b]</i></span>
              <textarea
                id="gaussian-matrix"
                value={inputs.matrixText}
                onChange={(event) => updateInput("matrixText", event.target.value)}
                aria-invalid={formError?.field === "matrix"}
                aria-describedby="matrix-help simulator-error"
                spellCheck="false"
              />
              <small id="matrix-help">
                Escreva uma equação por linha. Separe coeficientes por espaços e use | antes do termo independente.
              </small>
            </label>

            <div className="bisection-form-grid gaussian-control-grid">
              <label htmlFor="gaussian-tolerance">
                <span>Tolerância numérica <i>τ</i></span>
                <input
                  id="gaussian-tolerance"
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
                O simulador usa pivoteamento parcial e aceita sistemas de 2×2 até 6×6.
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
                <h2 id="simulation-title">Operações elementares</h2>
              </div>
            </div>
            <div className={`bisection-run-status ${isAtEnd ? (run.converged ? "is-finished" : "is-warning") : ""}`}>
              {isAtEnd
                ? run.converged
                  ? <CircleCheck size={16} aria-hidden="true" />
                  : <TriangleAlert size={16} aria-hidden="true" />
                : <Gauge size={16} aria-hidden="true" />}
              {isAtEnd
                ? run.converged
                  ? "Solução única"
                  : "Sem solução única"
                : isPlaying
                  ? "Simulação em curso"
                  : activeIndex === 0
                    ? "Pronto para reproduzir"
                    : "Simulação pausada"}
            </div>
          </div>

          <div className="bisection-metrics" aria-live="polite">
            <div>
              <span>Dimensão</span>
              <strong>{size} equações · {size} incógnitas</strong>
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
              <span>Solução</span>
              <strong>{isAtEnd && run.converged ? formatSolution(run.solution) : "em construção"}</strong>
            </div>
          </div>

          <div className="bisection-playback" ref={playbackRef}>
            <div className="bisection-controls" aria-label="Controles da simulação">
              <button type="button" onClick={() => selectStep(0)} disabled={activeIndex === 0} title="Reiniciar">
                <RotateCcw size={17} aria-hidden="true" /><span className="sr-only">Reiniciar</span>
              </button>
              <button type="button" onClick={() => selectStep(activeIndex - 1)} disabled={activeIndex === 0}>
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
              <button type="button" onClick={() => selectStep(activeIndex + 1)} disabled={isAtEnd}>
                Próxima <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            <label className="bisection-timeline" htmlFor="gaussian-timeline">
              <span>Passo <strong>{activeIndex}</strong> de {lastIndex}</span>
              <input
                id="gaussian-timeline"
                type="range"
                min="0"
                max={lastIndex}
                value={activeIndex}
                disabled={!canPlay}
                style={{ "--timeline-progress": `${progress}%` }}
                onChange={(event) => selectStep(Number(event.target.value))}
              />
            </label>

            <label className="bisection-speed" htmlFor="simulation-speed">
              Velocidade
              <select id="simulation-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                {SPEEDS.map((option) => <option key={option.delay} value={option.delay}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="bisection-workspace">
            <div className="bisection-visual-panel">
              <div className="bisection-panel-label">
                <span>Matriz da etapa</span>
                <code>{activeStep?.title}</code>
              </div>
              <GaussianMatrixView step={activeStep} />
            </div>
            <GaussianTerminal run={run} activeIndex={activeIndex} />
          </div>

          {isAtEnd ? (
            <p className={`bisection-conclusion ${run.converged ? "" : "is-warning"}`}>
              {run.converged ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
              <span>
                <strong>{run.converged ? `Solução: ${formatSolution(run.solution)}` : "Não há solução única detectável"}</strong>{" — "}
                {run.converged
                  ? "a matriz foi reduzida à forma triangular e resolvida por substituição retroativa."
                  : "um pivô ficou numericamente nulo; o sistema pode ser indeterminado ou incompatível."}
              </span>
            </p>
          ) : null}

          <StepTable run={run} activeIndex={activeIndex} onSelect={selectStep} />
        </section>

        <aside className="bisection-method-note">
          <span aria-hidden="true">i</span>
          <div>
            <h2>O que está sendo simulado?</h2>
            <p>
              A eliminação gaussiana aplica operações elementares nas linhas para
              zerar os coeficientes abaixo da diagonal. Com pivoteamento parcial,
              o maior coeficiente disponível sobe para a posição de pivô antes da
              eliminação, reduzindo erros de arredondamento na aritmética do navegador.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default GaussianEliminationSimulatorPage;
