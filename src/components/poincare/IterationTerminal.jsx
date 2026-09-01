import { useEffect, useRef } from "react";

const TABLE_COLUMNS = [
  { label: "Iteração", value: (step) => String(step.iteration ?? "—") },
  { label: "a", value: (step) => formatNumber(step.a) },
  { label: "b", value: (step) => formatNumber(step.b) },
  { label: "m", value: (step) => formatNumber(step.midpoint) },
  { label: "sign(f(a))", value: (step) => formatSign(step.signFA ?? getFA(step)) },
  { label: "sign(f(b))", value: (step) => formatSign(step.signFB ?? getFB(step)) },
  { label: "sign(f(m))", value: (step) => formatSign(step.signFMidpoint ?? step.fMidpoint) },
  { label: "b-a", value: (step) => formatNumber(step.intervalWidth) },
  { label: "Stop?", value: (step) => step.stop ? "sim" : "não" },
];

function formatSign(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number === 0) return "0";
  return number < 0 ? "−1" : "+1";
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(number)) {
    return "NaN";
  }

  if (number === Infinity) {
    return "+∞";
  }

  if (number === -Infinity) {
    return "−∞";
  }

  if (Object.is(number, -0) || number === 0) {
    return "0";
  }

  const magnitude = Math.abs(number);

  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return number
      .toExponential(6)
      .replace(/\.0+(?=e)/, "")
      .replace(/(\.\d*?[1-9])0+(?=e)/, "$1")
      .replace("e+", "e");
  }

  return Number(number.toPrecision(8)).toString();
}

function normalizeReason(reason) {
  return String(reason ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function buildTable(iterations, widthSource = iterations) {
  const rows = iterations.map((step) => TABLE_COLUMNS.map((column) => column.value(step)));
  const widthRows = widthSource.map((step) => TABLE_COLUMNS.map((column) => column.value(step)));
  const widths = TABLE_COLUMNS.map((column, columnIndex) =>
    Math.max(column.label.length, ...widthRows.map((row) => row[columnIndex].length)),
  );
  const alignRow = (cells) => cells
    .map((cell, columnIndex) => cell.padStart(widths[columnIndex]))
    .join("  │  ");

  const header = alignRow(TABLE_COLUMNS.map((column) => column.label));
  const divider = widths.map((width) => "─".repeat(width)).join("──┼──");

  return {
    divider,
    header,
    rows: rows.map(alignRow),
  };
}

function oppositeSigns(first, second) {
  return (
    (first < 0 && second > 0) ||
    (first > 0 && second < 0)
  );
}

function getFA(step) {
  return step?.fa ?? step?.fA;
}

function getFB(step) {
  return step?.fb ?? step?.fB;
}

function formatInterval(a, b) {
  return `[${formatNumber(a)}, ${formatNumber(b)}]`;
}

function describeValidation(run, firstStep) {
  if (!firstStep) {
    const reason = normalizeReason(run.reason);

    if (
      reason.includes("endpoint-a") ||
      reason.includes("extremidade-a") ||
      reason.includes("endpoint-root") && run.root === run.initialA
    ) {
      return "Validação concluída: a extremidade a já é uma raiz.";
    }

    if (
      reason.includes("endpoint-b") ||
      reason.includes("extremidade-b") ||
      reason.includes("endpoint-root") && run.root === run.initialB
    ) {
      return "Validação concluída: a extremidade b já é uma raiz.";
    }

    return "Parâmetros recebidos; aguardando a primeira iteração.";
  }

  const fa = getFA(firstStep);
  const fb = getFB(firstStep);

  if (oppositeSigns(fa, fb)) {
    return `Intervalo validado: f(a) = ${formatNumber(fa)} e f(b) = ${formatNumber(fb)} têm sinais opostos.`;
  }

  if (fa === 0 || fb === 0) {
    return "Intervalo validado: uma das extremidades é raiz exata.";
  }

  return `Intervalo validado com f(a) = ${formatNumber(fa)} e f(b) = ${formatNumber(fb)}.`;
}

function describeDecision(step, nextStep, isLastStep, run) {
  if (!step) {
    return null;
  }

  if (isLastStep && run.converged) {
    return null;
  }

  if (step.fMidpoint === 0) {
    return `Decisão: f(m) = 0; ${formatNumber(step.midpoint)} é uma raiz exata.`;
  }

  const nextA = nextStep?.a;
  const nextB = nextStep?.b;

  if (nextStep) {
    if (nextA === step.a && nextB === step.midpoint) {
      return `Decisão: a mudança de sinal está em [a, m]. Novo intervalo: ${formatInterval(nextA, nextB)}.`;
    }

    if (nextA === step.midpoint && nextB === step.b) {
      return `Decisão: a mudança de sinal está em [m, b]. Novo intervalo: ${formatInterval(nextA, nextB)}.`;
    }

    return `Novo intervalo: ${formatInterval(nextA, nextB)}.`;
  }

  if (oppositeSigns(getFA(step), step.fMidpoint)) {
    return `Decisão: a mudança de sinal está em [a, m]. O próximo intervalo seria ${formatInterval(step.a, step.midpoint)}.`;
  }

  if (oppositeSigns(step.fMidpoint, getFB(step))) {
    return `Decisão: a mudança de sinal está em [m, b]. O próximo intervalo seria ${formatInterval(step.midpoint, step.b)}.`;
  }

  return null;
}

function getApproximation(run, lastStep) {
  if (run.root !== null && run.root !== undefined) {
    return run.root;
  }

  const reason = normalizeReason(run.reason);

  if (
    reason.includes("endpoint-a") ||
    reason.includes("extremidade-a") ||
    reason.includes("endpoint-root") && run.root === run.initialA
  ) {
    return run.initialA;
  }

  if (
    reason.includes("endpoint-b") ||
    reason.includes("extremidade-b") ||
    reason.includes("endpoint-root") && run.root === run.initialB
  ) {
    return run.initialB;
  }

  return lastStep?.midpoint;
}

function describeResult(run, lastStep) {
  const reason = normalizeReason(run.reason);
  const root = formatNumber(getApproximation(run, lastStep));
  const finalIteration = lastStep?.iteration ?? 0;

  if (reason.includes("max") || reason.includes("limit")) {
    return {
      isError: true,
      text: `Limite de ${run.maxIterations ?? finalIteration} atualizações atingido na iteração ${finalIteration}. Última aproximação: x ≈ ${root}.`,
    };
  }

  if (reason.includes("machine-precision") || reason.includes("precisao-da-maquina")) {
    return {
      isError: true,
      text: `A precisão numérica da máquina impediu uma nova divisão. Última aproximação: x ≈ ${root}.`,
    };
  }

  if (
    reason.includes("endpoint-a") ||
    reason.includes("extremidade-a") ||
    reason.includes("endpoint-root") && run.root === run.initialA
  ) {
    return { isError: false, text: `Convergência imediata: f(a) = 0 e x = ${root}.` };
  }

  if (
    reason.includes("endpoint-b") ||
    reason.includes("extremidade-b") ||
    reason.includes("endpoint-root") && run.root === run.initialB
  ) {
    return { isError: false, text: `Convergência imediata: f(b) = 0 e x = ${root}.` };
  }

  if (reason.includes("exact-root") || reason.includes("raiz-exata")) {
    return {
      isError: false,
      text: `Raiz exata encontrada na iteração ${finalIteration}: x = ${root}.`,
    };
  }

  if (
    reason.includes("interval") ||
    reason.includes("width") ||
    reason.includes("largura") ||
    reason === "tolerance"
  ) {
    return {
      isError: false,
      text: `Convergência na iteração ${finalIteration}: b − a < ε. Raiz aproximada: x ≈ ${root}.`,
    };
  }

  if (run.converged) {
    return {
      isError: false,
      text: `Convergência alcançada na iteração ${finalIteration}. Raiz aproximada: x ≈ ${root}.`,
    };
  }

  return {
    isError: true,
    text: `Execução encerrada sem convergência. Última aproximação: x ≈ ${root}.`,
  };
}

function IterationTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = Number.isFinite(activeIndex) ? Math.trunc(activeIndex) : 0;
  const visibleCount = requestedIndex < 0
    ? 0
    : Math.min(requestedIndex + 1, iterations.length);
  const visibleIterations = iterations.slice(0, visibleCount);
  const currentIndex = visibleCount - 1;
  const activeStep = currentIndex >= 0 ? iterations[currentIndex] : null;
  const nextStep = currentIndex >= 0 ? iterations[currentIndex + 1] : null;
  const isLastStep = iterations.length === 0
    ? Boolean(run && (run.reason || run.converged || run.root !== null && run.root !== undefined))
    : visibleCount === iterations.length;
  const decision = run
    ? describeDecision(activeStep, nextStep, isLastStep, run)
    : null;
  const result = run && isLastStep
    ? describeResult(run, iterations.at(-1))
    : null;
  const table = buildTable(visibleIterations, iterations);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "auto" });
  }, [activeIndex, run]);

  return (
    <section className="iteration-terminal" aria-label="Console de iterações da bisseção">
      <header className="iteration-terminal-header">
        <span className="iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </span>
        <span className="iteration-terminal-title">python · bissecao.py</span>
        <span className="iteration-terminal-status">saída</span>
      </header>

      <div
        ref={bodyRef}
        className="iteration-terminal-body"
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
                bissecao(f, a={formatNumber(run.initialA)}, b={formatNumber(run.initialB)},
                tol={formatNumber(run.tolerance)}, max_iter={run.maxIterations ?? "—"})
              </code>
            </p>
            <p className="iteration-terminal-line is-validation">
              <span aria-hidden="true">✓</span>{" "}
              {describeValidation(run, iterations[0])}
            </p>

            <div className="iteration-terminal-table-wrap" style={{ overflowX: "auto" }} tabIndex={0}>
              <pre className="iteration-terminal-table" aria-label="Tabela das iterações exibidas">
                {table.header}{"\n"}{table.divider}
                {table.rows.map((row, index) => (
                  <span key={iterations[index]?.iteration ?? index}>{"\n"}{row}</span>
                ))}
              </pre>
            </div>

            {decision ? (
              <p className="iteration-terminal-line is-decision" key={`decision-${currentIndex}`}>
                <span aria-hidden="true">→</span>{" "}{decision}
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

export default IterationTerminal;
