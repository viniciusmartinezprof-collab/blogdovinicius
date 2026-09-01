import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class NewtonRaphsonError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "NewtonRaphsonError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new NewtonRaphsonError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new NewtonRaphsonError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new NewtonRaphsonError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }
  return parsed;
}

function parseMaxIterations(value) {
  const parsed = parseFiniteNumber(value, "maxIterations", "o limite de iterações");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ITERATIONS_LIMIT) {
    throw new NewtonRaphsonError(
      "INVALID_MAX_ITERATIONS",
      `O limite de iterações deve ser um inteiro entre 1 e ${MAX_ITERATIONS_LIMIT}.`,
      "maxIterations",
    );
  }
  return parsed;
}

function compileFunction(expression) {
  try {
    return compileExpression(expression);
  } catch (error) {
    if (error instanceof MathExpressionError) error.field = "expression";
    throw error;
  }
}

function evaluateAt(evaluate, x, iteration) {
  try {
    return evaluate(x);
  } catch (error) {
    if (!(error instanceof MathExpressionError)) throw error;

    throw new NewtonRaphsonError(
      "FUNCTION_EVALUATION_ERROR",
      `${error.message.replace(/\.$/, "")} ao avaliar a função na iteração ${iteration} (x = ${x}).`,
      "expression",
      { x, iteration, stage: "function", causeCode: error.code, position: error.position },
    );
  }
}

function optionalEvaluation(evaluate, x) {
  if (!Number.isFinite(x)) return null;
  try {
    return evaluate(x);
  } catch (error) {
    if (error instanceof MathExpressionError) return null;
    throw error;
  }
}

function finiteQuotient(numerator, denominator) {
  if (denominator === 0 || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

/* A diferença central é preferida; nas bordas do domínio usamos uma diferença unilateral. */
function estimateDerivative(evaluate, x, valueAtX) {
  const scale = Math.max(1, Math.abs(x));
  const h = Math.cbrt(Number.EPSILON) * scale;
  const left = x - h;
  const right = x + h;
  const wideLeft = x - 2 * h;
  const wideRight = x + 2 * h;
  const leftValue = left !== x ? optionalEvaluation(evaluate, left) : null;
  const rightValue = right !== x ? optionalEvaluation(evaluate, right) : null;
  const wideLeftValue = wideLeft !== x ? optionalEvaluation(evaluate, wideLeft) : null;
  const wideRightValue = wideRight !== x ? optionalEvaluation(evaluate, wideRight) : null;

  if (leftValue !== null && rightValue !== null) {
    const fine = finiteQuotient(rightValue - leftValue, right - left);
    if (fine !== null && wideLeftValue !== null && wideRightValue !== null) {
      const coarse = finiteQuotient(wideRightValue - wideLeftValue, wideRight - wideLeft);
      const extrapolated = coarse === null ? null : (4 * fine - coarse) / 3;
      if (Number.isFinite(extrapolated)) return extrapolated;
    }
    if (fine !== null) return fine;
  }
  if (rightValue !== null) {
    const fine = finiteQuotient(rightValue - valueAtX, right - x);
    if (fine !== null && wideRightValue !== null) {
      const coarse = finiteQuotient(wideRightValue - valueAtX, wideRight - x);
      const extrapolated = coarse === null ? null : 2 * fine - coarse;
      if (Number.isFinite(extrapolated)) return extrapolated;
    }
    if (fine !== null) return fine;
  }
  if (leftValue !== null) {
    const fine = finiteQuotient(valueAtX - leftValue, x - left);
    if (fine !== null && wideLeftValue !== null) {
      const coarse = finiteQuotient(valueAtX - wideLeftValue, x - wideLeft);
      const extrapolated = coarse === null ? null : 2 * fine - coarse;
      if (Number.isFinite(extrapolated)) return extrapolated;
    }
    if (fine !== null) return fine;
  }
  return null;
}

function makeResult(base, root, fRoot, converged, reason) {
  return { ...base, root, fRoot, converged, reason };
}

/**
 * Executa x_(n+1) = x_n - f(x_n) / f'(x_n) e preserva cada tangente para a interface.
 */
export function runNewtonRaphson({
  expression,
  x0,
  tolerance = DEFAULT_TOLERANCE,
  maxIterations = DEFAULT_MAX_ITERATIONS,
} = {}) {
  const evaluate = compileFunction(expression);
  const initialX = parseFiniteNumber(x0, "x0", "a aproximação inicial");
  const parsedTolerance = parseFiniteNumber(tolerance, "tolerance", "a tolerância");
  const parsedMaxIterations = parseMaxIterations(maxIterations);

  if (parsedTolerance <= 0) {
    throw new NewtonRaphsonError(
      "INVALID_TOLERANCE",
      "A tolerância deve ser maior que zero.",
      "tolerance",
    );
  }

  const iterations = [];
  const base = {
    expression: expression.trim(),
    evaluate,
    initialX,
    tolerance: parsedTolerance,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  let xCurrent = initialX;
  let fCurrent = evaluateAt(evaluate, xCurrent, 0);
  const visited = [xCurrent];

  if (fCurrent === 0) return makeResult(base, xCurrent, fCurrent, true, "exact-root");
  if (Math.abs(fCurrent) <= parsedTolerance) {
    return makeResult(base, xCurrent, fCurrent, true, "function-value");
  }

  for (let iteration = 1; iteration <= parsedMaxIterations; iteration += 1) {
    const derivativeEstimate = estimateDerivative(evaluate, xCurrent, fCurrent);

    if (derivativeEstimate === null || derivativeEstimate === 0) {
      iterations.push({
        iteration,
        xCurrent,
        fCurrent,
        derivativeEstimate,
        correction: null,
        xNext: null,
        fNext: null,
        stepError: null,
      });
      return makeResult(
        base,
        xCurrent,
        fCurrent,
        false,
        derivativeEstimate === null ? "derivative-unavailable" : "zero-derivative",
      );
    }

    const correction = fCurrent / derivativeEstimate;
    const xNext = xCurrent - correction;

    if (!Number.isFinite(correction) || !Number.isFinite(xNext)) {
      iterations.push({
        iteration,
        xCurrent,
        fCurrent,
        derivativeEstimate,
        correction: Number.isFinite(correction) ? correction : null,
        xNext: null,
        fNext: null,
        stepError: null,
      });
      return makeResult(base, xCurrent, fCurrent, false, "numeric-failure");
    }

    const stepError = Math.abs(xNext - xCurrent);
    let fNext;
    try {
      fNext = evaluateAt(evaluate, xNext, iteration);
    } catch (error) {
      if (!(error instanceof NewtonRaphsonError) || error.code !== "FUNCTION_EVALUATION_ERROR") throw error;
      iterations.push({
        iteration,
        xCurrent,
        fCurrent,
        derivativeEstimate,
        correction,
        xNext,
        fNext: null,
        stepError,
      });
      return {
        ...makeResult(base, xNext, null, false, "function-unavailable"),
        failure: {
          message: error.message,
          x: error.x,
          iteration: error.iteration,
          causeCode: error.causeCode,
        },
      };
    }
    iterations.push({
      iteration,
      xCurrent,
      fCurrent,
      derivativeEstimate,
      correction,
      xNext,
      fNext,
      stepError,
    });

    if (fNext === 0) return makeResult(base, xNext, fNext, true, "exact-root");
    if (Math.abs(fNext) <= parsedTolerance) {
      return makeResult(base, xNext, fNext, true, "function-value");
    }
    const machineStep = Number.EPSILON * 8 * Math.max(1, Math.abs(xCurrent), Math.abs(xNext));
    if (stepError <= machineStep) {
      return makeResult(base, xNext, fNext, false, "machine-precision");
    }

    const cycleTolerance = Math.max(machineStep * 8, stepError * 1e-7);
    const repeatedIndex = visited.findIndex((value, index) => (
      index < visited.length - 1 && Math.abs(value - xNext) <= cycleTolerance
    ));
    if (repeatedIndex >= 0) {
      return makeResult(base, xNext, fNext, false, "cycle");
    }

    visited.push(xNext);
    xCurrent = xNext;
    fCurrent = fNext;
  }

  return makeResult(base, xCurrent, fCurrent, false, "max-iterations");
}
