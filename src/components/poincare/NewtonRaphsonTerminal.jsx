import { useEffect, useRef } from "react";

const COLUMNS = [
  { label: "it", value: (step) => String(step.iteration ?? "—") },
  { label: "x_n", value: (step) => formatNumber(step.xCurrent) },
  { label: "f(x_n)", value: (step) => formatNumber(step.fCurrent) },
  { label: "f'(x_n)*", value: (step) => formatNumber(step.derivativeEstimate) },
  { label: "correção", value: (step) => formatNumber(step.correction) },
  { label: "x_n+1", value: (step) => formatNumber(step.xNext) },
  { label: "f(x_n+1)", value: (step) => formatNumber(step.fNext) },
  { label: "|Δx|", value: (step) => formatNumber(step.stepError) },
];

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, significantDigits = 8) {
  const number = finite(value);
  if (number === null) {
    if (value === Infinity) return "+∞";
    if (value === -Infinity) return "−∞";
    if (Number.isNaN(Number(value)) && value !== null && value !== undefined) return "NaN";
    return "—";
  }
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

function describeTangent(step) {
  if (!step) return null;

  const derivative = finite(step.derivativeEstimate);
  if (derivative === null) {
    return "Não foi possível estimar f′(xₙ); portanto, não há tangente numérica segura para construir.";
  }
  if (derivative === 0) {
    return `Em xₙ = ${formatNumber(step.xCurrent)}, a derivada numérica é zero: a tangente é horizontal e não fornece uma nova interseção com o eixo x.`;
  }

  const next = finite(step.xNext);
  if (next === null) {
    return `A tangente em xₙ = ${formatNumber(step.xCurrent)} tem inclinação ${formatNumber(derivative)}, mas sua correção não produziu uma interseção numérica finita.`;
  }

  return `Tangente: y = ${formatNumber(step.fCurrent)} + ${formatNumber(derivative)}·(x − ${formatNumber(step.xCurrent)}). Em y = 0, ela intercepta o eixo x em xₙ₊₁ = ${formatNumber(step.xNext)}.`;
}

function describeValidation(run, firstStep) {
  const reason = normalizeReason(run?.reason);

  if (!firstStep && reason === "exact-root") {
    return `O chute inicial já satisfaz f(x₀) = 0 em x₀ = ${formatNumber(run?.initialX)}; nenhuma tangente é necessária.`;
  }
  if (!firstStep && reason === "function-value") {
    return `O chute inicial já satisfaz |f(x₀)| ≤ ε em x₀ = ${formatNumber(run?.initialX)}.`;
  }

  return "Estado inicial aceito. Construindo a tangente em xₙ e usando sua interseção com o eixo x como xₙ₊₁.";
}

function describeResult(run, lastStep) {
  const reason = normalizeReason(run?.reason);
  const iterationCount = run?.iterations?.length ?? 0;
  const iterationLabel = iterationCount === 1 ? "iteração" : "iterações";
  const root = formatNumber(run?.root ?? lastStep?.xNext ?? lastStep?.xCurrent, 11);
  const fRoot = formatNumber(run?.fRoot ?? lastStep?.fNext ?? lastStep?.fCurrent, 8);

  switch (reason) {
    case "exact-root":
      return {
        warning: false,
        text: `Raiz exata encontrada após ${iterationCount} ${iterationLabel}: x = ${root} e f(x) = 0.`,
      };
    case "function-value":
      return {
        warning: false,
        text: `Critério |f(x)| ≤ ε satisfeito após ${iterationCount} ${iterationLabel}: x ≈ ${root}, com f(x) ≈ ${fRoot}.`,
      };
    case "zero-derivative":
      return {
        warning: true,
        text: `Método interrompido em x = ${root}: f′(x) ≈ 0, então a tangente horizontal não determina um próximo ponto. f(x) ≈ ${fRoot}.`,
      };
    case "derivative-unavailable":
      return {
        warning: true,
        text: `Não foi possível estimar f′ em x = ${root}, nem por diferença central nem unilateral. A iteração foi interrompida com f(x) ≈ ${fRoot}.`,
      };
    case "function-unavailable":
      return {
        warning: true,
        text: `A tangente levou a xₙ₊₁ = ${formatNumber(lastStep?.xNext)}, onde f(x) não está definida. Último ponto avaliável: xₙ = ${formatNumber(lastStep?.xCurrent)}, f(xₙ) = ${formatNumber(lastStep?.fCurrent)}.`,
      };
    case "numeric-failure":
      return {
        warning: true,
        text: `Falha numérica ao calcular a correção f(x)/f′(x) ou a nova interseção. Último ponto finito: x ≈ ${root}, f(x) ≈ ${fRoot}.`,
      };
    case "machine-precision":
      return {
        warning: true,
        text: `A precisão da máquina fez xₙ₊₁ = xₙ antes de atingir a tolerância. Último ponto: x ≈ ${root}, f(x) ≈ ${fRoot}.`,
      };
    case "divergence":
      return {
        warning: true,
        text: `Divergência detectada após ${iterationCount} ${iterationLabel}: a aproximação cresceu além do limite numérico seguro. Último x ≈ ${root}.`,
      };
    case "cycle":
      return {
        warning: true,
        text: `Ciclo detectado após ${iterationCount} ${iterationLabel}: a sequência voltou a uma aproximação anterior. Último x ≈ ${root}, f(x) ≈ ${fRoot}.`,
      };
    case "max-iterations":
      return {
        warning: true,
        text: `Limite de ${run?.maxIterations ?? iterationCount} ${iterationLabel} atingido sem satisfazer |f(x)| ≤ ε. Último x ≈ ${root}, f(x) ≈ ${fRoot}.`,
      };
    default:
      return run?.converged
        ? { warning: false, text: `Convergência alcançada: x ≈ ${root}, com f(x) ≈ ${fRoot}.` }
        : { warning: true, text: `Execução encerrada sem convergência. Último x ≈ ${root}, f(x) ≈ ${fRoot}.` };
  }
}

function NewtonRaphsonTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = Math.trunc(finite(activeIndex) ?? 0);
  const visibleCount = requestedIndex < 0
    ? 0
    : Math.min(requestedIndex + 1, iterations.length);
  const visibleIterations = iterations.slice(0, visibleCount);
  const activeStep = visibleIterations.at(-1);
  const isAtEnd = Boolean(run) && (iterations.length === 0 || visibleCount === iterations.length);
  const table = buildTable(visibleIterations, iterations);
  const tangent = describeTangent(activeStep);
  const result = isAtEnd ? describeResult(run, iterations.at(-1)) : null;
  const activeDerivative = finite(activeStep?.derivativeEstimate);
  const tangentIsWarning = activeStep && (
    activeDerivative === null ||
    activeDerivative === 0 ||
    finite(activeStep.xNext) === null
  );

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
            Configure f(x) e o chute x₀ para iniciar.
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
                newton_raphson(f, x0={formatNumber(run.initialX)}, tol={formatNumber(run.tolerance)}, max_iter={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-validation">
              <span aria-hidden="true">✓</span>{" "}
              {describeValidation(run, iterations[0])}
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-muted">
              <span aria-hidden="true">#</span>{" "}
              f′(xₙ)* ≈ [f(xₙ + h) − f(xₙ − h)] / (2h), com h adaptado à escala de xₙ.
            </p>
            <p className="newton-terminal-line iteration-terminal-line is-muted">
              <span aria-hidden="true">#</span>{" "}
              Se um lado sair do domínio, usa-se diferença unilateral; xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ)*.
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
              <p
                className={`newton-terminal-line iteration-terminal-line ${tangentIsWarning ? "is-warning" : "is-decision"}`}
                key={`tangent-${activeStep?.iteration}`}
              >
                <span aria-hidden="true">→</span>{" "}{tangent}
              </p>
            ) : null}

            {activeStep && finite(activeStep.xNext) !== null && !isAtEnd ? (
              <p className="newton-terminal-line iteration-terminal-line is-muted">
                correção = {formatNumber(activeStep.correction)} · |Δx| = {formatNumber(activeStep.stepError)} · |f(xₙ₊₁)| = {formatNumber(Math.abs(activeStep.fNext))}
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
