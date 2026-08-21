import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError } from "./mathExpression.js";
import { FixedPointError, runFixedPoint } from "./fixedPoint.js";

test("converge para o ponto fixo de cos(x) e registra cada passo", () => {
  const result = runFixedPoint({
    expression: "cos(x)",
    x0: 1,
    tolerance: 1e-10,
    maxIterations: 200,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "step-size");
  assert.ok(Math.abs(result.root - 0.7390851332151607) < 1e-9);
  assert.ok(Math.abs(result.residual) < 1e-9);
  assert.deepEqual(Object.keys(result.iterations[0]), [
    "iteration",
    "xCurrent",
    "xNext",
    "stepError",
    "residual",
    "derivativeEstimate",
  ]);
  assert.ok(Math.abs(result.iterations.at(-1).derivativeEstimate + 0.673612) < 1e-4);
});

test("encontra uma raiz conhecida pela iteração de Newton escrita como g", () => {
  const result = runFixedPoint({
    expression: "(x + 2/x)/2",
    x0: "1",
    tolerance: "0,000000000001",
    maxIterations: "30",
  });

  assert.equal(result.converged, true);
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-12);
  assert.equal(result.initialX, 1);
  assert.equal(result.tolerance, 1e-12);
  assert.equal(result.maxIterations, 30);
});

test("reconhece ponto fixo exato pelo próximo ponto e pelo passo nulo", () => {
  const reached = runFixedPoint({ expression: "1", x0: 0 });
  assert.equal(reached.root, 1);
  assert.equal(reached.residual, 0);
  assert.equal(reached.reason, "exact-fixed-point");
  assert.equal(reached.iterations.length, 1);

  const initial = runFixedPoint({ expression: "x", x0: 42 });
  assert.equal(initial.root, 42);
  assert.equal(initial.reason, "exact-fixed-point");
});

test("detecta divergência persistente", () => {
  const result = runFixedPoint({
    expression: "2*x",
    x0: 1,
    tolerance: 1e-12,
    maxIterations: 100,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "divergence");
  assert.ok(result.iterations.length < 100);
  assert.ok(Math.abs(result.iterations.at(-1).derivativeEstimate - 2) < 1e-8);
});

test("distingue oscilação do limite máximo de divergência crescente", () => {
  const result = runFixedPoint({
    expression: "-x",
    x0: 1,
    tolerance: 1e-12,
    maxIterations: 5,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "max-iterations");
  assert.equal(result.iterations.length, 5);
  assert.equal(result.root, -1);
  assert.equal(result.residual, 2);
});

test("valida aproximação, tolerância e limite de iterações", () => {
  assert.throws(
    () => runFixedPoint({ expression: "x", x0: "" }),
    (error) => error instanceof FixedPointError && error.code === "INVALID_NUMBER" && error.field === "x0",
  );
  assert.throws(
    () => runFixedPoint({ expression: "x", x0: 1, tolerance: -1 }),
    (error) => error.code === "INVALID_TOLERANCE" && error.field === "tolerance",
  );
  assert.throws(
    () => runFixedPoint({ expression: "x", x0: 1, maxIterations: 0 }),
    (error) => error.code === "INVALID_MAX_ITERATIONS" && error.field === "maxIterations",
  );
});

test("propaga erro da expressão e tipa avaliações fora do domínio", () => {
  assert.throws(
    () => runFixedPoint({ expression: "sin x", x0: 1 }),
    (error) => error instanceof MathExpressionError && error.field === "expression",
  );
  assert.throws(
    () => runFixedPoint({ expression: "sqrt(x)", x0: -1 }),
    (error) =>
      error instanceof FixedPointError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.field === "expression" &&
      error.stage === "iterate" &&
      error.iteration === 1,
  );
  assert.throws(
    () => runFixedPoint({ expression: "x^0.5 - 2", x0: 1 }),
    (error) => error.code === "FUNCTION_EVALUATION_ERROR" && error.stage === "residual",
  );
});

test("falha de forma tipada quando a função gera resultado não finito", () => {
  assert.throws(
    () => runFixedPoint({ expression: "exp(x)", x0: 1000 }),
    (error) =>
      error instanceof FixedPointError &&
      error.code === "FUNCTION_EVALUATION_ERROR" &&
      error.causeCode === "NON_FINITE_RESULT",
  );
});

test("não aceita passo pequeno quando o resíduo do ponto fixo é grande", () => {
  const result = runFixedPoint({
    expression: "100000000*x + 0.0000001",
    x0: 0,
    tolerance: 1e-6,
    maxIterations: 20,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "divergence");
  assert.ok(Math.abs(result.residual) > 1);
  assert.ok(result.iterations.length > 1);
});
