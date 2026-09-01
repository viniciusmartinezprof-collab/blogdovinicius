import { useEffect, useRef } from "react";

const COLUMNS = [
  { label: "Iteração", value: (step) => String(step.iteration ?? "—") },
  { label: "x_n", value: (step) => formatNumber(step.x) },
  { label: "|x_n-x_(n-1)|", value: (step) => formatNumber(step.delta) },
  { label: "|f(x_n)|", value: (step) => formatNumber(step.residual) },
  { label: "Stop?", value: (step) => (step.stop ? "sim" : "não") },
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
      text: `Contração local ${strength}: |g′(xₙ)| ≈ ${formatNumber(magnitude, 6)} < 1. Perturbações tendem a encolher.`,
    };
  }

  return {
    kind: "is-warning",
    icon: "↗",
    text: `Alerta local: |g′(xₙ)| ≈ ${formatNumber(magnitude, 6)} ≥ 1. Erros podem crescer e a convergência não está garantida.`,
  };
}

function describeCriteria(run, step) {
  if (!step) return null;
  const criterion1 = step.delta === null
    ? "C1 indisponível em n=0"
    : `C1 ${step.criterion1Met ? "✓" : "×"}: ${formatNumber(step.delta)} < ε1`;
  const criterion2 = `C2 ${step.criterion2Met ? "✓" : "×"}: ${formatNumber(step.residual)} < ε2`;
  const mode = run?.stopMode === "any" ? "OU" : "E";
  return `${criterion1}; ${criterion2}; regra ${mode}; Stop? ${step.stop ? "sim" : "não"}.`;
}

function describeResult(run, step) {
  const reason = normalizeReason(run?.reason);
  const root = formatNumber(run?.root ?? step?.x, 11);
  const residual = formatNumber(run?.residual ?? step?.residual, 7);
  const updates = step?.iteration ?? 0;
  const updateLabel = updates === 1 ? "atualização" : "atualizações";

  if (reason === "exact-root") {
    return { warning: false, text: `Raiz exata encontrada após ${updates} ${updateLabel}: x = ${root}.` };
  }
  if (reason === "both-criteria") {
    return {
      warning: false,
      text: `As duas precisões foram atingidas após ${updates} ${updateLabel}. x* ≈ ${root}; |f(x*)| ≈ ${residual}.`,
    };
  }
  if (reason === "step-tolerance") {
    return {
      warning: false,
      text: `A precisão do passo foi atingida pela regra OU após ${updates} ${updateLabel}. x* ≈ ${root}; |f(x*)| ≈ ${residual}.`,
    };
  }
  if (reason === "residual-tolerance") {
    return {
      warning: false,
      text: `A precisão do resíduo foi atingida pela regra OU após ${updates} ${updateLabel}. x* ≈ ${root}; |f(x*)| ≈ ${residual}.`,
    };
  }
  if (reason === "divergence") {
    return {
      warning: true,
      text: `Divergência detectada após ${updates} ${updateLabel}. A órbita se afastou; último x ≈ ${root}.`,
    };
  }
  if (reason === "machine-precision") {
    return {
      warning: true,
      text: `A precisão numérica da máquina impediu avanço adicional sem satisfazer a regra de parada. Último x ≈ ${root}.`,
    };
  }
  if (reason === "numeric-failure") {
    return { warning: true, text: `A sequência excedeu os limites numéricos. Último x válido ≈ ${root}.` };
  }
  if (reason === "max-iterations") {
    return {
      warning: true,
      text: `Limite de ${run?.maxIterations ?? updates} ${updateLabel} atingido sem satisfazer a regra de parada. Último x ≈ ${root}.`,
    };
  }
  if (run?.converged) {
    return { warning: false, text: `Convergência alcançada: x* ≈ ${root}, com |f(x*)| ≈ ${residual}.` };
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
  const criteria = describeCriteria(run, activeStep);
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
            Configure f(x), g(x) e o chute x₀ para iniciar.
          </p>
        ) : (
          <>
            <p className="fixed-point-terminal-line iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>f = lambda x: {run.functionExpression || "f(x)"}</code>
            </p>
            <p className="fixed-point-terminal-line iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>g = lambda x: {run.iterationExpression || "g(x)"}</code>
            </p>
            <p className="fixed-point-terminal-line iteration-terminal-line is-command">
              <span className="iteration-terminal-prompt" aria-hidden="true">&gt;&gt;&gt;</span>{" "}
              <code>
                ponto_fixo(f, g, x0={formatNumber(run.initialX)}, eps1={formatNumber(run.epsilon1)}, eps2={formatNumber(run.epsilon2)}, modo="{run.stopMode === "any" ? "OU" : "E"}", max_updates={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="fixed-point-terminal-line iteration-terminal-line is-validation">
              <span aria-hidden="true">✓</span>{" "}
              Estado x₀ registrado. Aplicando xₙ₊₁ = g(xₙ) e medindo o resíduo com f(xₙ).
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
                {activeStep.iteration === 0
                  ? `x0 = ${formatNumber(activeStep.x)} é o estado inicial; a variação ainda não está disponível.`
                  : `x${activeStep.iteration} = g(x${activeStep.iteration - 1}) = ${formatNumber(activeStep.x)}; passo = ${formatNumber(activeStep.delta)}.`}
              </p>
            ) : null}

            {criteria ? (
              <p className="fixed-point-terminal-line iteration-terminal-line is-decision" key={`criteria-${activeStep?.iteration}`}>
                <span aria-hidden="true">◇</span>{" "}{criteria}
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
