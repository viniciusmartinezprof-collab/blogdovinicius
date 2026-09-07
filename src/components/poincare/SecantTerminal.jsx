import { useEffect, useRef } from "react";

const COLUMNS = [
  { label: "Iteração", value: (row) => String(row.iteration ?? "—") },
  { label: "x_n-1", value: (row) => formatNumber(row.previousX) },
  { label: "x_n", value: (row) => formatNumber(row.currentBeforeStep ?? row.x) },
  { label: "x_n+1", value: (row) => row.iteration === 0 ? "—" : formatNumber(row.x) },
  { label: "|x_n+1-x_n|", value: (row) => formatNumber(row.delta) },
  { label: "|f(x)|", value: (row) => formatNumber(row.residual) },
  { label: "Stop?", value: (row) => (row.stop ? "sim" : "não") },
];

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, significantDigits = 8) {
  const number = finite(value);
  if (number === null) return "—";
  if (Object.is(number, -0) || number === 0) return "0";
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

function buildTable(visibleRows, allRows) {
  const visibleCells = visibleRows.map((row) => COLUMNS.map((column) => column.value(row)));
  const sizingCells = allRows.map((row) => COLUMNS.map((column) => column.value(row)));
  const widths = COLUMNS.map((column, columnIndex) => Math.max(
    column.label.length,
    ...sizingCells.map((row) => row[columnIndex].length),
  ));
  const align = (cells) => cells
    .map((cell, columnIndex) => cell.padStart(widths[columnIndex]))
    .join("  │  ");

  return {
    header: align(COLUMNS.map((column) => column.label)),
    divider: widths.map((width) => "─".repeat(width)).join("──┼──"),
    rows: visibleCells.map(align),
  };
}

function describeDecision(row) {
  if (!row) return null;
  if (row.iteration === 0) {
    return `Linha 0: chutes iniciais x₀ = ${formatNumber(row.previousX)} e x₁ = ${formatNumber(row.x)}.`;
  }
  return `A secante por x_${row.iteration - 1} e x_${row.iteration} cruza o eixo em x_${row.iteration + 1} = ${formatNumber(row.x)}.`;
}

function describeResult(run, row) {
  const reason = String(run?.reason ?? "");
  const finalIteration = row?.iteration ?? 0;
  const root = formatNumber(run?.root ?? row?.x, 11);

  switch (reason) {
    case "exact-root":
      return { warning: false, text: `Raiz exata encontrada na iteração ${finalIteration}: x = ${root}.` };
    case "both-criteria":
      return { warning: false, text: `C₁ e C₂ satisfeitos na iteração ${finalIteration}: x ≈ ${root}.` };
    case "step-tolerance":
      return { warning: false, text: `No modo OU, C₁ foi satisfeito na iteração ${finalIteration}: |xₙ₊₁−xₙ| < ε₁.` };
    case "residual-tolerance":
      return { warning: false, text: `No modo OU, C₂ foi satisfeito na iteração ${finalIteration}: |f(x)| < ε₂.` };
    case "zero-slope":
      return { warning: true, text: `A secante ficou horizontal: f(xₙ) − f(xₙ₋₁) = 0 e o próximo ponto não é definido.` };
    case "slope-unavailable":
      return { warning: true, text: "Não foi possível calcular uma inclinação finita para a secante." };
    case "function-unavailable":
      return { warning: true, text: `A secante levou a x ≈ ${root}, fora do domínio da função. Stop? não.` };
    case "numeric-failure":
      return { warning: true, text: `Falha numérica ao calcular a nova aproximação. Último x ≈ ${root}; Stop? não.` };
    case "machine-precision":
      return { warning: true, text: `A sequência estagnou na precisão da máquina antes da regra selecionada. Último x ≈ ${root}; Stop? não.` };
    case "divergence":
      return { warning: true, text: `Divergência detectada na iteração ${finalIteration}. Último x ≈ ${root}; Stop? não.` };
    case "max-iterations":
      return { warning: true, text: `Limite de ${run?.maxIterations ?? finalIteration} atualizações atingido. Último x ≈ ${root}; Stop? não.` };
    default:
      return run?.converged
        ? { warning: false, text: `Convergência alcançada: x ≈ ${root}.` }
        : { warning: true, text: `Execução encerrada sem convergência. Último x ≈ ${root}; Stop? não.` };
  }
}

function SecantTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = Math.trunc(finite(activeIndex) ?? 0);
  const visibleCount = requestedIndex < 0 ? 0 : Math.min(requestedIndex + 1, iterations.length);
  const visibleRows = iterations.slice(0, visibleCount);
  const activeRow = visibleRows.at(-1);
  const isAtEnd = Boolean(run) && visibleCount === iterations.length;
  const table = buildTable(visibleRows, iterations);
  const result = isAtEnd ? describeResult(run, iterations.at(-1)) : null;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "auto" });
  }, [activeIndex, run]);

  return (
    <section className="newton-terminal iteration-terminal" aria-label="Console de iterações do método das secantes">
      <header className="newton-terminal-header iteration-terminal-header">
        <span className="newton-terminal-dots iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </span>
        <span className="newton-terminal-title iteration-terminal-title">python · secantes.py</span>
        <span className="newton-terminal-status iteration-terminal-status">saída</span>
      </header>

      <div ref={bodyRef} className="newton-terminal-body iteration-terminal-body" role="log" aria-live="polite" tabIndex={0}>
        {!run ? (
          <p className="newton-terminal-line iteration-terminal-line is-muted">
            <span className="newton-terminal-prompt iteration-terminal-prompt" aria-hidden="true">$</span>{" "}
            Configure f(x), x₀, x₁ e as precisões para iniciar.
          </p>
        ) : (
          <>
            <p className="newton-terminal-line iteration-terminal-line is-command">
              <span className="newton-terminal-prompt iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>f = lambda x: {run.expression || "f(x)"}</code>
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-command">
              <span className="newton-terminal-prompt iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>
                secantes(f, x0={formatNumber(run.initialX0)}, x1={formatNumber(run.initialX1)}, eps1={formatNumber(run.epsilon1)}, eps2={formatNumber(run.epsilon2)}, mode=&quot;{run.stopMode}&quot;, max_iter={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-muted">
              <span aria-hidden="true">#</span>{" "}
              xₙ₊₁ = xₙ − f(xₙ)(xₙ − xₙ₋₁)/(f(xₙ) − f(xₙ₋₁))
            </p>

            <div className="newton-terminal-table-wrap iteration-terminal-table-wrap" style={{ overflowX: "auto" }} tabIndex={0}>
              <pre className="newton-terminal-table iteration-terminal-table" aria-label="Tabela das iterações do método das secantes">
                {table.header}{"\n"}{table.divider}
                {table.rows.map((row, rowIndex) => (
                  <span key={iterations[rowIndex]?.iteration ?? rowIndex}>{"\n"}{row}</span>
                ))}
              </pre>
            </div>

            {activeRow ? (
              <p className="newton-terminal-line iteration-terminal-line is-decision" key={`decision-${activeRow.iteration}`}>
                <span aria-hidden="true">→</span>{" "}{describeDecision(activeRow)}
              </p>
            ) : null}

            {activeRow ? (
              <p className="newton-terminal-line iteration-terminal-line is-decision" key={`criteria-${activeRow.iteration}`}>
                <span aria-hidden="true">?</span>{" "}
                C₁ {activeRow.criterion1Met ? "sim" : "não"} · C₂ {activeRow.criterion2Met ? "sim" : "não"} · modo {run.stopMode === "all" ? "E" : "OU"} · Stop? {activeRow.stop ? "sim" : "não"}.
              </p>
            ) : null}

            {result ? (
              <p className={`newton-terminal-line iteration-terminal-line ${result.warning ? "is-warning" : "is-result"}`}>
                <span aria-hidden="true">{result.warning ? "!" : "✓"}</span>{" "}{result.text}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default SecantTerminal;
