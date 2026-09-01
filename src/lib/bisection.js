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

function functionSign(value) {
  if (value === null || value === undefined) return null;
  if (value === 0) return 0;
  return value < 0 ? -1 : 1;
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

  const initialEndpointRoot = fLeft === 0
    ? { root: left, fRoot: fLeft }
    : fRight === 0
      ? { root: right, fRoot: fRight }
      : null;

  if (!initialEndpointRoot && functionSign(fLeft) === functionSign(fRight)) {
    throw new BisectionError(
      "NO_SIGN_CHANGE",
      "f(a) e f(b) devem ter sinais opostos para garantir uma raiz no intervalo.",
      "b",
      { fA: fLeft, fB: fRight },
    );
  }

  let lastMidpoint = midpointBetween(left, right);
  let lastFMidpoint = null;

  // A linha 0 descreve o intervalo inicial. Cada passagem para a linha seguinte
  // corresponde a uma redução efetivamente realizada; portanto, N atualizações
  // produzem no máximo as linhas 0, 1, ..., N.
  for (let iteration = 0; iteration <= parsedMaxIterations; iteration += 1) {
    const intervalWidth = right - left;
    const errorEstimate = intervalWidth / 2;
    const midpoint = midpointBetween(left, right);
    let fMidpoint;

    if (midpoint === left) {
      fMidpoint = fLeft;
    } else if (midpoint === right) {
      fMidpoint = fRight;
    } else if (initialEndpointRoot && iteration === 0) {
      // Uma raiz na extremidade deve encerrar imediatamente, mesmo que a função
      // não esteja definida no ponto médio (que não precisa ser usado no método).
      try {
        fMidpoint = evaluateAt(evaluate, midpoint, "midpoint", iteration);
      } catch (error) {
        if (!(error instanceof BisectionError) || error.code !== "FUNCTION_EVALUATION_ERROR") {
          throw error;
        }
        fMidpoint = null;
      }
    } else {
      fMidpoint = evaluateAt(evaluate, midpoint, "midpoint", iteration);
    }

    lastMidpoint = midpoint;
    lastFMidpoint = fMidpoint;

    const endpointRoot = iteration === 0 ? initialEndpointRoot : null;
    const exactMidpointRoot = fMidpoint === 0;
    const widthCriterionMet = intervalWidth < parsedTolerance;
    const stop = Boolean(endpointRoot || exactMidpointRoot || widthCriterionMet);
    const stopReason = endpointRoot
      ? "endpoint-root"
      : exactMidpointRoot
        ? "exact-root"
        : widthCriterionMet
          ? "tolerance"
          : null;
    const machinePrecisionReached = midpoint === left || midpoint === right;
    let nextA = left;
    let nextB = right;
    let keptHalf = "none";

    if (!stop && !machinePrecisionReached && iteration < parsedMaxIterations) {
      if (functionSign(fLeft) !== functionSign(fMidpoint)) {
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
      signFA: functionSign(fLeft),
      signFB: functionSign(fRight),
      intervalWidth,
      intervalCriterionMet: widthCriterionMet,
      widthCriterionMet,
      midpoint,
      m: midpoint,
      fMidpoint,
      signFMidpoint: functionSign(fMidpoint),
      signFM: functionSign(fMidpoint),
      errorEstimate,
      stop,
      stopReason,
      keptHalf,
      nextA,
      nextB,
    });

    if (endpointRoot) {
      return makeResult(base, {
        root: endpointRoot.root,
        fRoot: endpointRoot.fRoot,
        converged: true,
        reason: "endpoint-root",
        finalA: endpointRoot.root,
        finalB: endpointRoot.root,
      });
    }

    if (exactMidpointRoot) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: true,
        reason: "exact-root",
        finalA: midpoint,
        finalB: midpoint,
      });
    }

    if (widthCriterionMet) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: true,
        reason: "tolerance",
        finalA: left,
        finalB: right,
      });
    }

    if (machinePrecisionReached) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: false,
        reason: "machine-precision",
        finalA: left,
        finalB: right,
      });
    }

    if (iteration === parsedMaxIterations) {
      return makeResult(base, {
        root: midpoint,
        fRoot: fMidpoint,
        converged: false,
        reason: "max-iterations",
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

  // O laço sempre retorna por convergência, precisão da máquina ou limite.
  return makeResult(base, {
    root: lastMidpoint,
    fRoot: lastFMidpoint,
    converged: false,
    reason: "max-iterations",
    finalA: left,
    finalB: right,
  });
}
