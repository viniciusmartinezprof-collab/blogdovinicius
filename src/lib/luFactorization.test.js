import assert from "node:assert/strict";
import test from "node:test";
import {
  LUFactorizationError,
  parseSquareMatrix,
  runLUFactorization,
} from "./luFactorization.js";

function multiply(first, second) {
  return first.map((row) =>
    second[0].map((_, columnIndex) =>
      row.reduce((sum, value, index) => sum + value * second[index][columnIndex], 0),
    ),
  );
}

function assertMatrixAlmostEqual(actual, expected, tolerance = 1e-9) {
  assert.equal(actual.length, expected.length);
  actual.forEach((row, rowIndex) => {
    assert.equal(row.length, expected[rowIndex].length);
    row.forEach((value, columnIndex) => {
      assert.ok(
        Math.abs(value - expected[rowIndex][columnIndex]) <= tolerance,
        `linha ${rowIndex + 1}, coluna ${columnIndex + 1}: ${value} ≠ ${expected[rowIndex][columnIndex]}`,
      );
    });
  });
}

test("fatora matriz 3x3 e satisfaz PA = LU", () => {
  const matrix = [
    [2, 1, 1],
    [4, -6, 0],
    [-2, 7, 2],
  ];

  const result = runLUFactorization({ matrix, tolerance: 1e-12 });

  assert.equal(result.converged, true);
  assert.equal(result.reason, "factorized");
  assertMatrixAlmostEqual(
    multiply(result.permutation, matrix),
    multiply(result.lower, result.upper),
  );
  assert.ok(result.steps.some((step) => step.type === "eliminate"));
});

test("registra troca quando o pivoteamento parcial é necessário", () => {
  const matrix = [
    [0, 2],
    [3, 4],
  ];

  const result = runLUFactorization({ matrix });

  assert.equal(result.converged, true);
  assert.ok(result.steps.some((step) => step.type === "swap"));
  assertMatrixAlmostEqual(
    multiply(result.permutation, matrix),
    multiply(result.lower, result.upper),
  );
});

test("detecta matriz singular", () => {
  const result = runLUFactorization({
    matrix: [
      [1, 2],
      [2, 4],
    ],
  });

  assert.equal(result.converged, false);
  assert.equal(result.reason, "singular");
});

test("interpreta matriz quadrada escrita em texto", () => {
  assert.deepEqual(
    parseSquareMatrix("4 3\n6 3"),
    [
      [4, 3],
      [6, 3],
    ],
  );
});

test("rejeita formato não quadrado e tolerância inválida", () => {
  assert.throws(
    () => parseSquareMatrix("1 2 3\n4 5 6"),
    (error) => error instanceof LUFactorizationError && error.code === "INVALID_MATRIX_SHAPE",
  );

  assert.throws(
    () => runLUFactorization({ matrix: [[1, 2], [3, 4]], tolerance: 0 }),
    (error) => error.code === "INVALID_TOLERANCE",
  );
});
