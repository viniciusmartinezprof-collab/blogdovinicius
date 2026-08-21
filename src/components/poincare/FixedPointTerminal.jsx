import { useEffect, useRef } from "react";

const COLUMNS = [
  { label: "it", value: (step) => String(step.iteration ?? "—") },
  { label: "x_n", value: (step) => formatNumber(step.xCurrent) },
  { label: "g(x_n)", value: (step) => formatNumber(step.xNext) },
  { label: "|Δx|", value: (step) => formatNumber(step.stepError) },
  { label: "resíduo", value: (step) => formatNumber(step.residual) },
  { label: "|g'|", value: (step) => formatDerivative(step.derivativeEstimate) },
];

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 8) {
  const number = finite(value);
  if (number === null) return value === Infinity ? "+∞" : value === -Infinity ? "−∞" : "—";
  if (number === 0) return "0";
  const magnitude = Math.abs(number);
  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return number.toExponential(6).replace(/\.0+(?=e)/, "").replace(/(\.\d*?[1-9])0+(?=e)/, "$1").replace("e+", "e");
  }
  return Number(number.toPrecision(digits)).toString();
}

function formatDerivative(value) {
  const derivative = finite(value);
  return derivative === null ? "n/e" : formatNumber(Math.abs(derivative), 7);
}

function normalizeReason(reason) {
  return String(reason ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function buildTable(visible, allIterations) {
  const rows = visible.map((step) => COLUMNS.map((column) => column.value(step)));
  const widthRows = allIterations.map((step) => COLUMNS.map((column) => column.value(step)));
  const widths = COLUMNS.map((column, columnIndex) => Math.max(
    column.label.length,
    ...widthRows.map((row) => row[columnIndex].length),
  ));
  const align = (cells) => cells.map((cell, index) => cell.padStart(widths[index])).join("  │  ");
  return {
    header: align(COLUMNS.map((column) => column.label)),
    divider: widths.map((width) => "─".repeat(width)).join("──┼──"),
    rows: rows.map(align),
  };
}

function describeLocalBehavior(step) {
  if (!step) return null;
  const derivative = finite(step.derivativeEstimate);
  if (derivative === null) {
    return {
      kind: "is-decision",
      icon: "?",
      text: "Diagnóstico local: não foi possível estimar g′ com segurança neste ponto.",
    };
  }

  const magnitude = Math.abs(derivative);
  if (magnitude < 1) {
    const strength = magnitude < 0.25 ? "forte" : magnitude < 0.75 ? "favorável" : "fraca";
    return {
      kind: "is-validation",
      icon: "↘",
      text: `Contração local ${strength}: |g′(xₙ₊₁)| ≈ ${formatNumber(magnitude, 6)} < 1. Perturbações tendem a encolher.`,
    };
  }

  return {
    kind: "is-warning",
    icon: "↗",
    text: `Alerta local: |g′(xₙ₊₁)| ≈ ${formatNumber(magnitude, 6)} ≥ 1. Erros podem crescer e a convergência não está garantida.`,
  };
}

function describeResult(run, step) {
  const reason = normalizeReason(run?.reason);
  const root = formatNumber(run?.root ?? step?.xNext, 11);
  const residual = formatNumber(Math.abs(finite(run?.residual ?? step?.residual) ?? NaN), 7);
  const count = run?.iterations?.length ?? 0;
  const iterationLabel = count === 1 ? "iteração" : "iterações";

  if (reason === "exact-fixed-point" || reason === "exact-root") {
    return { warning: false, text: `Ponto fixo exato encontrado em ${count} ${iterationLabel}: x = ${root}.` };
  }
  if (reason === "step-size" || reason === "tolerance") {
    return {
      warning: false,
      text: `Passo e resíduo ≤ ε após ${count} ${iterationLabel}. x* ≈ ${root}; |g(x*) − x*| ≈ ${residual}.`,
    };
  }
  if (reason === "divergence") {
    return {
      warning: true,
      text: `Divergência detectada após ${count} ${iterationLabel}. A órbita se afastou ou deixou de produzir valores finitos; último x ≈ ${root}.`,
    };
  }
  if (reason === "machine-precision") {
    return {
      warning: true,
      text: `A precisão numérica da máquina impediu avanço adicional. Último x ≈ ${root}.`,
    };
  }
  if (reason === "max-iterations") {
    return {
      warning: true,
      text: `Limite de ${run?.maxIterations ?? count} ${iterationLabel} atingido sem satisfazer a tolerância. Último x ≈ ${root}.`,
    };
  }
  if (run?.converged) {
    return { warning: false, text: `Convergência alcançada: x* ≈ ${root}, com resíduo ≈ ${residual}.` };
  }
  return { warning: true, text: `Execução encerrada sem convergência. Última aproximação: x ≈ ${root}.` };
}

function FixedPointTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const index = Math.max(0, Math.trunc(finite(activeIndex) ?? 0));
  const visibleCount = Math.min(index + 1, iterations.length);
  const visible = iterations.slice(0, visibleCount);
  const activeStep = visible.at(-1);
  const atEnd = Boolean(run) && (iterations.length === 0 || visibleCount === iterations.length);
  const table = buildTable(visible, iterations);
  const localBehavior = describeLocalBehavior(activeStep);
  const result = atEnd ? describeResult(run, iterations.at(-1)) : null;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "auto" });
  }, [activeIndex, run]);

  return (
    <section className="fixed-point-terminal iteration-terminal" aria-label="Console de iterações do ponto fixo">
      <header className="fixed-point-terminal-header iteration-terminal-header">
        <span className="fixed-point-terminal-dots iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </span>
        <span className="fixed-point-terminal-title iteration-terminal-title">python · ponto_fixo.py</span>
        <span className="fixed-point-terminal-status iteration-terminal-status">saída</span>
      </header>

      <div
        ref={bodyRef}
        className="fixed-point-terminal-body iteration-terminal-body"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {!run ? (
          <p className="fixed-point-terminal-line iteration-terminal-line is-muted">
            <span className="iteration-terminal-prompt" aria-hidden="true">$</span>{" "}
            Configure g(x) e o chute x₀ para iniciar.
          </p>
        ) : (
          <>
            <p className="fixed-point-terminal-line iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>g = lambda x: {run.expression || "g(x)"}</code>
            </p>
            <p className="fixed-point-terminal-line iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>
                ponto_fixo(g, x0={formatNumber(run.initialX)}, tol={formatNumber(run.tolerance)}, max_iter={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="fixed-point-terminal-line iteration-terminal-line is-validation">
              <span aria-hidden="true">✓</span>{" "}
              Estado inicial aceito. Aplicando xₙ₊₁ = g(xₙ) e monitorando passo, resíduo e derivada local.
            </p>

            <div className="fixed-point-terminal-table-wrap iteration-terminal-table-wrap" style={{ overflowX: "auto" }} tabIndex={0}>
              <pre className="fixed-point-terminal-table iteration-terminal-table" aria-label="Tabela das iterações exibidas">
                {table.header}{"\n"}{table.divider}
                {table.rows.map((row, rowIndex) => (
                  <span key={iterations[rowIndex]?.iteration ?? rowIndex}>{"\n"}{row}</span>
                ))}
              </pre>
            </div>

            {activeStep ? (
              <p className="fixed-point-terminal-line iteration-terminal-line is-decision" key={`mapping-${activeStep.iteration}`}>
                <span aria-hidden="true">→</span>{" "}
                x{activeStep.iteration - 1} = {formatNumber(activeStep.xCurrent)} ⟼ g(x{activeStep.iteration - 1}) = x{activeStep.iteration} = {formatNumber(activeStep.xNext)};
                passo = {formatNumber(activeStep.stepError)}.
              </p>
            ) : null}

            {localBehavior ? (
              <p className={`fixed-point-terminal-line iteration-terminal-line ${localBehavior.kind}`} key={`diagnostic-${activeStep?.iteration}`}>
                <span aria-hidden="true">{localBehavior.icon}</span>{" "}{localBehavior.text}
              </p>
            ) : null}

            {result ? (
              <p className={`fixed-point-terminal-line iteration-terminal-line ${result.warning ? "is-warning" : "is-result"}`}>
                <span aria-hidden="true">{result.warning ? "!" : "✓"}</span>{" "}{result.text}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default FixedPointTerminal;
