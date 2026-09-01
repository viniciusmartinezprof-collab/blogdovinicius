import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError } from "./mathExpression.js";
import { NewtonRaphsonError, runNewtonRaphson } from "./newtonRaphson.js";

test("converge quadraticamente para sqrt(2) e registra a geometria das tangentes", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    tolerance: 1e-12,
    maxIterations: 30,
  });

  assert.equal(result.converged, true);
  assert.ok(["exact-root", "function-value"].includes(result.reason));
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-12);
  assert.ok(Math.abs(result.fRoot) <= 1e-12);
  assert.deepEqual(Object.keys(result.iterations[0]), [
    "iteration",
    "xCurrent",
    "fCurrent",
    "derivativeEstimate",
    "correction",
    "xNext",
    "fNext",
    "stepError",
  ]);
  assert.ok(Math.abs(result.iterations[0].xNext - 1.5) < 1e-10);
  assert.ok(result.iterations.length <= 6);
});

test("aceita números textuais e vírgula decimal", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: "1,5",
    tolerance: "0,00000001",
    maxIterations: "20",
  });

  assert.equal(result.initialX, 1.5);
  assert.equal(result.tolerance, 1e-8);
  assert.equal(result.maxIterations, 20);
  assert.equal(result.converged, true);
});

test("reconhece uma raiz no chute inicial sem construir tangente", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 4",
    x0: 2,
  });

  assert.equal(result.root, 2);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.iterations.length, 0);
});

test("encerra de forma explicativa quando a derivada é zero", () => {
  const result = runNewtonRaphson({
    expression: "x^3 - 1",
    x0: 0,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "zero-derivative");
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].derivativeEstimate, 0);
  assert.equal(result.iterations[0].xNext, null);
});

test("detecta um ciclo exato em vez de esperar o limite", () => {
  const result = runNewtonRaphson({
    expression: "x^3 - 2*x + 2",
    x0: 0,
    tolerance: 1e-12,
    maxIterations: 30,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "cycle");
  assert.ok(Math.abs(result.root) < 1e-8);
  assert.equal(result.iterations.length, 2);
});

test("não confunde passo minúsculo e resíduo grande com convergência", () => {
  const result = runNewtonRaphson({
    expression: "atan(1e12*x) + 1",
    x0: 0,
    tolerance: 1e-3,
    maxIterations: 1,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.ok(Math.abs(result.fRoot) > 0.1);
  assert.ok(result.iterations[0].stepError < 1e-3);
});

test("valida aproximação, tolerância e limite de iterações", () => {
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: "" }),
    (error) => error instanceof NewtonRaphsonError && error.code === "INVALID_NUMBER" && error.field === "x0",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: 1, tolerance: 0 }),
    (error) => error.code === "INVALID_TOLERANCE" && error.field === "tolerance",
  );
  assert.throws(
    () => runNewtonRaphson({ expression: "x", x0: 1, maxIterations: 1.5 }),
    (error) => error.code === "INVALID_MAX_ITERATIONS" && error.field === "maxIterations",
  );
});

test("associa erros de sintaxe ao campo da função", () => {
  assert.throws(
    () => runNewtonRaphson({ expression: "2x", x0: 1 }),
    (error) => error instanceof MathExpressionError && error.field === "expression",
  );
});

test("tipa avaliações fora do domínio da função", () => {
  assert.throws(
    () => runNewtonRaphson({ expression: "sqrt(x)", x0: -1 }),
    (error) =>
      error instanceof NewtonRaphsonError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.field === "expression" &&
      error.stage === "function",
  );
});

test("preserva a tangente quando o próximo ponto sai do domínio", () => {
  const result = runNewtonRaphson({
    expression: "sqrt(x) - 2",
    x0: 100,
    maxIterations: 10,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "function-unavailable");
  assert.equal(result.iterations.length, 1);
  assert.ok(result.root < 0);
  assert.equal(result.fRoot, null);
  assert.equal(result.iterations[0].fNext, null);
  assert.equal(result.failure.iteration, 1);
  assert.equal(result.failure.causeCode, "NON_FINITE_RESULT");
});

test("encerra quando a derivada numérica é efetivamente nula", () => {
  const result = runNewtonRaphson({
    expression: "1",
    x0: 0,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "zero-derivative");
  assert.equal(result.iterations.length, 1);
});

test("mantém o passo de Newton quando a função é reescalada", () => {
  const result = runNewtonRaphson({
    expression: "1e-10*(x - 1)",
    x0: 0,
    tolerance: 1e-15,
    maxIterations: 10,
  });

  assert.equal(result.converged, true);
  assert.ok(Math.abs(result.root - 1) < 1e-10);
  assert.ok(Math.abs(result.iterations[0].derivativeEstimate - 1e-10) < 1e-20);
});

test("distingue precisão da máquina de um ciclo sob tolerância estrita", () => {
  const result = runNewtonRaphson({
    expression: "x^2 - 2",
    x0: 1,
    tolerance: 1e-30,
    maxIterations: 30,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "machine-precision");
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-14);
});

test("aceita uma raiz finita de grande magnitude", () => {
  const result = runNewtonRaphson({
    expression: "x - 1e101",
    x0: 9.9999999999e100,
    tolerance: 1e-12,
    maxIterations: 10,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "exact-root");
  assert.equal(result.root, 1e101);
});
