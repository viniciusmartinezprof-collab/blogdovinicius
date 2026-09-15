import assert from "node:assert/strict";
import test from "node:test";
import {
  GaussianEliminationError,
  parseAugmentedMatrix,
  runGaussianElimination,
} from "./gaussianElimination.js";

test("resolve sistema 3x3 e registra etapas de eliminação e substituição", () => {
  const result = runGaussianElimination({
    matrix: [
      [2, 1, -1, 8],
      [-3, -1, 2, -11],
      [-2, 1, 2, -3],
    ],
    tolerance: 1e-12,
  });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "unique-solution");
  assert.deepEqual(result.solution.map((value) => Math.round(value)), [2, 3, -1]);
  assert.equal(result.steps[0].type, "initial");
  assert.ok(result.steps.some((step) => step.type === "eliminate"));
  assert.equal(result.steps.filter((step) => step.type === "back-substitution").length, 3);
});

test("usa pivoteamento parcial quando o primeiro pivô é ruim", () => {
  const result = runGaussianElimination({
    matrix: [
      [0, 2, 9],
      [1, -1, 1],
    ],
  });

  assert.equal(result.converged, true);
  assert.deepEqual(result.solution, [5.5, 4.5]);
  assert.ok(result.steps.some((step) => step.type === "swap"));
});

test("resolve sem pivoteamento quando os pivôs diagonais são válidos", () => {
  const result = runGaussianElimination({
    matrix: [
      [2, 1, 5],
      [4, 5, 13],
    ],
    pivoting: false,
  });

  assert.equal(result.converged, true);
  assert.equal(result.pivoting, false);
  assert.deepEqual(result.solution, [2, 1]);
  assert.ok(!result.steps.some((step) => step.type === "swap"));
});

test("sem pivoteamento interrompe quando o pivô diagonal é nulo", () => {
  const result = runGaussianElimination({
    matrix: [
      [0, 2, 9],
      [1, -1, 1],
    ],
    pivoting: false,
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "singular");
  assert.equal(result.pivoting, false);
  assert.equal(result.solution, null);
});

test("detecta matriz singular", () => {
  const result = runGaussianElimination({
    matrix: [
      [1, 2, 3],
      [2, 4, 6],
    ],
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "singular");
  assert.equal(result.solution, null);
});

test("interpreta matriz aumentada escrita em texto", () => {
  assert.deepEqual(
    parseAugmentedMatrix("2 1 -1 | 8\n-3 -1 2 | -11\n-2 1 2 | -3"),
    [
      [2, 1, -1, 8],
      [-3, -1, 2, -11],
      [-2, 1, 2, -3],
    ],
  );
});

test("rejeita formatos que não formam matriz aumentada quadrada", () => {
  assert.throws(
    () => parseAugmentedMatrix("1 2 3\n4 5 6\n7 8 9"),
    (error) => error instanceof GaussianEliminationError && error.code === "INVALID_MATRIX_SHAPE",
  );

  assert.throws(
    () => runGaussianElimination({ matrix: [[1, 2]] }),
    (error) => error.code === "INVALID_MATRIX",
  );
});
