import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class FalsePositionError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "FalsePositionError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new FalsePositionError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new FalsePositionError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new FalsePositionError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  return parsed;
}

function parseMaxIterations(value) {
  const parsed = parseFiniteNumber(value, "maxIterations", "o limite de iterações");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ITERATIONS_LIMIT) {
    throw new FalsePositionError(
      "INVALID_MAX_ITERATIONS",
      `O limite de iterações deve ser um inteiro entre 1 e ${MAX_ITERATIONS_LIMIT}.`,
      "maxIterations",
    );
  }

  return parsed;
}

function evaluateAt(evaluate, x, location, iteration = null) {
  try {
    return evaluate(x);
  } catch (error) {
    if (!(error instanceof MathExpressionError)) throw error;

    const suffix = iteration === null ? ` no extremo ${location}` : ` na iteração ${iteration}`;
    throw new FalsePositionError(
      "FUNCTION_EVALUATION_ERROR",
      `${error.message.replace(/\.$/, "")}${suffix} (x = ${x}).`,
      "expression",
      { x, iteration, causeCode: error.code, position: error.position },
    );
  }
}

/*
 * A falsa posição é uma média ponderada dos extremos. Esta forma evita os
 * produtos a*f(b) e b*f(a), que podem transbordar mesmo quando a raiz cabe
 * perfeitamente no intervalo.
 */
function falsePositionBetween(a, b, fA, fB) {
  const scale = Math.max(Math.abs(fA), Math.abs(fB));
  const leftWeight = Math.abs(fB) / scale;
  const rightWeight = Math.abs(fA) / scale;
  const fraction = rightWeight / (leftWeight + rightWeight);
  return a + (b - a) * fraction;
}

function result(base, root, fRoot, converged, reason) {
  return { ...base, root, fRoot, converged, reason };
}

/**
 * Executa o método da falsa posição e preserva cada intervalo para animação.
 */
export function runFalsePosition({
  expression,
  a,
  b,
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

  const initialA = parseFiniteNumber(a, "a", "o extremo a");
  const initialB = parseFiniteNumber(b, "b", "o extremo b");
  const parsedTolerance = parseFiniteNumber(tolerance, "tolerance", "a tolerância");
  const parsedMaxIterations = parseMaxIterations(maxIterations);

  if (initialA >= initialB) {
    throw new FalsePositionError(
      "INVALID_INTERVAL",
      "O extremo a deve ser menor que o extremo b.",
      "a",
    );
  }

  if (!Number.isFinite(initialB - initialA)) {
    throw new FalsePositionError(
      "INTERVAL_TOO_WIDE",
      "O intervalo é grande demais para os limites numéricos do navegador.",
      "b",
    );
  }

  if (parsedTolerance <= 0) {
    throw new FalsePositionError(
      "INVALID_TOLERANCE",
      "A tolerância deve ser maior que zero.",
      "tolerance",
    );
  }

  let left = initialA;
  let right = initialB;
  let fLeft = evaluateAt(evaluate, left, "a");
  let fRight = evaluateAt(evaluate, right, "b");
  const iterations = [];
  const base = {
    expression: expression.trim(),
    evaluate,
    initialA,
    initialB,
    tolerance: parsedTolerance,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  if (fLeft === 0) return result(base, left, fLeft, true, "endpoint-root");
  if (fRight === 0) return result(base, right, fRight, true, "endpoint-root");

  if (Math.sign(fLeft) === Math.sign(fRight)) {
    throw new FalsePositionError(
      "NO_SIGN_CHANGE",
      "f(a) e f(b) devem ter sinais opostos para garantir uma raiz no intervalo.",
      "b",
      { fA: fLeft, fB: fRight },
    );
  }

  let previousEstimate = null;
  let lastEstimate = null;
  let lastFunctionValue = null;

  for (let iteration = 1; iteration <= parsedMaxIterations; iteration += 1) {
    const estimate = falsePositionBetween(left, right, fLeft, fRight);

    if (!Number.isFinite(estimate) || estimate < left || estimate > right) {
      throw new FalsePositionError(
        "NUMERIC_FAILURE",
        "Não foi possível calcular uma aproximação finita dentro do intervalo.",
        "expression",
        { iteration, a: left, b: right },
      );
    }

    const fEstimate =
      estimate === left
        ? fLeft
        : estimate === right
          ? fRight
          : evaluateAt(evaluate, estimate, "estimativa", iteration);
    const errorEstimate =
      previousEstimate === null ? Math.abs(right - left) : Math.abs(estimate - previousEstimate);

    let nextA = left;
    let nextB = right;
    let keptHalf = "none";

    if (fEstimate !== 0) {
      if (Math.sign(fLeft) !== Math.sign(fEstimate)) {
        nextB = estimate;
        keptHalf = "left";
      } else {
        nextA = estimate;
        keptHalf = "right";
      }
    }

    iterations.push({
      iteration,
      a: left,
      b: right,
      fA: fLeft,
      fB: fRight,
      estimate,
      fEstimate,
      errorEstimate,
      nextA,
      nextB,
      keptHalf,
    });

    lastEstimate = estimate;
    lastFunctionValue = fEstimate;

    if (fEstimate === 0) return result(base, estimate, fEstimate, true, "exact-root");
    if (Math.abs(fEstimate) <= parsedTolerance) {
      return result(base, estimate, fEstimate, true, "function-value");
    }
    const retainedWidth = Math.abs(nextB - nextA);
    if (retainedWidth <= parsedTolerance) {
      return result(base, estimate, fEstimate, true, "interval-width");
    }
    if (estimate === left || estimate === right) {
      return result(base, estimate, fEstimate, false, "machine-precision");
    }

    if (nextB === estimate) {
      right = estimate;
      fRight = fEstimate;
    } else {
      left = estimate;
      fLeft = fEstimate;
    }
    previousEstimate = estimate;
  }

  return result(base, lastEstimate, lastFunctionValue, false, "max-iterations");
}
