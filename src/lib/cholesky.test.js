import test from 'node:test';
import assert from 'node:assert/strict';
import { runCholesky, quadraticForm, parseSquareMatrix } from './cholesky.js';
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);

test('classic Cholesky factor, minors, reconstruction and immutable snapshots', () => {
  const matrix = [[4, 12, -16], [12, 37, -43], [-16, -43, 98]];
  const original = structuredClone(matrix);
  const result = runCholesky({ matrix });
  assert.equal(result.converged, true);
  const expected = [[2, 0, 0], [6, 1, 0], [-8, 5, 3]];
  result.lower.forEach((row, i) => row.forEach((v, j) => close(v, expected[i][j])));
  result.minors.forEach((v, i) => close(v, [4, 4, 36][i]));
  result.product.forEach((row, i) => row.forEach((v, j) => close(v, matrix[i][j])));
  assert.ok(result.residual < 1e-14);
  assert.ok(result.eigenvalues.every((x) => x > 0));
  assert.ok(result.steps[0].lower.flat().every((x) => x === 0));
  assert.equal(result.steps.filter((s) => s.type === 'entry').length, 6);
  assert.deepEqual(matrix, original);
});

test('known spectrum and rejection of indefinite and semidefinite matrices', () => {
  const positive = runCholesky({ matrix: [[2, 1], [1, 2]] });
  positive.eigenvalues.forEach((x, i) => close(x, [1, 3][i]));
  for (const matrix of [[[1, 2], [2, 1]], [[1, 1], [1, 1]], [[0, 0], [0, 0]], [[-2, 0], [0, -1]]]) {
    const result = runCholesky({ matrix });
    assert.equal(result.converged, false);
    assert.ok(!result.steps.some((s) => s.type === 'entry'));
  }
});

test('symmetry is required even when the quadratic form is positive', () => {
  const result = runCholesky({ matrix: [[2, 1], [-1, 2]] });
  assert.equal(result.symmetric, false);
  assert.equal(result.eigenvalues, undefined);
  assert.equal(result.converged, false);
});

test('relative tolerance is scale invariant and near-zero positivity is inconclusive', () => {
  for (const scale of [1e-100, 1, 1e100]) {
    const result = runCholesky({ matrix: [[2 * scale, scale], [scale, 2 * scale]] });
    assert.equal(result.converged, true);
    assert.ok(result.residual < 1e-14);
  }
  assert.equal(runCholesky({ matrix: [[1, 0], [0, 1e-12]] }).converged, false);
  assert.equal(runCholesky({ matrix: [[1, 0], [0, 1e-12]], tolerance: 1e-14 }).converged, true);
});

test('quadratic form returns Av and a counterexample; rejects invalid vectors', () => {
  assert.deepEqual(quadraticForm([[1, 2], [2, 1]], [1, -1]), { av: [-1, 1], value: -2 });
  for (const vector of [[0, 0], [1], [NaN, 1], [Infinity, 1]]) assert.throws(() => quadraticForm([[1, 0], [0, 1]], vector));
});

test('validates matrix and tolerance input and supports decimal commas', () => {
  assert.deepEqual(parseSquareMatrix('2,5 0\n0 1'), [[2.5, 0], [0, 1]]);
  for (const matrix of [[], [[1, 2]], [[1, NaN], [0, 1]]]) assert.throws(() => runCholesky({ matrix }));
  for (const tolerance of [0, -1, Infinity, NaN, 1, 1e-16]) assert.throws(() => runCholesky({ matrix: [[1, 0], [0, 1]], tolerance }));
});

test('reconstructs deterministic positive definite matrices of every supported size', () => {
  for (let n = 2; n <= 6; n++) {
    const g = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j > i ? 0 : i === j ? i + 1 : (i + j) % 3 - 1));
    const matrix = g.map((row) => g.map((other) => row.reduce((s, v, k) => s + v * other[k], 0)));
    const result = runCholesky({ matrix });
    assert.equal(result.converged, true);
    result.lower.forEach((row, i) => row.forEach((v, j) => close(v, g[i][j])));
    close(result.eigenvalues.reduce((s, v) => s + v, 0), matrix.reduce((s, row, i) => s + row[i], 0));
  }
});
