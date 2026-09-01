import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_EPSILON = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const HARD_DIVERGENCE_LIMIT = 1e100;
const GROWTH_FACTOR = 1.5;
const GROWTH_STREAK_LIMIT = 8;
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

function parsePositiveEpsilon(value, field, label) {
  const parsed = parseFiniteNumber(value, field, label);
  if (parsed <= 0) {
    throw new NewtonRaphsonError(
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
    throw new NewtonRaphsonError(
      "INVALID_MAX_ITERATIONS",
      `O limite de iterações deve ser um inteiro entre 1 e ${MAX_ITERATIONS_LIMIT}.`,
      "maxIterations",
    );
  }
  return parsed;
}

function parseStopMode(value) {
  if (value === "all" || value === "any") return value;
  throw new NewtonRaphsonError(
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

function estimatesAgree(fine, coarse) {
  if (fine === null || coarse === null) return true;
  const scale = Math.max(Math.abs(fine), Math.abs(coarse), Number.MIN_VALUE);
  return Math.abs(fine - coarse) <= Math.max(scale * 1e-3, Number.MIN_VALUE);
}

/*
 * A diferença central com extrapolação de Richardson é preferida. Nas bordas
 * do domínio, usamos a versão unilateral. O sinalizador stable permite tentar
 * um passo maior quando o valor de f mascara a variação por cancelamento.
 */
function estimateAtStep(evaluate, x, valueAtX, h) {
  if (!Number.isFinite(h) || h <= 0) return null;

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
      if (Number.isFinite(extrapolated)) {
        return { value: extrapolated, stable: estimatesAgree(fine, coarse) };
      }
    }
    if (fine !== null) return { value: fine, stable: true };
  }

  if (rightValue !== null) {
    const fine = finiteQuotient(rightValue - valueAtX, right - x);
    if (fine !== null && wideRightValue !== null) {
      const coarse = finiteQuotient(wideRightValue - valueAtX, wideRight - x);
      const extrapolated = coarse === null ? null : 2 * fine - coarse;
      if (Number.isFinite(extrapolated)) {
        return { value: extrapolated, stable: estimatesAgree(fine, coarse) };
      }
    }
    if (fine !== null) return { value: fine, stable: true };
  }

  if (leftValue !== null) {
    const fine = finiteQuotient(valueAtX - leftValue, x - left);
    if (fine !== null && wideLeftValue !== null) {
      const coarse = finiteQuotient(valueAtX - wideLeftValue, x - wideLeft);
      const extrapolated = coarse === null ? null : 2 * fine - coarse;
      if (Number.isFinite(extrapolated)) {
        return { value: extrapolated, stable: estimatesAgree(fine, coarse) };
      }
    }
    if (fine !== null) return { value: fine, stable: true };
  }

  return null;
}

function estimateDerivative(evaluate, x, valueAtX) {
  const xScale = Math.max(1, Math.abs(x));
  const baseStep = Math.cbrt(Number.EPSILON) * xScale;
  const cancellationStep = Number.EPSILON * Math.max(1, Math.abs(valueAtX)) * 64;
  const adaptiveStep = Math.max(baseStep * 16, cancellationStep);
  const candidateSteps = [baseStep, adaptiveStep, adaptiveStep * 16]
    .filter((step, index, values) => (
      Number.isFinite(step)
      && step > 0
      && (index === 0 || step > values[index - 1])
    ));

  let fallback = null;
  for (const step of candidateSteps) {
    const candidate = estimateAtStep(evaluate, x, valueAtX, step);
    if (!candidate) continue;
    if (fallback === null) fallback = candidate.value;
    if (candidate.stable && candidate.value !== 0) return candidate.value;
    if (candidate.stable && candidate.value === 0 && valueAtX === 0) return 0;
  }
  return fallback;
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

function makeResult(base, row, converged, reason, details = {}) {
  return {
    ...base,
    root: row?.x ?? base.initialX,
    fRoot: row?.functionValue ?? null,
    converged,
    reason,
    ...details,
  };
}

/**
 * Executa x_(n+1) = x_n - f(x_n) / f'(x_n).
 *
 * A linha n = 0 sempre representa o chute inicial. Assim, maxIterations = N
 * permite N atualizações e produz, no máximo, as linhas de 0 a N.
 */
export function runNewtonRaphson({
  expression,
  x0,
  epsilon1 = DEFAULT_EPSILON,
  epsilon2 = DEFAULT_EPSILON,
  stopMode = "all",
  maxIterations = DEFAULT_MAX_ITERATIONS,
} = {}) {
  const evaluate = compileFunction(expression);
  const initialX = parseFiniteNumber(x0, "x0", "a aproximação inicial");
  const parsedEpsilon1 = parsePositiveEpsilon(epsilon1, "epsilon1", "a precisão ε₁");
  const parsedEpsilon2 = parsePositiveEpsilon(epsilon2, "epsilon2", "a precisão ε₂");
  const parsedStopMode = parseStopMode(stopMode);
  const parsedMaxIterations = parseMaxIterations(maxIterations);

  const iterations = [];
  const base = {
    expression: expression.trim(),
    evaluate,
    initialX,
    epsilon1: parsedEpsilon1,
    epsilon2: parsedEpsilon2,
    stopMode: parsedStopMode,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  let xCurrent = initialX;
  let fCurrent = evaluateAt(evaluate, xCurrent, 0);
  const initialCriterion2 = Math.abs(fCurrent) < parsedEpsilon2;
  const initialExact = fCurrent === 0;
  const initialStop = initialExact || criteriaStop(parsedStopMode, null, initialCriterion2);
  const initialRow = {
    iteration: 0,
    x: xCurrent,
    previousX: null,
    delta: null,
    functionValue: fCurrent,
    residual: Math.abs(fCurrent),
    derivativeEstimate: null,
    correction: null,
    criterion1Met: null,
    criterion2Met: initialCriterion2,
    stop: initialStop,
  };
  iterations.push(initialRow);

  if (initialStop) {
    return makeResult(
      base,
      initialRow,
      true,
      convergenceReason(initialExact, false, initialCriterion2),
    );
  }

  const visited = [xCurrent];
  let previousDelta = null;
  let growingSteps = 0;

  for (let iteration = 1; iteration <= parsedMaxIterations; iteration += 1) {
    const derivativeEstimate = estimateDerivative(evaluate, xCurrent, fCurrent);

    if (derivativeEstimate === null || derivativeEstimate === 0) {
      return makeResult(
        base,
        iterations.at(-1),
        false,
        derivativeEstimate === null ? "derivative-unavailable" : "zero-derivative",
        { failure: { iteration: iteration - 1, x: xCurrent, derivativeEstimate } },
      );
    }

    const correction = fCurrent / derivativeEstimate;
    const xNext = xCurrent - correction;

    if (!Number.isFinite(correction) || !Number.isFinite(xNext)) {
      return makeResult(base, iterations.at(-1), false, "numeric-failure", {
        failure: {
          iteration: iteration - 1,
          x: xCurrent,
          derivativeEstimate,
          correction: Number.isFinite(correction) ? correction : null,
        },
      });
    }

    const delta = Math.abs(xNext - xCurrent);
    let fNext;
    try {
      fNext = evaluateAt(evaluate, xNext, iteration);
    } catch (error) {
      if (!(error instanceof NewtonRaphsonError) || error.code !== "FUNCTION_EVALUATION_ERROR") throw error;
      const failedRow = {
        iteration,
        x: xNext,
        previousX: xCurrent,
        delta,
        functionValue: null,
        residual: null,
        derivativeEstimate,
        correction,
        criterion1Met: delta < parsedEpsilon1,
        criterion2Met: null,
        stop: false,
      };
      iterations.push(failedRow);
      return makeResult(base, failedRow, false, "function-unavailable", {
        failure: {
          message: error.message,
          x: error.x,
          iteration: error.iteration,
          causeCode: error.causeCode,
        },
      });
    }

    const residual = Math.abs(fNext);
    const criterion1Met = delta < parsedEpsilon1;
    const criterion2Met = residual < parsedEpsilon2;
    const exact = fNext === 0;
    const stop = exact || criteriaStop(parsedStopMode, criterion1Met, criterion2Met);
    const row = {
      iteration,
      x: xNext,
      previousX: xCurrent,
      delta,
      functionValue: fNext,
      residual,
      derivativeEstimate,
      correction,
      criterion1Met,
      criterion2Met,
      stop,
    };
    iterations.push(row);

    if (stop) {
      return makeResult(
        base,
        row,
        true,
        convergenceReason(exact, criterion1Met, criterion2Met),
      );
    }

    if (previousDelta !== null && delta > previousDelta * GROWTH_FACTOR) growingSteps += 1;
    else growingSteps = 0;
    const clearlyGrowing = (
      growingSteps >= GROWTH_STREAK_LIMIT
      && Math.abs(xNext) > Math.max(1, Math.abs(initialX) * 4)
    );
    if (Math.abs(xNext) > HARD_DIVERGENCE_LIMIT || clearlyGrowing) {
      return makeResult(base, row, false, "divergence");
    }

    const machineStep = Number.EPSILON * 8 * Math.max(1, Math.abs(xCurrent), Math.abs(xNext));
    if (delta <= machineStep) {
      return makeResult(base, row, false, "machine-precision");
    }

    const cycleScale = Math.max(1, Math.abs(xNext));
    const cycleTolerance = Math.max(
      Number.EPSILON * cycleScale * 64,
      Math.min(Math.sqrt(Number.EPSILON) * cycleScale, Math.max(parsedEpsilon1 * 0.1, cycleScale * 1e-12)),
    );
    const repeatedIndex = visited.findIndex((value, index) => (
      index < visited.length - 1 && Math.abs(value - xNext) <= cycleTolerance
    ));
    if (repeatedIndex >= 0) {
      return makeResult(base, row, false, "cycle", { cycleStartIteration: repeatedIndex });
    }

    visited.push(xNext);
    previousDelta = delta;
    xCurrent = xNext;
    fCurrent = fNext;
  }

  return makeResult(base, iterations.at(-1), false, "max-iterations");
}
