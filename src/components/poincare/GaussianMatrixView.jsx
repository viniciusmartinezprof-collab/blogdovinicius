function formatNumber(value, digits = 7) {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e5 || magnitude < 1e-4) {
    return value.toExponential(3).replace("e+", "e");
  }

  return Number(value.toPrecision(digits)).toString();
}

function getCellClass(step, rowIndex, columnIndex, size) {
  const classes = ["gaussian-cell"];

  if (columnIndex === size) classes.push("is-result");
  if (rowIndex === step?.pivotRow) classes.push("is-pivot-row");
  if (rowIndex === step?.targetRow) classes.push("is-target-row");
  if (rowIndex === step?.solvedRow) classes.push("is-solved-row");
  if (rowIndex === step?.pivotRow && columnIndex === step?.column) classes.push("is-pivot");
  if (rowIndex === step?.targetRow && columnIndex === step?.column) classes.push("is-zeroing");

  return classes.join(" ");
}

function GaussianMatrixView({ step }) {
  const matrix = step?.matrix ?? [];
  const size = matrix.length;
  const columns = size + 1;

  return (
    <div className="gaussian-matrix-stage">
      <div className="gaussian-matrix-header">
        <span>{step?.title ?? "Matriz aumentada"}</span>
        <code>{size} × {columns}</code>
      </div>

      <div className="gaussian-matrix-wrap">
        <div
          className="gaussian-matrix"
          style={{ "--gaussian-columns": columns }}
          aria-label="Matriz aumentada do sistema linear"
        >
          {matrix.map((row, rowIndex) => (
            row.map((value, columnIndex) => (
              <div
                className={getCellClass(step, rowIndex, columnIndex, size)}
                key={`${rowIndex}-${columnIndex}`}
                aria-label={`Linha ${rowIndex + 1}, coluna ${columnIndex + 1}: ${formatNumber(value)}`}
              >
                {formatNumber(value)}
              </div>
            ))
          ))}
        </div>
      </div>

      <div className="gaussian-legend" aria-hidden="true">
        <span><i className="is-pivot" /> pivô</span>
        <span><i className="is-target" /> linha alterada</span>
        <span><i className="is-result" /> termo independente</span>
      </div>
    </div>
  );
}

export default GaussianMatrixView;
