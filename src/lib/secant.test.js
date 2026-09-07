import assert from "node:assert/strict";
import test from "node:test";
import { SecantError, runSecant } from "./secant.js";

const PRECISE = {
  epsilon1: 1e-12,
  epsilon2: 1e-12,
  stopMode: "all",
};

test("converge para sqrt(2) e registra a secante usada em cada atualização", () => {
  const result = runSecant({
    expression: "x^2 - 2",
    x0: 1,
    x1: 2,
    ...PRECISE,
    maxIterations: 30,
  });

  assert.equal(result.converged, true);
  assert.ok(["exact-root", "both-criteria"].includes(result.reason));
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-12);
  assert.deepEqual(result.iterations.slice(0, 3).map((row) => row.iteration), [0, 1, 2]);
  assert.equal(result.iterations[0].previousX, 1);
  assert.equal(result.iterations[0].x, 2);
  assert.equal(result.iterations[1].previousX, 1);
  assert.equal(result.iterations[1].currentBeforeStep, 2);
  assert.ok(Math.abs(result.iterations[1].x - 4 / 3) < 1e-12);
  assert.equal(result.iterations.at(-1).stop, true);
});

test("máximo N representa N atualizações além da linha inicial", () => {
  const result = runSecant({
    expression: "x^2 - 2",
    x0: 1,
    x1: 2,
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
    x1: 2,
    epsilon1: 1,
    epsilon2: 0.1,
    maxIterations: 1,
  };
  const any = runSecant({ ...common, stopMode: "any" });
  const all = runSecant({ ...common, stopMode: "all" });

  assert.equal(any.reason, "step-tolerance");
  assert.equal(any.iterations[1].criterion1Met, true);
  assert.equal(any.iterations[1].criterion2Met, false);
  assert.equal(any.iterations[1].stop, true);
  assert.equal(all.reason, "max-iterations");
  assert.equal(all.iterations[1].stop, false);
});

test("raiz exata em x1 encerra na linha 0", () => {
  const result = runSecant({
    expression: "x^2 - 4",
    x0: 1,
    x1: 2,
    ...PRECISE,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].stop, true);
});

test("detecta secante horizontal sem inventar uma atualização", () => {
  const result = runSecant({
    expression: "x^2 + 1",
    x0: -1,
    x1: 1,
    ...PRECISE,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "zero-slope");
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].stop, false);
});

test("aceita números textuais, vírgula decimal e valida entradas", () => {
  const result = runSecant({
    expression: "x^2 - 2",
    x0: "1",
    x1: "1,5",
    epsilon1: "0,00000001",
    epsilon2: "0,000000001",
    stopMode: "any",
    maxIterations: "20",
  });

  assert.equal(result.initialX0, 1);
  assert.equal(result.initialX1, 1.5);
  assert.equal(result.epsilon1, 1e-8);
  assert.equal(result.epsilon2, 1e-9);
  assert.equal(result.stopMode, "any");
  assert.equal(result.maxIterations, 20);
  assert.equal(result.converged, true);

  assert.throws(
    () => runSecant({ expression: "x", x0: 1, x1: 1 }),
    (error) => error instanceof SecantError && error.code === "EQUAL_INITIAL_GUESSES" && error.field === "x1",
  );
  assert.throws(
    () => runSecant({ expression: "x", x0: "", x1: 2 }),
    (error) => error.code === "INVALID_NUMBER" && error.field === "x0",
  );
  assert.throws(
    () => runSecant({ expression: "x", x0: 1, x1: 2, epsilon1: 0 }),
    (error) => error.code === "INVALID_EPSILON" && error.field === "epsilon1",
  );
  assert.throws(
    () => runSecant({ expression: "x", x0: 1, x1: 2, stopMode: "either" }),
    (error) => error.code === "INVALID_STOP_MODE" && error.field === "stopMode",
  );
});
