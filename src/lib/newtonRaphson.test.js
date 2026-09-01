import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError } from "./mathExpression.js";
import { NewtonRaphsonError, runNewtonRaphson } from "./newtonRaphson.js";

const PRECISE = {
  epsilon1: 1e-12,
  epsilon2: 1e-12,
  stopMode: "all",
};

test("começa em 0, converge para sqrt(2) e registra a tangente que levou a cada linha", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    ...PRECISE,
    maxIterations: 30,
  });

  assert.equal(result.converged, true);
  assert.ok(["exact-root", "both-criteria"].includes(result.reason));
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-12);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations[0].x, 1);
  assert.equal(result.iterations[0].previousX, null);
  assert.equal(result.iterations[0].delta, null);
  assert.equal(result.iterations[0].criterion1Met, null);
  assert.equal(result.iterations[0].stop, false);
  assert.ok(Math.abs(result.iterations[1].x - 1.5) < 1e-10);
  assert.equal(result.iterations[1].previousX, result.iterations[0].x);
  assert.equal(result.iterations.at(-1).stop, true);
});

test("máximo N representa N atualizações além da linha inicial", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: 1e-30,
    epsilon2: 1e-30,
    maxIterations: 2,
  });

  assert.equal(result.reason, "max-iterations");
  assert.deepEqual(result.iterations.map((row) => row.iteration), [0, 1, 2]);
  assert.equal(result.iterations.at(-1).stop, false);
});

test("modo OU pode parar com apenas a variação, enquanto E exige os dois critérios", () => {
  const common = {
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: 1,
    epsilon2: 0.1,
    maxIterations: 1,
  };
  const any = runNewtonRaphson({ ...common, stopMode: "any" });
  const all = runNewtonRaphson({ ...common, stopMode: "all" });

  assert.equal(any.reason, "step-tolerance");
  assert.equal(any.iterations[1].criterion1Met, true);
  assert.equal(any.iterations[1].criterion2Met, false);
  assert.equal(any.iterations[1].stop, true);
  assert.equal(all.reason, "max-iterations");
  assert.equal(all.iterations[1].stop, false);
});

test("na linha 0, OU pode usar o resíduo; E aguarda x1; raiz exata sempre encerra", () => {
  const any = runNewtonRaphson({
    expression: "x - 1",
    x0: 0.5,
    epsilon1: 1e-6,
    epsilon2: 1,
    stopMode: "any",
  });
  const all = runNewtonRaphson({
    expression: "x - 1",
    x0: 0.5,
    epsilon1: 1e-6,
    epsilon2: 1,
    stopMode: "all",
  });
  const exact = runNewtonRaphson({
    expression: "x^2 - 4",
    x0: 2,
    epsilon1: 1e-30,
    epsilon2: 1e-30,
    stopMode: "all",
  });

  assert.equal(any.reason, "residual-tolerance");
  assert.equal(any.iterations.length, 1);
  assert.equal(any.iterations[0].stop, true);
  assert.ok(all.iterations.length >= 2);
  assert.equal(exact.reason, "exact-root");
  assert.equal(exact.iterations.length, 1);
  assert.equal(exact.iterations[0].stop, true);
});

test("comparações com epsilon são estritas", () => {
  const baseline = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: 1e-30,
    epsilon2: 1e-30,
    maxIterations: 1,
  });
  const { delta, residual } = baseline.iterations[1];
  const deltaEqual = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: delta,
    epsilon2: residual / 2,
    stopMode: "any",
    maxIterations: 1,
  });
  const residualEqual = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: delta / 2,
    epsilon2: residual,
    stopMode: "any",
    maxIterations: 1,
  });

  assert.equal(deltaEqual.iterations[1].criterion1Met, false);
  assert.equal(deltaEqual.iterations[1].stop, false);
  assert.equal(residualEqual.iterations[1].criterion2Met, false);
  assert.equal(residualEqual.iterations[1].stop, false);
});

test("não confunde passo pequeno com convergência no modo E", () => {
  const result = runNewtonRaphson({
    expression: "atan(1e12*x) + 1",
    x0: 0,
    epsilon1: 1e-3,
    epsilon2: 1e-9,
    stopMode: "all",
    maxIterations: 1,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.equal(result.iterations[1].criterion1Met, true);
  assert.equal(result.iterations[1].criterion2Met, false);
  assert.equal(result.iterations[1].stop, false);
});

test("detecta derivada zero sem inventar uma atualização", () => {
  const result = runNewtonRaphson({ expression: "x^3 - 1", x0: 0 });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "zero-derivative");
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations[0].derivativeEstimate, null);
  assert.equal(result.failure.derivativeEstimate, 0);
  assert.equal(result.iterations[0].stop, false);
});

test("detecta ciclo e mantém Stop? como não", () => {
  const result = runNewtonRaphson({
    expression: "x^3 - 2*x + 2",
    x0: 0,
    ...PRECISE,
    maxIterations: 30,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "cycle");
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations.at(-1).stop, false);
});

test("não classifica uma aproximação monotônica com passo pequeno como ciclo", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: 1e-6,
    epsilon2: 1e-30,
    stopMode: "all",
    maxIterations: 30,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "machine-precision");
  assert.equal(result.iterations.at(-1).stop, false);
});

test("detecta crescimento persistente como divergência", () => {
  const result = runNewtonRaphson({
    expression: "cbrt(x)",
    x0: 1,
    epsilon1: 1e-30,
    epsilon2: 1e-30,
    stopMode: "all",
    maxIterations: 30,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "divergence");
  assert.equal(result.iterations[0].iteration, 0);
  assert.equal(result.iterations.at(-1).stop, false);
});

test("aceita números textuais, vírgula decimal e expõe o contrato dos critérios", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: "1,5",
    epsilon1: "0,00000001",
    epsilon2: "0,000000001",
    stopMode: "any",
    maxIterations: "20",
  });

  assert.equal(result.initialX, 1.5);
  assert.equal(result.epsilon1, 1e-8);
  assert.equal(result.epsilon2, 1e-9);
  assert.equal(result.stopMode, "any");
  assert.equal(result.maxIterations, 20);
  assert.equal(result.converged, true);
});

test("valida aproximação, precisões, modo e limite de iterações", () => {
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: "" }),
    (error) => error instanceof NewtonRaphsonError && error.code === "INVALID_NUMBER" && error.field === "x0",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: 1, epsilon1: 0 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon1",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: 1, epsilon2: 0 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon2",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: 1, stopMode: "either" }),
    (error) => error.code === "INVALID_STOP_MODE" && error.field === "stopMode",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: 1, maxIterations: 1.5 }),
    (error) => error.code === "INVALID_MAX_ITERATIONS" && error.field === "maxIterations",
  );
});

test("associa erros de sintaxe e domínio ao campo da função", () => {
  assert.throws(
    () => runNewtonRaphson({ expression: "2x", x0: 1 }),
    (error) => error instanceof MathExpressionError && error.field === "expression",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "sqrt(x)", x0: -1 }),
    (error) => (
      error instanceof NewtonRaphsonError
      && error.code === "FUNCTION_EVALUATION_ERROR"
      && error.field === "expression"
      && error.stage === "function"
    ),
  );
});

test("preserva a linha e a tangente quando o próximo ponto sai do domínio", () => {
  const result = runNewtonRaphson({
    expression: "sqrt(x) - 2",
    x0: 100,
    maxIterations: 10,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "function-unavailable");
  assert.equal(result.iterations.length, 2);
  assert.equal(result.iterations[1].iteration, 1);
  assert.ok(result.iterations[1].x < 0);
  assert.equal(result.iterations[1].functionValue, null);
  assert.equal(result.iterations[1].criterion2Met, null);
  assert.equal(result.iterations[1].stop, false);
  assert.equal(result.failure.iteration, 1);
});

test("mantém a derivada utilizável com escala pequena e grande deslocamento vertical", () => {
  const scaled = runNewtonRaphson({
    expression: "1e-10*(x - 1)",
    x0: 0,
    epsilon1: 1e-15,
    epsilon2: 1e-15,
    maxIterations: 10,
  });
  const shifted = runNewtonRaphson({
    expression: "x - 1e12",
    x0: 0,
    epsilon1: 1e-9,
    epsilon2: 1e-9,
    maxIterations: 10,
  });

  assert.equal(scaled.converged, true);
  assert.ok(Math.abs(scaled.root - 1) < 1e-10);
  assert.equal(shifted.converged, true);
  assert.equal(shifted.root, 1e12);
});

test("distingue precisão da máquina de convergência sob precisões estritas", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    epsilon1: 1e-30,
    epsilon2: 1e-30,
    maxIterations: 30,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "machine-precision");
  assert.equal(result.iterations.at(-1).stop, false);
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-14);
});

test("aceita uma raiz finita de grande magnitude", () => {
  const result = runNewtonRaphson({
    expression: "x - 1e101",
    x0: 9.9999999999e100,
    epsilon1: 1e-12,
    epsilon2: 1e-12,
    maxIterations: 10,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.root, 1e101);
});
