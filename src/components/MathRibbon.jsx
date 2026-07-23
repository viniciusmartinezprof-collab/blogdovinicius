const formulas = ["∫ f(x) dx", "Σ aₙ", "∇·F", "limₓ→∞"];

function MathRibbon({ className = "" }) {
  return (
    <div className={`math-ribbon ${className}`} aria-hidden="true">
      {formulas.map((formula) => <span key={formula}>{formula}</span>)}
    </div>
  );
}

export default MathRibbon;
