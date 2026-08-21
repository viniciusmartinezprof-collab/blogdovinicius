import assert from "node:assert/strict";
import test from "node:test";
import { BisectionError, runBisection } from "./bisection.js";

test("converge para sqrt(2) e registra os dados de cada iteração", () => {
  const result = runBisection({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    tolerance: 1e-6,
    maxIterations: 100,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "tolerance");
  assert.equal(result.iterations.length, 20);
  assert.ok(Math.abs(result.root - Math.SQRT2) <= result.tolerance);
  assert.deepEqual(
    Object.keys(result.iterations[0]).filter((key) => ["midpoint", "fMidpoint", "errorEstimate"].includes(key)),
    ["midpoint", "fMidpoint", "errorEstimate"],
  );
  assert.equal(result.evaluate(result.root), result.fRoot);
});

test("aceita campos numéricos como texto e vírgula decimal", () => {
  const result = runBisection({
    expression: "x^2 - 2",
    a: "1",
    b: "2",
    tolerance: "0,001",
    maxIterations: "30",
  });

  assert.equal(result.tolerance, 0.001);
  assert.equal(result.maxIterations, 30);
  assert.equal(result.converged, true);
});

test("reconhece raiz exata no ponto médio", () => {
  const result = runBisection({ expression: "x - 1", a: 0, b: 2, tolerance: 1e-12 });
  assert.equal(result.root, 1);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.iterations.length, 1);
});

test("reconhece raiz em um extremo sem fabricar iterações", () => {
  const result = runBisection({ expression: "x^2 - 4", a: 2, b: 5, tolerance: 1e-6 });
  assert.equal(result.root, 2);
  assert.equal(result.reason, "endpoint-root");
  assert.equal(result.iterations.length, 0);
});

test("para de forma explícita ao atingir o limite de iterações", () => {
  const result = runBisection({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    tolerance: 1e-15,
    maxIterations: 1,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.equal(result.iterations.length, 1);
});

test("rejeita intervalo sem troca de sinal sem multiplicar f(a) por f(b)", () => {
  assert.throws(
    () => runBisection({ expression: "x^2 + 1", a: -1, b: 1 }),
    (error) => error instanceof BisectionError && error.code === "NO_SIGN_CHANGE",
  );
});

test("rejeita intervalo invertido e controles inválidos", () => {
  assert.throws(
    () => runBisection({ expression: "x", a: 2, b: 1 }),
    (error) => error.code === "INVALID_INTERVAL",
  );
  assert.throws(
    () => runBisection({ expression: "x", a: -1, b: 1, tolerance: 0 }),
    (error) => error.code === "INVALID_TOLERANCE",
  );
  assert.throws(
    () => runBisection({ expression: "x", a: -1, b: 1, maxIterations: 1.5 }),
    (error) => error.code === "INVALID_MAX_ITERATIONS",
  );
  assert.throws(
    () => runBisection({ expression: "x", a: "", b: 1 }),
    (error) => error.code === "INVALID_NUMBER",
  );
});

test("informa erro quando a função falha em extremo ou ponto médio", () => {
  assert.throws(
    () => runBisection({ expression: "sqrt(x) - 1", a: -1, b: 2 }),
    (error) => error.code === "FUNCTION_EVALUATION_ERROR" && error.x === -1,
  );
  assert.throws(
    () => runBisection({ expression: "1/x", a: -1, b: 1 }),
    (error) => error.code === "FUNCTION_EVALUATION_ERROR" && error.iteration === 1 && error.x === 0,
  );
});

test("trata extremos muito grandes sem overflow na comparação de sinais", () => {
  const result = runBisection({
    expression: "x",
    a: -1e300,
    b: 1e300,
    tolerance: 1,
    maxIterations: 2,
  });

  assert.equal(result.root, 0);
  assert.equal(result.reason, "exact-root");
});
