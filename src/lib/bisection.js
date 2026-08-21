import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class BisectionError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "BisectionError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new BisectionError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new BisectionError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new BisectionError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  return parsed;
}

function parseMaxIterations(value) {
  const parsed = parseFiniteNumber(value, "maxIterations", "o limite de iterações");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ITERATIONS_LIMIT) {
    throw new BisectionError(
      "INVALID_MAX_ITERATIONS",
      `O limite de iterações deve ser um inteiro entre 1 e ${MAX_ITERATIONS_LIMIT}.`,
      "maxIterations",
    );
  }

  return parsed;
}

function midpointBetween(a, b) {
  // Evita overflow em b - a quando os extremos têm sinais opostos.
  return Math.sign(a) === Math.sign(b) ? a + (b - a) / 2 : (a + b) / 2;
}

function evaluateAt(evaluate, x, location, iteration = null) {
  try {
    return evaluate(x);
  } catch (error) {
    if (!(error instanceof MathExpressionError)) throw error;

    const suffix = iteration === null ? ` no extremo ${location}` : ` na iteração ${iteration}`;
    throw new BisectionError(
      "FUNCTION_EVALUATION_ERROR",
      `${error.message.replace(/\.$/, "")}${suffix} (x = ${x}).`,
      "expression",
      { x, iteration, causeCode: error.code, position: error.position },
    );
  }
}

function makeResult(base, values) {
  return {
    ...base,
    root: values.root,
    fRoot: values.fRoot,
    converged: values.converged,
    reason: values.reason,
    finalA: values.finalA,
    finalB: values.finalB,
  };
}

/**
 * Executa o método da bisseção e devolve todas as etapas para a animação da interface.
 */
export function runBisection({
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
    throw new BisectionError(
      "INVALID_INTERVAL",
      "O extremo a deve ser menor que o extremo b.",
      "a",
    );
  }

  const initialWidth = initialB - initialA;
  if (!Number.isFinite(initialWidth)) {
    throw new BisectionError(
      "INTERVAL_TOO_WIDE",
      "O intervalo é grande demais para os limites numéricos do navegador.",
      "b",
    );
  }

  if (parsedTolerance <= 0) {
    throw new BisectionError("INVALID_TOLERANCE", "A tolerância deve ser maior que zero.", "tolerance");
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
    fInitialA: fLeft,
    fInitialB: fRight,
    tolerance: parsedTolerance,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  if (fLeft === 0) {
    return makeResult(base, {
      root: left,
      fRoot: fLeft,
      converged: true,
      reason: "endpoint-root",
      finalA: left,
      finalB: left,
    });
  }

  if (fRight === 0) {
    return makeResult(base, {
      root: right,
      fRoot: fRight,
      converged: true,
      reason: "endpoint-root",
      finalA: right,
      finalB: right,
    });
  }

  if (Math.sign(fLeft) === Math.sign(fRight)) {
    throw new BisectionError(
      "NO_SIGN_CHANGE",
      "f(a) e f(b) devem ter sinais opostos para garantir uma raiz no intervalo.",
      "b",
      { fA: fLeft, fB: fRight },
    );
  }

  let lastMidpoint = midpointBetween(left, right);
  let lastFMidpoint = null;

  for (let iteration = 1; iteration <= parsedMaxIterations; iteration += 1) {
    const intervalWidth = right - left;
    const errorEstimate = intervalWidth / 2;
    const midpoint = midpointBetween(left, right);
    const fMidpoint =
      midpoint === left
        ? fLeft
        : midpoint === right
          ? fRight
          : evaluateAt(evaluate, midpoint, "midpoint", iteration);

    lastMidpoint = midpoint;
    lastFMidpoint = fMidpoint;

    let nextA = left;
    let nextB = right;
    let keptHalf = "none";

    if (fMidpoint !== 0 && errorEstimate > parsedTolerance && midpoint !== left && midpoint !== right) {
      if (Math.sign(fLeft) !== Math.sign(fMidpoint)) {
        nextB = midpoint;
        keptHalf = "left";
      } else {
        nextA = midpoint;
        keptHalf = "right";
      }
    }

    iterations.push({
      iteration,
      a: left,
      b: right,
      fA: fLeft,
      fB: fRight,
      intervalWidth,
      midpoint,
      fMidpoint,
      errorEstimate,
      keptHalf,
      nextA,
      nextB,
    });

    if (fMidpoint === 0) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: true,
        reason: "exact-root",
        finalA: midpoint,
        finalB: midpoint,
      });
    }

    if (errorEstimate <= parsedTolerance) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: true,
        reason: "tolerance",
        finalA: left,
        finalB: right,
      });
    }

    if (midpoint === left || midpoint === right) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: false,
        reason: "machine-precision",
        finalA: left,
        finalB: right,
      });
    }

    if (nextB === midpoint) {
      right = midpoint;
      fRight = fMidpoint;
    } else {
      left = midpoint;
      fLeft = fMidpoint;
    }
  }

  return makeResult(base, {
    root: lastMidpoint,
    fRoot: lastFMidpoint,
    converged: false,
    reason: "max-iterations",
    finalA: left,
    finalB: right,
  });
}
