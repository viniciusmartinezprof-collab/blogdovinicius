import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const HARD_DIVERGENCE_LIMIT = 1e100;
const GROWTH_FACTOR = 1.5;
const GROWTH_STREAK_LIMIT = 8;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class FixedPointError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "FixedPointError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new FixedPointError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new FixedPointError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new FixedPointError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  return parsed;
}

function parseMaxIterations(value) {
  const parsed = parseFiniteNumber(value, "maxIterations", "o limite de iterações");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ITERATIONS_LIMIT) {
    throw new FixedPointError(
      "INVALID_MAX_ITERATIONS",
      `O limite de iterações deve ser um inteiro entre 1 e ${MAX_ITERATIONS_LIMIT}.`,
      "maxIterations",
    );
  }

  return parsed;
}

function evaluateAt(evaluate, x, iteration, stage) {
  try {
    return evaluate(x);
  } catch (error) {
    if (!(error instanceof MathExpressionError)) throw error;

    const stageText = stage === "residual" ? "ao calcular o resíduo" : "ao calcular o próximo ponto";
    throw new FixedPointError(
      "FUNCTION_EVALUATION_ERROR",
      `${error.message.replace(/\.$/, "")} ${stageText} na iteração ${iteration} (x = ${x}).`,
      "expression",
      { x, iteration, stage, causeCode: error.code, position: error.position },
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
  const quotient = numerator / denominator;
  return Number.isFinite(quotient) ? quotient : null;
}

/* Probes fora do domínio não invalidam a iteração: apenas tornam g'(x) indisponível. */
function estimateDerivative(evaluate, x, valueAtX) {
  const scale = Math.max(1, Math.abs(x));
  const h = Math.cbrt(Number.EPSILON) * scale;
  const left = x - h;
  const right = x + h;
  const leftValue = left !== x ? optionalEvaluation(evaluate, left) : null;
  const rightValue = right !== x ? optionalEvaluation(evaluate, right) : null;

  if (leftValue !== null && rightValue !== null) {
    const centered = finiteQuotient(rightValue - leftValue, right - left);
    if (centered !== null) return centered;
  }
  if (rightValue !== null) {
    const forward = finiteQuotient(rightValue - valueAtX, right - x);
    if (forward !== null) return forward;
  }
  if (leftValue !== null) {
    return finiteQuotient(valueAtX - leftValue, x - left);
  }
  return null;
}

function result(base, root, residual, converged, reason) {
  return { ...base, root, residual, converged, reason };
}

/** Executa x_(n+1) = g(x_n) e devolve todas as etapas para visualização. */
export function runFixedPoint({
  expression,
  x0,
  tolerance = DEFAULT_TOLERANCE,
  maxIterations = DEFAULT_MAX_ITERATIONS,
} = {}) {
  let evaluate;
  try {
    evaluate = compileExpression(expression);
  } catch (error) {
    if (error instanceof MathExpressionError) error.field = "expression";
    throw error;
  }

  const initialX = parseFiniteNumber(x0, "x0", "a aproximação inicial");
  const parsedTolerance = parseFiniteNumber(tolerance, "tolerance", "a tolerância");
  const parsedMaxIterations = parseMaxIterations(maxIterations);

  if (parsedTolerance <= 0) {
    throw new FixedPointError(
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
  let currentValue = null;
  let previousStep = null;
  let growingSteps = 0;
  let lastResidual = null;

  for (let iteration = 1; iteration <= parsedMaxIterations; iteration += 1) {
    const xNext =
      currentValue === null
        ? evaluateAt(evaluate, xCurrent, iteration, "iterate")
        : currentValue;
    const stepError = Math.abs(xNext - xCurrent);
    const valueAtNext = evaluateAt(evaluate, xNext, iteration, "residual");
    const rawResidual = valueAtNext - xNext;

    if (!Number.isFinite(stepError) || !Number.isFinite(rawResidual)) {
      throw new FixedPointError(
        "NUMERIC_FAILURE",
        "A diferença entre as aproximações excedeu os limites numéricos.",
        "expression",
        { iteration, x: xNext },
      );
    }

    const residual = rawResidual;
    const derivativeEstimate = estimateDerivative(evaluate, xNext, valueAtNext);
    iterations.push({
      iteration,
      xCurrent,
      xNext,
      stepError,
      residual,
      derivativeEstimate,
    });
    lastResidual = residual;

    if (stepError === 0 || residual === 0) {
      return result(base, xNext, residual, true, "exact-fixed-point");
    }
    if (stepError <= parsedTolerance && Math.abs(residual) <= parsedTolerance) {
      return result(base, xNext, residual, true, "step-size");
    }

    if (previousStep !== null && stepError > previousStep * GROWTH_FACTOR) growingSteps += 1;
    else growingSteps = 0;

    const clearlyGrowing =
      growingSteps >= GROWTH_STREAK_LIMIT &&
      Math.abs(xNext) > Math.max(1, Math.abs(initialX) * 4);
    if (Math.abs(xNext) > HARD_DIVERGENCE_LIMIT || clearlyGrowing) {
      return result(base, xNext, residual, false, "divergence");
    }

    previousStep = stepError;
    xCurrent = xNext;
    currentValue = valueAtNext;
  }

  return result(base, xCurrent, lastResidual, false, "max-iterations");
}
