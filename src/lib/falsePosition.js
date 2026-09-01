import { MathExpressionError, compileExpression } from "./mathExpression.js";

const DEFAULT_EPSILON = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;
const MAX_ITERATIONS_LIMIT = 1000;
const STOP_MODES = new Set(["all", "any"]);
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

function parseStopMode(value) {
  if (STOP_MODES.has(value)) return value;
  throw new FalsePositionError(
    "INVALID_STOP_MODE",
    'O modo de parada deve ser "all" (ambos) ou "any" (qualquer um).',
    "stopMode",
  );
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

function makeIteration({
  iteration,
  a,
  b,
  fA,
  fB,
  estimate,
  fEstimate,
  epsilon1,
  epsilon2,
  stopMode,
  exactRoot = false,
  nextA = a,
  nextB = b,
  keptHalf = "none",
}) {
  const intervalWidth = Math.abs(b - a);
  const residual = Math.abs(fEstimate);
  const intervalCriterionMet = intervalWidth < epsilon1;
  const functionCriterionMet = residual < epsilon2;
  const precisionStop = stopMode === "all"
    ? intervalCriterionMet && functionCriterionMet
    : intervalCriterionMet || functionCriterionMet;

  return {
    iteration,
    a,
    b,
    fA,
    fB,
    estimate,
    fEstimate,
    signFA: Math.sign(fA),
    signFB: Math.sign(fB),
    signFEstimate: Math.sign(fEstimate),
    intervalWidth,
    residual,
    criterion1Met: intervalCriterionMet,
    criterion2Met: functionCriterionMet,
    intervalCriterionMet,
    functionCriterionMet,
    stop: exactRoot || precisionStop,
    nextA,
    nextB,
    keptHalf,
  };
}

function precisionReason(iteration) {
  if (iteration.intervalCriterionMet && iteration.functionCriterionMet) return "both-criteria";
  if (iteration.intervalCriterionMet) return "interval-width";
  return "function-value";
}

/**
 * Executa o método da falsa posição e preserva cada intervalo para animação.
 */
export function runFalsePosition({
  expression,
  a,
  b,
  epsilon1 = DEFAULT_EPSILON,
  epsilon2 = DEFAULT_EPSILON,
  stopMode = "all",
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
  const parsedEpsilon1 = parseFiniteNumber(epsilon1, "epsilon1", "a precisão ε₁");
  const parsedEpsilon2 = parseFiniteNumber(epsilon2, "epsilon2", "a precisão ε₂");
  const parsedStopMode = parseStopMode(stopMode);
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

  if (parsedEpsilon1 <= 0) {
    throw new FalsePositionError(
      "INVALID_EPSILON",
      "A precisão ε₁ deve ser maior que zero.",
      "epsilon1",
    );
  }

  if (parsedEpsilon2 <= 0) {
    throw new FalsePositionError(
      "INVALID_EPSILON",
      "A precisão ε₂ deve ser maior que zero.",
      "epsilon2",
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
    epsilon1: parsedEpsilon1,
    epsilon2: parsedEpsilon2,
    stopMode: parsedStopMode,
    maxIterations: parsedMaxIterations,
    iterations,
  };

  if (fLeft === 0 || fRight === 0) {
    const root = fLeft === 0 ? left : right;
    const fRoot = fLeft === 0 ? fLeft : fRight;
    iterations.push(makeIteration({
      iteration: 0,
      a: left,
      b: right,
      fA: fLeft,
      fB: fRight,
      estimate: root,
      fEstimate: fRoot,
      epsilon1: parsedEpsilon1,
      epsilon2: parsedEpsilon2,
      stopMode: parsedStopMode,
      exactRoot: true,
      nextA: left,
      nextB: right,
    }));
    return result(base, root, fRoot, true, "endpoint-root");
  }

  if (Math.sign(fLeft) === Math.sign(fRight)) {
    throw new FalsePositionError(
      "NO_SIGN_CHANGE",
      "f(a) e f(b) devem ter sinais opostos para garantir uma raiz no intervalo.",
      "b",
      { fA: fLeft, fB: fRight },
    );
  }

  let lastEstimate = null;
  let lastFunctionValue = null;

  for (let iteration = 0; iteration <= parsedMaxIterations; iteration += 1) {
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
    const record = makeIteration({
      iteration,
      a: left,
      b: right,
      fA: fLeft,
      fB: fRight,
      estimate,
      fEstimate,
      epsilon1: parsedEpsilon1,
      epsilon2: parsedEpsilon2,
      stopMode: parsedStopMode,
      exactRoot: fEstimate === 0,
    });
    const machinePrecisionReached = estimate === left || estimate === right;

    // Só descrevemos um próximo intervalo quando a atualização realmente será
    // executada. Linhas de parada, limite e estagnação preservam [a, b].
    if (!record.stop && !machinePrecisionReached && iteration < parsedMaxIterations) {
      if (Math.sign(fLeft) !== Math.sign(fEstimate)) {
        record.nextB = estimate;
        record.keptHalf = "left";
      } else {
        record.nextA = estimate;
        record.keptHalf = "right";
      }
    }
    iterations.push(record);

    lastEstimate = estimate;
    lastFunctionValue = fEstimate;

    if (fEstimate === 0) return result(base, estimate, fEstimate, true, "exact-root");
    if (record.stop) {
      return result(base, estimate, fEstimate, true, precisionReason(record));
    }
    if (machinePrecisionReached) {
      return result(base, estimate, fEstimate, false, "machine-precision");
    }
    if (iteration === parsedMaxIterations) break;

    if (record.nextB === estimate) {
      right = estimate;
      fRight = fEstimate;
    } else {
      left = estimate;
      fLeft = fEstimate;
    }
  }

  return result(base, lastEstimate, lastFunctionValue, false, "max-iterations");
}
