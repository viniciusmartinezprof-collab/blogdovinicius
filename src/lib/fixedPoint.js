import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_EPSILON = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const HARD_DIVERGENCE_LIMIT = 1e100;
const GROWTH_FACTOR = 1.5;
const GROWTH_STREAK_LIMIT = 8;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;
const STOP_MODES = new Set(["all", "any"]);

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

function parsePositiveNumber(value, field, label) {
  const parsed = parseFiniteNumber(value, field, label);
  if (parsed <= 0) {
    throw new FixedPointError(
      "INVALID_EPSILON",
      `${label.charAt(0).toUpperCase()}${label.slice(1)} deve ser maior que zero.`,
      field,
    );
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

function parseStopMode(value) {
  const parsed = String(value ?? "all").trim().toLowerCase();
  if (!STOP_MODES.has(parsed)) {
    throw new FixedPointError(
      "INVALID_STOP_MODE",
      'O modo de parada deve ser "all" (E) ou "any" (OU).',
      "stopMode",
    );
  }
  return parsed;
}

function compileFunction(expression, field) {
  try {
    return compileExpression(expression);
  } catch (error) {
    if (error instanceof MathExpressionError) error.field = field;
    throw error;
  }
}

function evaluateAt(evaluate, x, iteration, stage) {
  try {
    return evaluate(x);
  } catch (error) {
    if (!(error instanceof MathExpressionError)) throw error;

    const isResidual = stage === "function";
    const stageText = isResidual ? "ao calcular f(xₙ)" : "ao calcular g(xₙ)";
    throw new FixedPointError(
      "FUNCTION_EVALUATION_ERROR",
      `${error.message.replace(/\.$/, "")} ${stageText} na iteração ${iteration} (x = ${x}).`,
      isResidual ? "functionExpression" : "iterationExpression",
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
  if (!Number.isFinite(valueAtX)) return null;
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

function stoppingReason(criterion1Met, criterion2Met) {
  if (criterion1Met && criterion2Met) return "both-criteria";
  if (criterion1Met) return "step-tolerance";
  return "residual-tolerance";
}

function makeResult(base, row, converged, reason) {
  return {
    ...base,
    root: row?.x ?? base.initialX,
    fRoot: row?.functionValue ?? null,
    residual: row?.residual ?? null,
    converged,
    reason,
  };
}

/** Executa x_(n+1) = g(x_n) e devolve os estados x_0, ..., x_N. */
export function runFixedPoint({
  functionExpression,
  iterationExpression,
  x0,
  epsilon1 = DEFAULT_EPSILON,
  epsilon2 = DEFAULT_EPSILON,
  stopMode = "all",
  maxIterations = DEFAULT_MAX_ITERATIONS,
} = {}) {
  const evaluateFunction = compileFunction(functionExpression, "functionExpression");
  const evaluateIteration = compileFunction(iterationExpression, "iterationExpression");
  const initialX = parseFiniteNumber(x0, "x0", "a aproximação inicial");
  const parsedEpsilon1 = parsePositiveNumber(epsilon1, "epsilon1", "a precisão ε₁");
  const parsedEpsilon2 = parsePositiveNumber(epsilon2, "epsilon2", "a precisão ε₂");
  const parsedStopMode = parseStopMode(stopMode);
  const parsedMaxIterations = parseMaxIterations(maxIterations);
  const iterations = [];
  const base = {
    functionExpression: functionExpression.trim(),
    iterationExpression: iterationExpression.trim(),
    evaluateFunction,
    evaluateIteration,
    initialX,
    epsilon1: parsedEpsilon1,
    epsilon2: parsedEpsilon2,
    stopMode: parsedStopMode,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  let x = initialX;
  let previousX = null;
  let previousDelta = null;
  let growingSteps = 0;

  for (let iteration = 0; iteration <= parsedMaxIterations; iteration += 1) {
    const delta = previousX === null ? null : Math.abs(x - previousX);
    const functionValue = evaluateAt(evaluateFunction, x, iteration, "function");
    const residual = Math.abs(functionValue);

    if ((delta !== null && !Number.isFinite(delta)) || !Number.isFinite(residual)) {
      throw new FixedPointError(
        "NUMERIC_FAILURE",
        "A aproximação excedeu os limites numéricos do navegador.",
        "iterationExpression",
        { iteration, x },
      );
    }

    const criterion1Met = delta === null ? null : delta < parsedEpsilon1;
    const criterion2Met = residual < parsedEpsilon2;
    const exactRoot = functionValue === 0;
    const criteriaMet = parsedStopMode === "all"
      ? criterion1Met === true && criterion2Met
      : criterion1Met === true || criterion2Met;

    if (delta !== null) {
      if (previousDelta !== null && delta > previousDelta * GROWTH_FACTOR) growingSteps += 1;
      else growingSteps = 0;
    }
    const clearlyGrowing =
      growingSteps >= GROWTH_STREAK_LIMIT &&
      Math.abs(x) > Math.max(1, Math.abs(initialX) * 4);
    const diverged = Math.abs(x) > HARD_DIVERGENCE_LIMIT || clearlyGrowing;
    const terminalRow = exactRoot || criteriaMet || diverged || iteration === parsedMaxIterations;
    const iterationValue = terminalRow
      ? optionalEvaluation(evaluateIteration, x)
      : evaluateAt(evaluateIteration, x, iteration, "iteration");
    const derivativeEstimate = iterationValue === null
      ? null
      : estimateDerivative(evaluateIteration, x, iterationValue);
    const row = {
      iteration,
      x,
      previousX,
      delta,
      functionValue,
      residual,
      derivativeEstimate,
      criterion1Met,
      criterion2Met,
      stop: exactRoot || criteriaMet,
    };
    iterations.push(row);

    if (exactRoot) return makeResult(base, row, true, "exact-root");
    if (criteriaMet) {
      return makeResult(base, row, true, stoppingReason(criterion1Met, criterion2Met));
    }
    if (diverged) return makeResult(base, row, false, "divergence");
    if (iteration === parsedMaxIterations) return makeResult(base, row, false, "max-iterations");

    const nextX = iterationValue;
    if (!Number.isFinite(nextX)) {
      return makeResult(base, row, false, "numeric-failure");
    }
    const machineStep = Number.EPSILON * 8 * Math.max(1, Math.abs(x), Math.abs(nextX));
    if (nextX === x || (Math.abs(nextX - x) <= machineStep && parsedStopMode === "all" && !criterion2Met)) {
      const nextFunctionValue = evaluateAt(evaluateFunction, nextX, iteration + 1, "function");
      const nextResidual = Math.abs(nextFunctionValue);
      const nextCriterion1Met = Math.abs(nextX - x) < parsedEpsilon1;
      const nextCriterion2Met = nextResidual < parsedEpsilon2;
      const nextExactRoot = nextFunctionValue === 0;
      const nextCriteriaMet = parsedStopMode === "all"
        ? nextCriterion1Met && nextCriterion2Met
        : nextCriterion1Met || nextCriterion2Met;
      const nextIterationValue = optionalEvaluation(evaluateIteration, nextX);
      const nextRow = {
        iteration: iteration + 1,
        x: nextX,
        previousX: x,
        delta: Math.abs(nextX - x),
        functionValue: nextFunctionValue,
        residual: nextResidual,
        derivativeEstimate: nextIterationValue === null
          ? null
          : estimateDerivative(evaluateIteration, nextX, nextIterationValue),
        criterion1Met: nextCriterion1Met,
        criterion2Met: nextCriterion2Met,
        stop: nextExactRoot || nextCriteriaMet,
      };
      iterations.push(nextRow);
      if (nextExactRoot) return makeResult(base, nextRow, true, "exact-root");
      if (nextCriteriaMet) {
        return makeResult(base, nextRow, true, stoppingReason(nextCriterion1Met, nextCriterion2Met));
      }
      return makeResult(base, nextRow, false, "machine-precision");
    }

    previousDelta = delta;
    previousX = x;
    x = nextX;
  }

  return makeResult(base, iterations.at(-1), false, "max-iterations");
}
