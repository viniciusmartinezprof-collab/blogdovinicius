function formatNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e5 || magnitude < 1e-4) {
    return value.toExponential(3).replace("e+", "e");
  }

  return Number(value.toPrecision(digits)).toString();
}

function cellClass(step, rowIndex, columnIndex, kind) {
  const classes = ["lu-cell"];

  if (kind === "lower" && rowIndex > columnIndex) classes.push("is-lower");
  if (kind === "upper" && rowIndex <= columnIndex) classes.push("is-upper");
  if (kind === "permutation" && step?.type === "swap" && (rowIndex === step.pivotRow || rowIndex === step.swappedRow)) {
    classes.push("is-swap");
  }
  if (kind === "upper" && rowIndex === step?.pivotRow && columnIndex === step?.column) classes.push("is-pivot");
  if (kind === "upper" && rowIndex === step?.targetRow && columnIndex === step?.column) classes.push("is-zeroing");
  if (kind === "lower" && rowIndex === step?.targetRow && columnIndex === step?.column) classes.push("is-multiplier");

  return classes.join(" ");
}

function MatrixBlock({ label, matrix, step, kind }) {
  return (
    <section className="lu-matrix-block" aria-label={`Matriz ${label}`}>
      <div className="lu-matrix-label">{label}</div>
      <div className="lu-matrix" style={{ "--lu-columns": matrix.length }}>
        {matrix.map((row, rowIndex) => (
          row.map((value, columnIndex) => (
            <div className={cellClass(step, rowIndex, columnIndex, kind)} key={`${rowIndex}-${columnIndex}`}>
              {formatNumber(value)}
            </div>
          ))
        ))}
      </div>
    </section>
  );
}

function LUFactorizationView({ step }) {
  if (!step) return null;

  return (
    <div className="lu-stage">
      <div className="gaussian-matrix-header">
        <span>{step.title}</span>
        <code>{step.lower.length} × {step.lower.length}</code>
      </div>

      <div className="lu-equation" aria-label="Fatoração PA igual LU">
        <MatrixBlock label="P" matrix={step.permutation} step={step} kind="permutation" />
        <span className="lu-symbol">A</span>
        <span className="lu-symbol">=</span>
        <MatrixBlock label="L" matrix={step.lower} step={step} kind="lower" />
        <MatrixBlock label="U" matrix={step.upper} step={step} kind="upper" />
      </div>

      <div className="gaussian-legend" aria-hidden="true">
        <span><i className="is-pivot" /> pivô</span>
        <span><i className="is-target" /> multiplicador</span>
        <span><i className="is-result" /> triangular</span>
      </div>
    </div>
  );
}

export default LUFactorizationView;
