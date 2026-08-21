import { useEffect, useRef } from "react";

const COLUMNS = [
  { label: "it", value: (step) => String(step.iteration ?? "—") },
  { label: "a", value: (step) => formatNumber(step.a) },
  { label: "b", value: (step) => formatNumber(step.b) },
  { label: "c", value: (step) => formatNumber(step.estimate) },
  { label: "f(a)", value: (step) => formatNumber(step.fA) },
  { label: "f(b)", value: (step) => formatNumber(step.fB) },
  { label: "f(c)", value: (step) => formatNumber(step.fEstimate) },
  { label: "erro*", value: (step) => formatNumber(step.errorEstimate) },
];

function formatNumber(value, significantDigits = 8) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number === 0) return "0";

  const magnitude = Math.abs(number);
  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return number
      .toExponential(Math.max(1, significantDigits - 2))
      .replace(/\.0+(?=e)/, "")
      .replace(/(\.\d*?[1-9])0+(?=e)/, "$1")
      .replace("e+", "e");
  }

  return Number(number.toPrecision(significantDigits)).toString();
}

function buildTable(visibleIterations, allIterations) {
  const visibleRows = visibleIterations.map((step) => COLUMNS.map((column) => column.value(step)));
  const sizingRows = allIterations.map((step) => COLUMNS.map((column) => column.value(step)));
  const widths = COLUMNS.map((column, columnIndex) => Math.max(
    column.label.length,
    ...sizingRows.map((row) => row[columnIndex].length),
  ));
  const align = (cells) => cells
    .map((cell, columnIndex) => cell.padStart(widths[columnIndex]))
    .join("  │  ");

  return {
    header: align(COLUMNS.map((column) => column.label)),
    divider: widths.map((width) => "─".repeat(width)).join("──┼──"),
    rows: visibleRows.map(align),
  };
}

function hasOppositeSigns(first, second) {
  return (first < 0 && second > 0) || (first > 0 && second < 0);
}

function formatInterval(a, b) {
  return `[${formatNumber(a)}, ${formatNumber(b)}]`;
}

function describeValidation(run, firstStep) {
  if (run.reason === "endpoint-root") {
    const endpoint = run.root === run.initialA ? "a" : "b";
    return `Validação concluída: a extremidade ${endpoint} já é uma raiz exata.`;
  }

  const fA = firstStep?.fA ?? run.fInitialA;
  const fB = firstStep?.fB ?? run.fInitialB;
  if (hasOppositeSigns(fA, fB)) {
    return `Intervalo validado: f(a) = ${formatNumber(fA)} e f(b) = ${formatNumber(fB)} têm sinais opostos.`;
  }

  return "Intervalo recebido; preparando a primeira secante.";
}

function describeDecision(step) {
  if (!step) return null;

  if (step.fEstimate === 0 || step.keptHalf === "none") {
    return `A secante interceptou o eixo em c = ${formatNumber(step.estimate)}${step.fEstimate === 0 ? ", uma raiz exata." : "."}`;
  }

  if (step.keptHalf === "left") {
    return `f(a) e f(c) têm sinais opostos: preservamos [a, c] = ${formatInterval(step.nextA, step.nextB)}.`;
  }

  if (step.keptHalf === "right") {
    return `f(c) e f(b) têm sinais opostos: preservamos [c, b] = ${formatInterval(step.nextA, step.nextB)}.`;
  }

  return `Novo intervalo com troca de sinal: ${formatInterval(step.nextA, step.nextB)}.`;
}

function describeResult(run) {
  const iterationCount = run.iterations?.length ?? 0;
  const plural = iterationCount === 1 ? "iteração" : "iterações";
  const root = formatNumber(run.root ?? run.iterations?.at(-1)?.estimate);

  switch (run.reason) {
    case "endpoint-root":
      return { isError: false, text: `Convergência imediata: uma extremidade é raiz, x = ${root}.` };
    case "exact-root":
      return { isError: false, text: `Raiz exata encontrada em ${iterationCount} ${plural}: x = ${root}.` };
    case "function-value":
    case "function-tolerance":
      return { isError: false, text: `Critério |f(c)| ≤ ε satisfeito em ${iterationCount} ${plural}: x ≈ ${root}.` };
    case "interval-width":
      return { isError: false, text: `O intervalo retido atingiu largura ≤ ε em ${iterationCount} ${plural}: x ≈ ${root}.` };
    case "machine-precision":
      return { isError: true, text: `A precisão numérica impediu um novo avanço. Última aproximação: x ≈ ${root}.` };
    case "max-iterations":
      return { isError: true, text: `Limite de ${run.maxIterations ?? iterationCount} ${plural} atingido. Última aproximação: x ≈ ${root}.` };
    default:
      return run.converged
        ? { isError: false, text: `Convergência alcançada: x ≈ ${root}.` }
        : { isError: true, text: `Execução encerrada. Última aproximação: x ≈ ${root}.` };
  }
}

function FalsePositionTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = Number.isFinite(activeIndex) ? Math.trunc(activeIndex) : 0;
  const visibleCount = requestedIndex < 0 ? 0 : Math.min(requestedIndex + 1, iterations.length);
  const visibleIterations = iterations.slice(0, visibleCount);
  const activeStep = visibleIterations.at(-1);
  const isAtEnd = iterations.length === 0
    ? Boolean(run?.reason)
    : visibleCount === iterations.length;
  const table = buildTable(visibleIterations, iterations);
  const decision = describeDecision(activeStep);
  const result = run && isAtEnd ? describeResult(run) : null;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "auto" });
  }, [activeIndex, run]);

  return (
    <section className="iteration-terminal false-position-terminal" aria-label="Console de iterações da falsa posição">
      <header className="iteration-terminal-header false-position-terminal-header">
        <span className="iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </span>
        <span className="iteration-terminal-title">python · falsa_posicao.py</span>
        <span className="iteration-terminal-status">saída</span>
      </header>

      <div
        ref={bodyRef}
        className="iteration-terminal-body false-position-terminal-body"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {!run ? (
          <p className="iteration-terminal-line is-muted">
            <span className="iteration-terminal-prompt" aria-hidden="true">$</span>{" "}
            Configure os parâmetros e execute o método.
          </p>
        ) : (
          <>
            <p className="iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>f = lambda x: {run.expression || "f(x)"}</code>
            </p>
            <p className="iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>
                falsa_posicao(f, a={formatNumber(run.initialA)}, b={formatNumber(run.initialB)},
                tol={formatNumber(run.tolerance)}, max_iter={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="iteration-terminal-line is-validation">
              <span aria-hidden="true">✓</span>{" "}{describeValidation(run, iterations[0])}
            </p>
            {visibleCount > 0 ? (
              <>
                <p className="iteration-terminal-line is-muted">
                  <span aria-hidden="true">#</span>{" "}
                  c = (a·f(b) − b·f(a)) / (f(b) − f(a))
                </p>
                <p className="iteration-terminal-line is-muted">
                  <span aria-hidden="true">#</span>{" "}
                  erro*: |b − a| no primeiro passo; depois, |cₙ − cₙ₋₁|
                </p>
              </>
            ) : null}

            {iterations.length > 0 ? (
              <div className="iteration-terminal-table-wrap" style={{ overflowX: "auto" }} tabIndex={0}>
                <pre className="iteration-terminal-table" aria-label="Tabela das iterações exibidas">
                  {table.header}{"\n"}{table.divider}
                  {table.rows.map((row, index) => (
                    <span key={iterations[index]?.iteration ?? index}>{"\n"}{row}</span>
                  ))}
                </pre>
              </div>
            ) : null}

            {decision ? (
              <p className="iteration-terminal-line is-decision" key={`decision-${visibleCount}`}>
                <span aria-hidden="true">→</span>{" "}{decision}
              </p>
            ) : null}

            {activeStep && !isAtEnd ? (
              <p className="iteration-terminal-line is-muted">
                |f(c)| = {formatNumber(Math.abs(activeStep.fEstimate))} · {activeStep.iteration === 1 ? "|b − a|" : "|Δc|"} = {formatNumber(activeStep.errorEstimate)}
              </p>
            ) : null}

            {result ? (
              <p className={`iteration-terminal-line ${result.isError ? "is-warning" : "is-result"}`}>
                <span aria-hidden="true">{result.isError ? "!" : "✓"}</span>{" "}{result.text}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default FalsePositionTerminal;
