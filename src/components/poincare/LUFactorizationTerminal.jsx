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

function operationLine(step, pivoting) {
  if (!step) return "Aguardando dados.";

  if (step.type === "pivot") {
    return pivoting
      ? `Pivô candidato: u${step.pivotRow + 1}${step.column + 1}.`
      : `Pivô fixo na diagonal: u${step.column + 1}${step.column + 1}.`;
  }

  if (step.type === "swap") {
    return `Permutação: L${step.pivotRow + 1} ↔ L${step.swappedRow + 1}.`;
  }

  if (step.type === "eliminate") {
    return `ℓ${step.targetRow + 1}${step.column + 1} = ${formatNumber(step.multiplier)}; U recebe L${step.targetRow + 1} ← L${step.targetRow + 1} − ℓ${step.targetRow + 1}${step.column + 1}L${step.pivotRow + 1}.`;
  }

  if (step.type === "done") {
    return "Fatores finais prontos: use Ly = Pb e depois Ux = y para resolver sistemas.";
  }

  return step.description ?? "Estado registrado.";
}

function LUFactorizationTerminal({ run, activeIndex }) {
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
    <section className="iteration-terminal" aria-label="Terminal da fatoração LU">
      <div className="iteration-terminal-header">
        <div className="iteration-terminal-dots" aria-hidden="true">
          <i className="is-close" />
          <i className="is-minimize" />
          <i className="is-expand" />
        </div>
        <span className="iteration-terminal-title">lu/fatoracao.log</span>
        <span className="iteration-terminal-status">{run.converged ? "ok" : "atenção"}</span>
      </div>

      <div className="iteration-terminal-body" ref={bodyRef}>
        <p className="iteration-terminal-line is-command">
          <span className="iteration-terminal-prompt">λ</span>{" "}
          {run.pivoting
            ? "fatorar matriz por LU com pivoteamento parcial"
            : "fatorar matriz por LU sem pivoteamento"}
        </p>

        {shownSteps.map((currentStep, index) => (
          <div key={`${currentStep.type}-${index}`}>
            <p className={`iteration-terminal-line ${index === activeIndex ? "is-decision" : "is-muted"}`}>
              [{String(index).padStart(2, "0")}] {currentStep.title}
            </p>
            <p className="iteration-terminal-line">{operationLine(currentStep, run.pivoting)}</p>
          </div>
        ))}

        {step?.description ? (
          <p className="iteration-terminal-line is-validation">{step.description}</p>
        ) : null}

        {activeIndex === run.steps.length - 1 ? (
          <p className={`iteration-terminal-line ${run.converged ? "is-result" : "is-warning"}`}>
            {run.converged
              ? `Fatoração validada visualmente como ${run.pivoting ? "PA = LU" : "A = LU"}.`
              : "A fatoração parou porque um pivô ficou numericamente nulo."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default LUFactorizationTerminal;
