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
  assert.equal(result.iterations.length, 21);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations.at(-1).iteration, 20);
  assert.equal(result.iterations.at(-1).stop, true);
  assert.equal(result.iterations.at(-1).widthCriterionMet, true);
  assert.ok(result.iterations.at(-1).intervalWidth < result.tolerance);
  assert.ok(Math.abs(result.root - Math.SQRT2) <= result.iterations.at(-1).intervalWidth / 2);
  assert.deepEqual(
    {
      a: result.iterations[0].a,
      b: result.iterations[0].b,
      m: result.iterations[0].midpoint,
      signFA: result.iterations[0].signFA,
      signFB: result.iterations[0].signFB,
      signFMidpoint: result.iterations[0].signFMidpoint,
      width: result.iterations[0].intervalWidth,
      stop: result.iterations[0].stop,
    },
    { a: 1, b: 2, m: 1.5, signFA: -1, signFB: 1, signFMidpoint: 1, width: 1, stop: false },
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
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations[0].signFMidpoint, 0);
  assert.equal(result.iterations[0].stop, true);
});

test("reconhece raiz em um extremo e registra a iteração zero", () => {
  const result = runBisection({ expression: "x^2 - 4", a: 2, b: 5, tolerance: 1e-6 });
  assert.equal(result.root, 2);
  assert.equal(result.reason, "endpoint-root");
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations[0].a, 2);
  assert.equal(result.iterations[0].b, 5);
  assert.equal(result.iterations[0].midpoint, 3.5);
  assert.equal(result.iterations[0].signFA, 0);
  assert.equal(result.iterations[0].stop, true);
});

test("máximo N permite N atualizações e produz as linhas de zero até N", () => {
  const result = runBisection({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    tolerance: 1e-15,
    maxIterations: 1,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.deepEqual(result.iterations.map((step) => step.iteration), [0, 1]);
  assert.deepEqual(
    result.iterations.map((step) => [step.a, step.b]),
    [[1, 2], [1, 1.5]],
  );
  assert.equal(result.iterations.at(-1).stop, false);
  assert.equal(result.finalA, result.iterations.at(-1).a);
  assert.equal(result.finalB, result.iterations.at(-1).b);
});

test("usa comparação estrita b-a < epsilon sobre o intervalo da própria linha", () => {
  const result = runBisection({
    expression: "x - 0.25",
    a: 0,
    b: 2,
    tolerance: 2,
    maxIterations: 1,
  });

  assert.equal(result.iterations[0].intervalWidth, result.tolerance);
  assert.equal(result.iterations[0].widthCriterionMet, false);
  assert.equal(result.iterations[0].stop, false);
  assert.equal(result.iterations[1].intervalWidth, 1);
  assert.equal(result.iterations[1].widthCriterionMet, true);
  assert.equal(result.iterations[1].stop, true);
  assert.equal(result.reason, "tolerance");
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
    (error) => error.code === "FUNCTION_EVALUATION_ERROR" && error.iteration === 0 && error.x === 0,
  );
});

test("raiz em extremo prevalece mesmo se o ponto médio estiver fora do domínio", () => {
  const result = runBisection({ expression: "x/(x-1)", a: 0, b: 2 });

  assert.equal(result.reason, "endpoint-root");
  assert.equal(result.root, 0);
  assert.equal(result.iterations[0].midpoint, 1);
  assert.equal(result.iterations[0].fMidpoint, null);
  assert.equal(result.iterations[0].signFMidpoint, null);
  assert.equal(result.iterations[0].stop, true);
});

test("falha por precisão da máquina mantém Stop? igual a não", () => {
  const result = runBisection({
    expression: "x^2 - 1.0000000000000002",
    a: 1,
    b: 1 + Number.EPSILON,
    tolerance: 1e-30,
    maxIterations: 5,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "machine-precision");
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations[0].stop, false);
  assert.equal(result.iterations[0].intervalCriterionMet, false);
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
