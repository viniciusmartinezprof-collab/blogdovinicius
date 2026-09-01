import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError } from "./mathExpression.js";
import { FalsePositionError, runFalsePosition } from "./falsePosition.js";

test("começa em zero, converge por qualquer critério e registra a tabela completa", () => {
  const result = runFalsePosition({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    epsilon1: 1e-10,
    epsilon2: 1e-10,
    stopMode: "any",
    maxIterations: 100,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "function-value");
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-9);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations.at(-1).stop, true);
  assert.deepEqual(Object.keys(result.iterations[0]), [
    "iteration",
    "a",
    "b",
    "fA",
    "fB",
    "estimate",
    "fEstimate",
    "signFA",
    "signFB",
    "signFEstimate",
    "intervalWidth",
    "residual",
    "criterion1Met",
    "criterion2Met",
    "intervalCriterionMet",
    "functionCriterionMet",
    "stop",
    "nextA",
    "nextB",
    "keptHalf",
  ]);
  assert.ok(result.iterations.every((item) => item.estimate >= item.a && item.estimate <= item.b));
  assert.ok(result.iterations.every((item) => item.intervalWidth === Math.abs(item.b - item.a)));
  assert.ok(result.iterations.every((item) => item.residual === Math.abs(item.fEstimate)));
});

test("aceita números textuais, vírgula decimal e usa ambos os critérios por padrão", () => {
  const result = runFalsePosition({
    expression: "x^2 - 2",
    a: "1",
    b: "2",
    epsilon1: "2",
    epsilon2: "0,3",
    maxIterations: "50",
  });

  assert.equal(result.initialA, 1);
  assert.equal(result.initialB, 2);
  assert.equal(result.epsilon1, 2);
  assert.equal(result.epsilon2, 0.3);
  assert.equal(result.stopMode, "all");
  assert.equal(result.maxIterations, 50);
  assert.equal(result.converged, true);
  assert.equal(result.reason, "both-criteria");
  assert.equal(result.iterations.length, 1);
});

test("modo OU para quando apenas um critério é satisfeito; modo E continua", () => {
  const shared = {
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    epsilon1: 2,
    epsilon2: 0.1,
    maxIterations: 1,
  };
  const any = runFalsePosition({ ...shared, stopMode: "any" });
  const all = runFalsePosition({ ...shared, stopMode: "all" });

  assert.equal(any.iterations.length, 1);
  assert.equal(any.iterations[0].intervalCriterionMet, true);
  assert.equal(any.iterations[0].functionCriterionMet, false);
  assert.equal(any.iterations[0].stop, true);
  assert.equal(any.reason, "interval-width");

  assert.equal(all.iterations.length, 2);
  assert.equal(all.iterations[0].stop, false);
  assert.equal(all.iterations[1].iteration, 1);
});

test("comparações com ε são estritas e não param na igualdade", () => {
  const result = runFalsePosition({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    epsilon1: 1,
    epsilon2: 0.22222222222222232,
    stopMode: "any",
    maxIterations: 1,
  });

  assert.equal(result.iterations[0].intervalWidth, result.epsilon1);
  assert.equal(result.iterations[0].residual, result.epsilon2);
  assert.equal(result.iterations[0].intervalCriterionMet, false);
  assert.equal(result.iterations[0].functionCriterionMet, false);
  assert.equal(result.iterations[0].stop, false);
  assert.equal(result.iterations.length, 2);
});

test("máximo N permite N atualizações e produz as linhas de 0 a N", () => {
  const result = runFalsePosition({
    expression: "x^3 - 2",
    a: 0,
    b: 2,
    epsilon1: 1e-15,
    epsilon2: 1e-15,
    stopMode: "all",
    maxIterations: 3,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.deepEqual(result.iterations.map((item) => item.iteration), [0, 1, 2, 3]);
  assert.ok(result.iterations.every((item) => item.stop === false));
  assert.equal(result.iterations.at(-1).keptHalf, "none");
  assert.equal(result.iterations.at(-1).nextA, result.iterations.at(-1).a);
  assert.equal(result.iterations.at(-1).nextB, result.iterations.at(-1).b);
});

test("raízes exatas nas extremidades e na primeira secante sempre param na linha zero", () => {
  const endpoint = runFalsePosition({ expression: "x^2 - 4", a: 2, b: 5 });
  assert.equal(endpoint.root, 2);
  assert.equal(endpoint.reason, "endpoint-root");
  assert.equal(endpoint.iterations.length, 1);
  assert.equal(endpoint.iterations[0].iteration, 0);
  assert.equal(endpoint.iterations[0].stop, true);
  assert.equal(endpoint.iterations[0].signFEstimate, 0);
  assert.equal(endpoint.iterations[0].nextA, endpoint.iterations[0].a);
  assert.equal(endpoint.iterations[0].nextB, endpoint.iterations[0].b);

  const exact = runFalsePosition({ expression: "x - 1", a: 0, b: 3 });
  assert.equal(exact.root, 1);
  assert.equal(exact.reason, "exact-root");
  assert.equal(exact.iterations.length, 1);
  assert.equal(exact.iterations[0].iteration, 0);
  assert.equal(exact.iterations[0].keptHalf, "none");
  assert.equal(exact.iterations[0].stop, true);
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

test("valida intervalo, precisões, modo de parada, limite e campos numéricos", () => {
  assert.throws(
    () => runFalsePosition({ expression: "x", a: 2, b: 1 }),
    (error) => error instanceof FalsePositionError && error.code === "INVALID_INTERVAL",
  );
  assert.throws(
    () => runFalsePosition({ expression: "x", a: -1, b: 1, epsilon1: 0 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon1",
  );
  assert.throws(
    () => runFalsePosition({ expression: "x", a: -1, b: 1, epsilon2: -1 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon2",
  );
  assert.throws(
    () => runFalsePosition({ expression: "x", a: -1, b: 1, stopMode: "either" }),
    (error) => error.code === "INVALID_STOP_MODE" && error.field === "stopMode",
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
    (error) => error.code === "FUNCTION_EVALUATION_ERROR" && error.iteration === 1 && error.x === 0,
  );
});

test("evita overflow na fórmula da secante com valores de função enormes", () => {
  const result = runFalsePosition({
    expression: "1e300*x",
    a: -1,
    b: 2,
    epsilon1: 1e-12,
    epsilon2: 1e-12,
  });

  assert.equal(result.root, 0);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.iterations[0].stop, true);
});

test("não confunde estagnação da secante com convergência", () => {
  const result = runFalsePosition({
    expression: "x^20 - 1",
    a: 0,
    b: 2,
    epsilon1: 1e-4,
    epsilon2: 1e-4,
    stopMode: "all",
    maxIterations: 200,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.ok(Math.abs(result.fRoot) > 0.9);
  assert.equal(result.iterations.length, 201);
  assert.equal(result.iterations.at(-1).iteration, 200);
});
