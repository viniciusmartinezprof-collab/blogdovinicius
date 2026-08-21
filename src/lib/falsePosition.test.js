import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError } from "./mathExpression.js";
import { FalsePositionError, runFalsePosition } from "./falsePosition.js";

test("converge para sqrt(2) e registra a geometria de cada iteração", () => {
  const result = runFalsePosition({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    tolerance: 1e-10,
    maxIterations: 100,
  });

  assert.equal(result.converged, true);
  assert.ok(["function-value", "interval-width"].includes(result.reason));
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(result.fRoot) <= 1e-9);
  assert.equal(result.evaluate(result.root), result.fRoot);
  assert.deepEqual(Object.keys(result.iterations[0]), [
    "iteration",
    "a",
    "b",
    "fA",
    "fB",
    "estimate",
    "fEstimate",
    "errorEstimate",
    "nextA",
    "nextB",
    "keptHalf",
  ]);
  assert.ok(result.iterations.every((item) => item.estimate >= item.a && item.estimate <= item.b));
});

test("aceita números textuais e vírgula decimal", () => {
  const result = runFalsePosition({
    expression: "x^2 - 2",
    a: "1",
    b: "2",
    tolerance: "0,0001",
    maxIterations: "50",
  });

  assert.equal(result.initialA, 1);
  assert.equal(result.initialB, 2);
  assert.equal(result.tolerance, 0.0001);
  assert.equal(result.maxIterations, 50);
  assert.equal(result.converged, true);
});

test("reconhece raízes no extremo e na primeira secante", () => {
  const endpoint = runFalsePosition({ expression: "x^2 - 4", a: 2, b: 5 });
  assert.equal(endpoint.root, 2);
  assert.equal(endpoint.reason, "endpoint-root");
  assert.equal(endpoint.iterations.length, 0);

  const exact = runFalsePosition({ expression: "x - 1", a: 0, b: 3 });
  assert.equal(exact.root, 1);
  assert.equal(exact.reason, "exact-root");
  assert.equal(exact.iterations.length, 1);
  assert.equal(exact.iterations[0].keptHalf, "none");
});

test("para explicitamente no limite de iterações", () => {
  const result = runFalsePosition({
    expression: "x^3 - 2",
    a: 0,
    b: 2,
    tolerance: 1e-15,
    maxIterations: 1,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.equal(result.iterations.length, 1);
});

test("rejeita intervalos sem troca de sinal", () => {
  assert.throws(
    () => runFalsePosition({ expression: "x^2 + 1", a: -1, b: 1 }),
    (error) =>
      error instanceof FalsePositionError &&
      error.code === "NO_SIGN_CHANGE" &&
      error.field === "b" &&
      error.fA === 2 &&
      error.fB === 2,
  );
});

test("valida intervalo, tolerância, limite e campos numéricos", () => {
  assert.throws(
    () => runFalsePosition({ expression: "x", a: 2, b: 1 }),
    (error) => error instanceof FalsePositionError && error.code === "INVALID_INTERVAL",
  );
  assert.throws(
    () => runFalsePosition({ expression: "x", a: -1, b: 1, tolerance: 0 }),
    (error) => error.code === "INVALID_TOLERANCE" && error.field === "tolerance",
  );
  assert.throws(
    () => runFalsePosition({ expression: "x", a: -1, b: 1, maxIterations: 1.5 }),
    (error) => error.code === "INVALID_MAX_ITERATIONS" && error.field === "maxIterations",
  );
  assert.throws(
    () => runFalsePosition({ expression: "x", a: "", b: 1 }),
    (error) => error.code === "INVALID_NUMBER" && error.field === "a",
  );
});

test("propaga erro de sintaxe e tipa falhas de domínio da função", () => {
  assert.throws(
    () => runFalsePosition({ expression: "2x", a: -1, b: 1 }),
    (error) => error instanceof MathExpressionError && error.field === "expression",
  );
  assert.throws(
    () => runFalsePosition({ expression: "sqrt(x) - 1", a: -1, b: 2 }),
    (error) =>
      error instanceof FalsePositionError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.field === "expression" &&
      error.x === -1,
  );
  assert.throws(
    () => runFalsePosition({ expression: "1/x", a: -1, b: 2 }),
    (error) => error.code === "FUNCTION_EVALUATION_ERROR" && error.iteration === 2 && error.x === 0,
  );
});

test("evita overflow na fórmula da secante com valores de função enormes", () => {
  const result = runFalsePosition({
    expression: "1e300*x",
    a: -1,
    b: 2,
    tolerance: 1e-12,
  });

  assert.equal(result.root, 0);
  assert.equal(result.reason, "exact-root");
});

test("não confunde estagnação da secante com convergência", () => {
  const result = runFalsePosition({
    expression: "x^20 - 1",
    a: 0,
    b: 2,
    tolerance: 1e-4,
    maxIterations: 200,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.ok(Math.abs(result.fRoot) > 0.9);
  assert.equal(result.iterations.length, 200);
});
