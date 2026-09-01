import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError } from "./mathExpression.js";
import { FixedPointError, runFixedPoint } from "./fixedPoint.js";

test("converge para a raiz de cos(x) - x e registra os estados desde x0", () => {
  const result = runFixedPoint({
    functionExpression: "cos(x) - x",
    iterationExpression: "cos(x)",
    x0: 1,
    epsilon1: 1e-10,
    epsilon2: 1e-10,
    stopMode: "all",
    maxIterations: 200,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "both-criteria");
  assert.ok(Math.abs(result.root - 0.7390851332151607) < 1e-9);
  assert.ok(result.residual < 1e-10);
  assert.deepEqual(Object.keys(result.iterations[0]), [
    "iteration",
    "x",
    "previousX",
    "delta",
    "functionValue",
    "residual",
    "derivativeEstimate",
    "criterion1Met",
    "criterion2Met",
    "stop",
  ]);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations[0].x, 1);
  assert.equal(result.iterations[0].previousX, null);
  assert.equal(result.iterations[0].delta, null);
  assert.equal(result.iterations[0].criterion1Met, null);
  assert.equal(result.iterations.at(-1).stop, true);
  assert.ok(Math.abs(result.iterations.at(-1).derivativeEstimate + 0.673612) < 1e-4);
});

test("usa f para o resíduo e g, independentemente, para gerar a sequência", () => {
  const result = runFixedPoint({
    functionExpression: "x^2 - 2",
    iterationExpression: "(x + 2/x)/2",
    x0: "1",
    epsilon1: "0,000000000001",
    epsilon2: "0,000000000001",
    maxIterations: "30",
  });

  assert.equal(result.converged, true);
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-12);
  assert.equal(result.functionExpression, "x^2 - 2");
  assert.equal(result.iterationExpression, "(x + 2/x)/2");
  assert.equal(result.initialX, 1);
  assert.equal(result.epsilon1, 1e-12);
  assert.equal(result.epsilon2, 1e-12);
  assert.equal(result.stopMode, "all");
  assert.equal(result.maxIterations, 30);
  assert.equal(result.iterations[1].x, 1.5);
  assert.equal(result.iterations[1].functionValue, 0.25);
});

test("aplica a regra especial da iteração zero nos modos OU e E", () => {
  const any = runFixedPoint({
    functionExpression: "x",
    iterationExpression: "x/2",
    x0: 0.5,
    epsilon1: 1,
    epsilon2: 1,
    stopMode: "any",
  });
  assert.equal(any.reason, "residual-tolerance");
  assert.equal(any.iterations.length, 1);
  assert.equal(any.iterations[0].criterion1Met, null);
  assert.equal(any.iterations[0].criterion2Met, true);
  assert.equal(any.iterations[0].stop, true);

  const all = runFixedPoint({
    functionExpression: "x",
    iterationExpression: "x/2",
    x0: 0.5,
    epsilon1: 1,
    epsilon2: 1,
    stopMode: "all",
  });
  assert.equal(all.reason, "both-criteria");
  assert.equal(all.iterations.length, 2);
  assert.equal(all.iterations[0].stop, false);
  assert.equal(all.iterations[1].stop, true);
});

test("uma raiz exata em x0 sempre encerra, mesmo que g não possa ser avaliada", () => {
  const result = runFixedPoint({
    functionExpression: "x - 2",
    iterationExpression: "sqrt(-1)",
    x0: 2,
    epsilon1: 1e-12,
    epsilon2: 1e-12,
    stopMode: "all",
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.root, 2);
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].stop, true);
  assert.equal(result.iterations[0].derivativeEstimate, null);
});

test("faz comparações estritas com epsilon1 e epsilon2", () => {
  const stepAtBoundary = runFixedPoint({
    functionExpression: "x + 10",
    iterationExpression: "x + 1",
    x0: 0,
    epsilon1: 1,
    epsilon2: 1,
    stopMode: "any",
    maxIterations: 1,
  });
  assert.equal(stepAtBoundary.converged, false);
  assert.equal(stepAtBoundary.iterations[1].delta, 1);
  assert.equal(stepAtBoundary.iterations[1].criterion1Met, false);
  assert.equal(stepAtBoundary.iterations[1].stop, false);

  const residualAtBoundary = runFixedPoint({
    functionExpression: "x + 1",
    iterationExpression: "x + 2",
    x0: 0,
    epsilon1: 0.5,
    epsilon2: 1,
    stopMode: "any",
    maxIterations: 1,
  });
  assert.equal(residualAtBoundary.iterations[0].residual, 1);
  assert.equal(residualAtBoundary.iterations[0].criterion2Met, false);
  assert.equal(residualAtBoundary.iterations[0].stop, false);
});

test("o modo OU para com apenas um critério e o modo E exige os dois", () => {
  const options = {
    functionExpression: "100",
    iterationExpression: "x + 0.1",
    x0: 0,
    epsilon1: 0.2,
    epsilon2: 1,
    maxIterations: 2,
  };
  const any = runFixedPoint({ ...options, stopMode: "any" });
  assert.equal(any.converged, true);
  assert.equal(any.reason, "step-tolerance");
  assert.equal(any.iterations.at(-1).criterion1Met, true);
  assert.equal(any.iterations.at(-1).criterion2Met, false);
  assert.equal(any.iterations.at(-1).stop, true);

  const all = runFixedPoint({ ...options, stopMode: "all" });
  assert.equal(all.converged, false);
  assert.equal(all.reason, "max-iterations");
  assert.equal(all.iterations.length, 3);
  assert.ok(all.iterations.every((row) => row.stop === false));
});

test("máximo N representa N atualizações e produz as linhas de 0 a N", () => {
  const result = runFixedPoint({
    functionExpression: "x - 10",
    iterationExpression: "-x",
    x0: 1,
    epsilon1: 1e-12,
    epsilon2: 1e-12,
    maxIterations: 3,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.deepEqual(result.iterations.map((row) => row.iteration), [0, 1, 2, 3]);
  assert.deepEqual(result.iterations.map((row) => row.x), [1, -1, 1, -1]);
  assert.ok(result.iterations.every((row) => row.stop === false));
});

test("detecta divergência persistente e mantém Stop? como não", () => {
  const result = runFixedPoint({
    functionExpression: "x + 1",
    iterationExpression: "2*x",
    x0: 1,
    epsilon1: 1e-12,
    epsilon2: 1e-12,
    maxIterations: 100,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "divergence");
  assert.ok(result.iterations.length < 101);
  assert.equal(result.iterations.at(-1).stop, false);
  assert.ok(Math.abs(result.iterations.at(-1).derivativeEstimate - 2) < 1e-8);
});

test("passo nulo com resíduo incompatível encerra por precisão de máquina no modo E", () => {
  const result = runFixedPoint({
    functionExpression: "x + 1",
    iterationExpression: "x",
    x0: 0,
    epsilon1: 1e-6,
    epsilon2: 1e-6,
    stopMode: "all",
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "machine-precision");
  assert.deepEqual(result.iterations.map((row) => row.iteration), [0, 1]);
  assert.equal(result.iterations[1].criterion1Met, true);
  assert.equal(result.iterations[1].criterion2Met, false);
  assert.equal(result.iterations[1].stop, false);
});

test("valida aproximação, precisões, modo e limite de iterações", () => {
  const valid = { functionExpression: "x", iterationExpression: "x", x0: 1 };
  assert.throws(
    () => runFixedPoint({ ...valid, x0: "" }),
    (error) => error instanceof FixedPointError && error.code === "INVALID_NUMBER" && error.field === "x0",
  );
  assert.throws(
    () => runFixedPoint({ ...valid, epsilon1: -1 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon1",
  );
  assert.throws(
    () => runFixedPoint({ ...valid, epsilon2: 0 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon2",
  );
  assert.throws(
    () => runFixedPoint({ ...valid, stopMode: "either" }),
    (error) => error.code === "INVALID_STOP_MODE" && error.field === "stopMode",
  );
  assert.throws(
    () => runFixedPoint({ ...valid, maxIterations: 0 }),
    (error) => error.code === "INVALID_MAX_ITERATIONS" && error.field === "maxIterations",
  );
});

test("identifica separadamente erros em f e g", () => {
  assert.throws(
    () => runFixedPoint({ functionExpression: "sin x", iterationExpression: "x", x0: 1 }),
    (error) => error instanceof MathExpressionError && error.field === "functionExpression",
  );
  assert.throws(
    () => runFixedPoint({ functionExpression: "x", iterationExpression: "sin x", x0: 1 }),
    (error) => error instanceof MathExpressionError && error.field === "iterationExpression",
  );
  assert.throws(
    () => runFixedPoint({ functionExpression: "sqrt(x)", iterationExpression: "x", x0: -1 }),
    (error) =>
      error instanceof FixedPointError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.field === "functionExpression" &&
      error.stage === "function" &&
      error.iteration === 0,
  );
  assert.throws(
    () => runFixedPoint({ functionExpression: "x + 2", iterationExpression: "sqrt(x)", x0: -1 }),
    (error) =>
      error instanceof FixedPointError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.field === "iterationExpression" &&
      error.stage === "iteration" &&
      error.iteration === 0,
  );
});

test("falha de forma tipada quando g gera resultado não finito", () => {
  assert.throws(
    () => runFixedPoint({ functionExpression: "x + 1", iterationExpression: "exp(x)", x0: 1000 }),
    (error) =>
      error instanceof FixedPointError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.field === "iterationExpression" &&
      error.causeCode === "NON_FINITE_RESULT",
  );
});
