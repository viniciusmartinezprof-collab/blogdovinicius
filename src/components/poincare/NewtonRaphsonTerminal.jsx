import { useEffect, useRef } from "react";

const COLUMNS = [
  { label: "Iteração", value: (row) => String(row.iteration ?? "—") },
  { label: "x_n", value: (row) => formatNumber(row.x) },
  { label: "|x_n-x_n-1|", value: (row) => formatNumber(row.delta) },
  { label: "|f(x_n)|", value: (row) => formatNumber(row.residual) },
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

function normalizeReason(reason) {
  return String(reason ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
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

function describeTangent(row, previousRow) {
  if (!row || row.iteration === 0 || !previousRow) return null;
  const derivative = finite(row.derivativeEstimate);
  const previousX = finite(row.previousX);
  const previousValue = finite(previousRow.functionValue);

  if (derivative === null || previousX === null || previousValue === null) {
    return "A atualização foi registrada, mas a reta tangente não pôde ser reconstruída numericamente.";
  }

  return `Tangente que levou a x_${row.iteration}: y = ${formatNumber(previousValue)} + ${formatNumber(derivative)}·(x − ${formatNumber(previousX)}). Em y = 0, x_${row.iteration} = ${formatNumber(row.x)}.`;
}

function describeDecision(run, row) {
  if (!row) return null;
  const criterion1 = row.criterion1Met === null
    ? "indisponível em n = 0"
    : row.criterion1Met ? "sim" : "não";
  const criterion2 = row.criterion2Met === null
    ? "indisponível"
    : row.criterion2Met ? "sim" : "não";
  const mode = run.stopMode === "all" ? "E" : "OU";
  return `C₁: |xₙ−xₙ₋₁| < ε₁? ${criterion1} · C₂: |f(xₙ)| < ε₂? ${criterion2} · modo ${mode} · Stop? ${row.stop ? "sim" : "não"}.`;
}

function describeValidation(run, firstRow) {
  const reason = normalizeReason(run?.reason);
  if (reason === "exact-root" && firstRow?.iteration === 0) {
    return `A linha 0 já é uma raiz exata: x₀ = ${formatNumber(firstRow.x)} e f(x₀) = 0.`;
  }
  if (reason === "residual-tolerance" && firstRow?.stop) {
    return `No modo OU, a linha 0 pode encerrar pelo resíduo: |f(x₀)| = ${formatNumber(firstRow.residual)} < ε₂.`;
  }
  return "Linha 0 registrada com o chute inicial. A variação C₁ só fica disponível depois da primeira atualização.";
}

function describeResult(run, lastRow) {
  const reason = normalizeReason(run?.reason);
  const root = formatNumber(run?.root ?? lastRow?.x, 11);
  const residual = formatNumber(lastRow?.residual, 8);
  const lastIteration = lastRow?.iteration ?? 0;

  switch (reason) {
    case "exact-root":
      return { warning: false, text: `Raiz exata na iteração ${lastIteration}: x = ${root} e f(x) = 0.` };
    case "both-criteria":
      return { warning: false, text: `C₁ e C₂ satisfeitos estritamente na iteração ${lastIteration}: x ≈ ${root}, |f(x)| ≈ ${residual}.` };
    case "step-tolerance":
      return { warning: false, text: `No modo OU, C₁ foi satisfeito na iteração ${lastIteration}: |xₙ−xₙ₋₁| < ε₁.` };
    case "residual-tolerance":
      return { warning: false, text: `No modo OU, C₂ foi satisfeito na iteração ${lastIteration}: |f(xₙ)| < ε₂.` };
    case "zero-derivative":
      return { warning: true, text: `Método interrompido em x = ${root}: f′(x) ≈ 0 e a tangente não determina uma nova aproximação. Stop? permanece não.` };
    case "derivative-unavailable":
      return { warning: true, text: `Não foi possível estimar f′ em x = ${root} por diferença central ou unilateral. Stop? permanece não.` };
    case "function-unavailable":
      return { warning: true, text: `A tangente levou a x_${lastIteration} = ${root}, onde f(x) não está definida. A linha é mantida com Stop? não.` };
    case "numeric-failure":
      return { warning: true, text: `Falha numérica ao calcular a correção ou a nova aproximação. Último ponto finito: x ≈ ${root}; Stop? não.` };
    case "machine-precision":
      return { warning: true, text: `A sequência estagnou na precisão da máquina antes do critério selecionado. Último x ≈ ${root}; Stop? não.` };
    case "divergence":
      return { warning: true, text: `Divergência detectada na iteração ${lastIteration}. Último x ≈ ${root}; Stop? não.` };
    case "cycle":
      return { warning: true, text: `Ciclo detectado na iteração ${lastIteration}. Último x ≈ ${root}; Stop? não.` };
    case "max-iterations":
      return { warning: true, text: `Limite de ${run?.maxIterations ?? lastIteration} atualizações atingido sem satisfazer o modo ${run?.stopMode === "all" ? "E" : "OU"}. Último x ≈ ${root}; Stop? não.` };
    default:
      return run?.converged
        ? { warning: false, text: `Convergência alcançada: x ≈ ${root}, |f(x)| ≈ ${residual}.` }
        : { warning: true, text: `Execução encerrada sem convergência. Último x ≈ ${root}; Stop? não.` };
  }
}

function NewtonRaphsonTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = Math.trunc(finite(activeIndex) ?? 0);
  const visibleCount = requestedIndex < 0 ? 0 : Math.min(requestedIndex + 1, iterations.length);
  const visibleIterations = iterations.slice(0, visibleCount);
  const activeRow = visibleIterations.at(-1);
  const previousRow = activeRow?.iteration > 0 ? iterations[activeRow.iteration - 1] : null;
  const isAtEnd = Boolean(run) && visibleCount === iterations.length;
  const table = buildTable(visibleIterations, iterations);
  const tangent = describeTangent(activeRow, previousRow);
  const decision = describeDecision(run, activeRow);
  const result = isAtEnd ? describeResult(run, iterations.at(-1)) : null;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "auto" });
  }, [activeIndex, run]);

  return (
    <section className="newton-terminal iteration-terminal" aria-label="Console de iterações do método de Newton-Raphson">
      <header className="newton-terminal-header iteration-terminal-header">
        <span className="newton-terminal-dots iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </span>
        <span className="newton-terminal-title iteration-terminal-title">python · newton_raphson.py</span>
        <span className="newton-terminal-status iteration-terminal-status">saída</span>
      </header>

      <div
        ref={bodyRef}
        className="newton-terminal-body iteration-terminal-body"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
        tabIndex={0}
      >
        {!run ? (
          <p className="newton-terminal-line iteration-terminal-line is-muted">
            <span className="newton-terminal-prompt iteration-terminal-prompt" aria-hidden="true">$</span>{" "}
            Configure f(x), x₀ e as duas precisões para iniciar.
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
                newton_raphson(f, x0={formatNumber(run.initialX)}, eps1={formatNumber(run.epsilon1)}, eps2={formatNumber(run.epsilon2)}, mode=&quot;{run.stopMode}&quot;, max_iter={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-validation">
              <span aria-hidden="true">✓</span>{" "}{describeValidation(run, iterations[0])}
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-muted">
              <span aria-hidden="true">#</span>{" "}
              f′ é estimada por diferenças finitas com extrapolação de Richardson e passo adaptado à escala.
            </p>

            <div
              className="newton-terminal-table-wrap iteration-terminal-table-wrap"
              style={{ overflowX: "auto" }}
              tabIndex={0}
              aria-label="Tabela rolável das iterações de Newton-Raphson"
            >
              <pre className="newton-terminal-table iteration-terminal-table" aria-label="Tabela das iterações de Newton-Raphson exibidas">
                {table.header}{"\n"}{table.divider}
                {table.rows.map((row, rowIndex) => (
                  <span key={iterations[rowIndex]?.iteration ?? rowIndex}>{"\n"}{row}</span>
                ))}
              </pre>
            </div>

            {tangent ? (
              <p className="newton-terminal-line iteration-terminal-line is-decision" key={`tangent-${activeRow?.iteration}`}>
                <span aria-hidden="true">→</span>{" "}{tangent}
              </p>
            ) : null}

            {decision ? (
              <p className="newton-terminal-line iteration-terminal-line is-decision" key={`decision-${activeRow?.iteration}`}>
                <span aria-hidden="true">?</span>{" "}{decision}
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

export default NewtonRaphsonTerminal;
