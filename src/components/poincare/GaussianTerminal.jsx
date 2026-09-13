import { useEffect, useRef } from "react";

function formatNumber(value, digits = 8) {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || magnitude < 1e-5) {
    return value.toExponential(5).replace("e+", "e");
  }

  return Number(value.toPrecision(digits)).toString();
}

function formatVector(solution) {
  if (!solution) return "—";
  return solution.map((value, index) => `x${index + 1}=${formatNumber(value)}`).join(", ");
}

function operationLine(step) {
  if (!step) return "Aguardando dados.";

  if (step.type === "eliminate") {
    return `Operação: L${step.targetRow + 1} ← L${step.targetRow + 1} − (${formatNumber(step.factor)})·L${step.pivotRow + 1}`;
  }

  if (step.type === "swap") {
    return `Operação: L${step.pivotRow + 1} ↔ L${step.swappedRow + 1}`;
  }

  if (step.type === "pivot") {
    return `Pivô candidato: linha ${step.pivotRow + 1}, coluna ${step.column + 1}.`;
  }

  if (step.type === "skip") {
    return `Operação dispensada: a${step.targetRow + 1}${step.column + 1} já é zero.`;
  }

  if (step.type === "back-substitution") {
    return `Valor calculado: x${step.solvedRow + 1} = ${formatNumber(step.solution[step.solvedRow])}.`;
  }

  return step.description ?? "Estado registrado.";
}

function GaussianTerminal({ run, activeIndex }) {
  const bodyRef = useRef(null);
  const step = run.steps[Math.min(activeIndex, run.steps.length - 1)];
  const shownSteps = run.steps.slice(0, activeIndex + 1);

  useEffect(() => {
    bodyRef.current?.scrollTo?.({
      top: bodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeIndex]);

  return (
    <section className="iteration-terminal" aria-label="Terminal da eliminação gaussiana">
      <div className="iteration-terminal-header">
        <div className="iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </div>
        <span className="iteration-terminal-title">gauss/eliminacao.log</span>
        <span className="iteration-terminal-status">{run.converged ? "ok" : "atenção"}</span>
      </div>

      <div className="iteration-terminal-body" ref={bodyRef}>
        <p className="iteration-terminal-line is-command">
          <span className="iteration-terminal-prompt">λ</span> executar eliminação gaussiana com pivoteamento parcial
        </p>
        {shownSteps.map((currentStep, index) => (
          <div key={`${currentStep.type}-${index}`}>
            <p className={`iteration-terminal-line ${index === activeIndex ? "is-decision" : "is-muted"}`}>
              [{String(index).padStart(2, "0")}] {currentStep.title}
            </p>
            <p className="iteration-terminal-line">{operationLine(currentStep)}</p>
          </div>
        ))}

        {step?.description ? (
          <p className="iteration-terminal-line is-validation">{step.description}</p>
        ) : null}

        {activeIndex === run.steps.length - 1 ? (
          <p className={`iteration-terminal-line ${run.converged ? "is-result" : "is-warning"}`}>
            {run.converged
              ? `Solução única encontrada: ${formatVector(run.solution)}.`
              : "O sistema não tem uma solução única detectável com a tolerância atual."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default GaussianTerminal;
