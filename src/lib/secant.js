import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_EPSILON = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const HARD_DIVERGENCE_LIMIT = 1e100;
const GROWTH_FACTOR = 1.7;
const GROWTH_STREAK_LIMIT = 8;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class SecantError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "SecantError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new SecantError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new SecantError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new SecantError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }
  return parsed;
}

function parsePositiveEpsilon(value, field, label) {
  const parsed = parseFiniteNumber(value, field, label);
  if (parsed <= 0) {
    throw new SecantError("INVALID_EPSILON", `${label} deve ser maior que zero.`, field);
  }
  return parsed;
}

function parseMaxIterations(value) {
  const parsed = parseFiniteNumber(value, "maxIterations", "o limite de iterações");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ITERATIONS_LIMIT) {
    throw new SecantError(
      "INVALID_MAX_ITERATIONS",
      `O limite de iterações deve ser um inteiro entre 1 e ${MAX_ITERATIONS_LIMIT}.`,
      "maxIterations",
    );
  }
  return parsed;
}

function parseStopMode(value) {
  if (value === "all" || value === "any") return value;
  throw new SecantError(
    "INVALID_STOP_MODE",
    "Escolha se todos os critérios (E) ou qualquer critério (OU) deve encerrar o método.",
    "stopMode",
  );
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

    throw new SecantError(
      "FUNCTION_EVALUATION_ERROR",
      `${error.message.replace(/\.$/, "")} ao avaliar a função na iteração ${iteration} (x = ${x}).`,
      "expression",
      { x, iteration, causeCode: error.code, position: error.position },
    );
  }
}

function criteriaStop(stopMode, criterion1Met, criterion2Met) {
  return stopMode === "all"
    ? criterion1Met === true && criterion2Met === true
    : criterion1Met === true || criterion2Met === true;
}

function convergenceReason(exact, criterion1Met, criterion2Met) {
  if (exact) return "exact-root";
  if (criterion1Met && criterion2Met) return "both-criteria";
  if (criterion1Met) return "step-tolerance";
  return "residual-tolerance";
}

function secantSlope(xPrevious, xCurrent, fPrevious, fCurrent) {
  const denominator = xCurrent - xPrevious;
  if (denominator === 0) return null;
  const slope = (fCurrent - fPrevious) / denominator;
  return Number.isFinite(slope) ? slope : null;
}

function makeResult(base, row, converged, reason, details = {}) {
  return {
    ...base,
    root: row?.x ?? base.initialX1,
    fRoot: row?.functionValue ?? null,
    converged,
    reason,
    ...details,
  };
}

function makePlotFields(row) {
  return {
    ...row,
    a: row.previousX,
    b: row.currentBeforeStep ?? row.x,
    fA: row.previousFunctionValue,
    fB: row.currentBeforeFunctionValue ?? row.functionValue,
    estimate: row.x,
    fEstimate: row.functionValue,
    signFA: Math.sign(row.previousFunctionValue),
    signFB: Math.sign(row.currentBeforeFunctionValue ?? row.functionValue),
    signFEstimate: Math.sign(row.functionValue),
    intervalWidth: Math.abs((row.currentBeforeStep ?? row.x) - row.previousX),
    keptHalf: "none",
  };
}

/**
 * Executa x_(n+1) = x_n - f(x_n)(x_n - x_(n-1)) / (f(x_n) - f(x_(n-1))).
 *
 * A linha n = 0 registra os dois chutes iniciais e usa x_1 como aproximação
 * atual. maxIterations = N permite N novas aproximações e produz, no máximo,
 * linhas de 0 a N.
 */
export function runSecant({
  expression,
  x0,
  x1,
  epsilon1 = DEFAULT_EPSILON,
  epsilon2 = DEFAULT_EPSILON,
  stopMode = "all",
  maxIterations = DEFAULT_MAX_ITERATIONS,
} = {}) {
  const evaluate = compileFunction(expression);
  const initialX0 = parseFiniteNumber(x0, "x0", "o primeiro chute x₀");
  const initialX1 = parseFiniteNumber(x1, "x1", "o segundo chute x₁");
  const parsedEpsilon1 = parsePositiveEpsilon(epsilon1, "epsilon1", "A precisão ε₁");
  const parsedEpsilon2 = parsePositiveEpsilon(epsilon2, "epsilon2", "A precisão ε₂");
  const parsedStopMode = parseStopMode(stopMode);
  const parsedMaxIterations = parseMaxIterations(maxIterations);

  if (initialX0 === initialX1) {
    throw new SecantError("EQUAL_INITIAL_GUESSES", "Use dois chutes iniciais distintos.", "x1");
  }

  const iterations = [];
  const base = {
    expression: expression.trim(),
    evaluate,
    initialX0,
    initialX1,
    epsilon1: parsedEpsilon1,
    epsilon2: parsedEpsilon2,
    stopMode: parsedStopMode,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  let xPrevious = initialX0;
  let xCurrent = initialX1;
  let fPrevious = evaluateAt(evaluate, xPrevious, 0);
  let fCurrent = evaluateAt(evaluate, xCurrent, 0);
  const initialDelta = Math.abs(xCurrent - xPrevious);
  const initialCriterion1 = initialDelta < parsedEpsilon1;
  const initialCriterion2 = Math.abs(fCurrent) < parsedEpsilon2;
  const initialExact = fCurrent === 0;
  const initialStop = initialExact || criteriaStop(parsedStopMode, initialCriterion1, initialCriterion2);
  const initialRow = makePlotFields({
    iteration: 0,
    previousX: xPrevious,
    x: xCurrent,
    currentBeforeStep: xCurrent,
    previousFunctionValue: fPrevious,
    functionValue: fCurrent,
    currentBeforeFunctionValue: fCurrent,
    delta: initialDelta,
    residual: Math.abs(fCurrent),
    secantSlope: null,
    correction: null,
    criterion1Met: initialCriterion1,
    criterion2Met: initialCriterion2,
    stop: initialStop,
  });
  iterations.push(initialRow);

  if (initialStop) {
    return makeResult(
      base,
      initialRow,
      true,
      convergenceReason(initialExact, initialCriterion1, initialCriterion2),
    );
  }

  let previousDelta = initialDelta;
  let growingSteps = 0;

  for (let iteration = 1; iteration <= parsedMaxIterations; iteration += 1) {
    const slope = secantSlope(xPrevious, xCurrent, fPrevious, fCurrent);
    if (slope === null || slope === 0) {
      return makeResult(
        base,
        iterations.at(-1),
        false,
        slope === null ? "slope-unavailable" : "zero-slope",
        { failure: { iteration: iteration - 1, xPrevious, xCurrent, fPrevious, fCurrent, secantSlope: slope } },
      );
    }

    const correction = fCurrent / slope;
    const xNext = xCurrent - correction;
    if (!Number.isFinite(correction) || !Number.isFinite(xNext)) {
      return makeResult(base, iterations.at(-1), false, "numeric-failure", {
        failure: { iteration: iteration - 1, xPrevious, xCurrent, secantSlope: slope },
      });
    }

    const delta = Math.abs(xNext - xCurrent);
    let fNext;
    try {
      fNext = evaluateAt(evaluate, xNext, iteration);
    } catch (error) {
      if (!(error instanceof SecantError) || error.code !== "FUNCTION_EVALUATION_ERROR") throw error;
      const failedRow = makePlotFields({
        iteration,
        previousX: xPrevious,
        x: xNext,
        currentBeforeStep: xCurrent,
        previousFunctionValue: fPrevious,
        functionValue: null,
        currentBeforeFunctionValue: fCurrent,
        delta,
        residual: null,
        secantSlope: slope,
        correction,
        criterion1Met: delta < parsedEpsilon1,
        criterion2Met: null,
        stop: false,
      });
      iterations.push(failedRow);
      return makeResult(base, failedRow, false, "function-unavailable", {
        failure: { message: error.message, x: error.x, iteration: error.iteration, causeCode: error.causeCode },
      });
    }

    const residual = Math.abs(fNext);
    const criterion1Met = delta < parsedEpsilon1;
    const criterion2Met = residual < parsedEpsilon2;
    const exact = fNext === 0;
    const stop = exact || criteriaStop(parsedStopMode, criterion1Met, criterion2Met);
    const row = makePlotFields({
      iteration,
      previousX: xPrevious,
      x: xNext,
      currentBeforeStep: xCurrent,
      previousFunctionValue: fPrevious,
      functionValue: fNext,
      currentBeforeFunctionValue: fCurrent,
      delta,
      residual,
      secantSlope: slope,
      correction,
      criterion1Met,
      criterion2Met,
      stop,
    });
    iterations.push(row);

    if (stop) {
      return makeResult(base, row, true, convergenceReason(exact, criterion1Met, criterion2Met));
    }

    if (previousDelta !== null && delta > previousDelta * GROWTH_FACTOR) growingSteps += 1;
    else growingSteps = 0;
    if (
      Math.abs(xNext) > HARD_DIVERGENCE_LIMIT
      || (growingSteps >= GROWTH_STREAK_LIMIT && Math.abs(xNext) > Math.max(1, Math.abs(initialX1) * 4))
    ) {
      return makeResult(base, row, false, "divergence");
    }

    const machineStep = Number.EPSILON * 8 * Math.max(1, Math.abs(xCurrent), Math.abs(xNext));
    if (delta <= machineStep) {
      return makeResult(base, row, false, "machine-precision");
    }

    previousDelta = delta;
    xPrevious = xCurrent;
    fPrevious = fCurrent;
    xCurrent = xNext;
    fCurrent = fNext;
  }

  return makeResult(base, iterations.at(-1), false, "max-iterations");
}
