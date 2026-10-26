import test from 'node:test';
import assert from 'node:assert/strict';
import { runStationaryIteration as run, spectralAnalysis, parseVector, parseNumber } from './stationaryIteration.js';
const close = (x, y, eps = 1e-9) => assert.ok(Math.abs(x - y) < eps, `${x} ≈ ${y}`);
const base = { matrix: [[4, 1], [2, 3]], b: [5, 5], initial: [0, 0], tolerance: 1e-10 };

test('Jacobi uses old values; Seidel uses immediately updated values', () => {
  const j = run({ ...base, method: 'jacobi' });
  const s = run({ ...base, method: 'seidel' });
  close(j.steps[1].x[0], 1.25); close(j.steps[1].x[1], 5 / 3);
  close(s.steps[1].x[0], 1.25); close(s.steps[1].x[1], 5 / 6);
  assert.equal(j.steps[1].calculations[1].terms[0].fresh, false);
  assert.equal(s.steps[1].calculations[1].terms[0].fresh, true);
  for (const result of [j, s]) {
    assert.equal(result.converged, true);
    result.steps.at(-1).x.forEach((x) => close(x, 1));
    assert.deepEqual(result.steps[0].x, [0, 0]);
    assert.equal(result.strict, true);
    result.matrix.forEach((row, i) => row.forEach((x, k) => close(x, result.d[i][k] + result.l[i][k] + result.u[i][k])));
  }
  assert.deepEqual(base.initial, [0, 0]);
});

test('iteration matrices and affine updates match both methods', () => {
  for (const method of ['jacobi', 'seidel']) {
    const result = run({ ...base, method });
    if (method === 'jacobi') {
      close(result.t[0][1], -1 / 4); close(result.t[1][0], -2 / 3);
      close(result.spectral.radius, Math.sqrt(1 / 6));
    } else {
      close(result.t[1][0], 0); close(result.t[1][1], 1 / 6);
      close(result.spectral.radius, 1 / 6);
    }
    result.steps.slice(1).forEach((step, k) => step.x.forEach((x, i) => close(x, result.c[i] + result.t[i].reduce((sum, v, j) => sum + v * result.steps[k].x[j], 0))));
  }
});

test('complex spectrum uses modulus and handles nilpotent and boundary matrices', () => {
  const complex = spectralAnalysis([[0, -0.5], [0.5, 0]]);
  close(complex.radius, 0.5);
  assert.ok(complex.values.some((v) => Math.abs(v.imaginary) > 0.4));
  assert.equal(complex.status, 'convergent');
  close(spectralAnalysis([[0, 2, 0], [0, 0, 3], [0, 0, 0]]).radius, 0);
  assert.equal(spectralAnalysis([[0, -1], [1, 0]]).status, 'boundary');
  assert.equal(spectralAnalysis([[0, 0], [0, 0]]).radius, 0);
});

test('strict dominance sufficient; non-dominance can still converge', () => {
  for (const method of ['jacobi', 'seidel']) {
    const result = run({ matrix: [[1, 2], [0.1, 1]], b: [3, 1.1], initial: [0, 0], method });
    assert.equal(result.strict, false);
    assert.equal(result.spectral.status, 'convergent');
    assert.equal(result.converged, true);
  }
});

test('weak dominance does not suffice and methods have different spectral radii', () => {
  for (const method of ['jacobi', 'seidel']) {
    const result = run({ matrix: [[1, 1], [-1, 1]], b: [2, 0], initial: [0, 0], method, maxIterations: 5 });
    assert.equal(result.weak, true); assert.equal(result.strict, false);
    assert.equal(result.spectral.status, 'boundary'); assert.equal(result.converged, false);
  }
  const params = { matrix: [[1, 0.6, 0.6], [0.6, 1, 0.6], [0.6, 0.6, 1]], b: [2.2, 2.2, 2.2], initial: [0, 0, 0] };
  const j = run({ ...params, method: 'jacobi' }), s = run({ ...params, method: 'seidel' });
  close(j.spectral.radius, 1.2); assert.equal(j.converged, false);
  assert.ok(s.spectral.radius < 1); assert.equal(s.converged, true);
});

test('initial solution may satisfy a method without general convergence', () => {
  const result = run({ matrix: [[1, 2], [2, 1]], b: [3, 3], initial: [1, 1] });
  assert.equal(result.converged, true); assert.equal(result.steps.length, 1);
  assert.equal(result.spectral.status, 'not-convergent');
});

test('zero diagonal, iteration limit and numeric overflow do not report success', () => {
  assert.equal(run({ ...base, matrix: [[0, 1], [1, 2]] }).reason, 'zero-diagonal');
  assert.equal(run({ ...base, maxIterations: 1 }).reason, 'limit');
  const overflow = run({ matrix: [[1, 1e200], [1e200, 1]], b: [1, 1], initial: [0, 0] });
  assert.equal(overflow.reason, 'numeric'); assert.equal(overflow.converged, false);
  assert.ok(overflow.steps.every((s) => s.x.every(Number.isFinite)));
});

test('input validation and decimal comma parsing', () => {
  assert.deepEqual(parseVector('1,5; -2e-2', 2), [1.5, -0.02]);
  for (const text of ['', 'Infinity', '0x10', '1abc']) assert.throws(() => parseNumber(text, 'teste'));
  assert.throws(() => parseVector('1', 2));
  for (const patch of [{ tolerance: 0 }, { tolerance: 1 }, { maxIterations: 1.5 }, { maxIterations: 501 }, { b: [1] }, { initial: [NaN, 0] }, { method: 'other' }, { matrix: [[1, 2]] }]) assert.throws(() => run({ ...base, ...patch }));
});

test('all supported sizes converge on strictly dominant systems, independent of row scaling', () => {
  for (let n = 2; n <= 6; n++) for (const method of ['jacobi', 'seidel']) {
    const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? n + 1 : (i + j) % 2 ? -1 : 1) * 10 ** (i * 10 - 20)));
    const b = matrix.map((row) => row.reduce((s, v) => s + v, 0));
    const result = run({ matrix, b, initial: Array(n).fill(0), method, tolerance: 1e-10 });
    assert.equal(result.converged, true);
    result.steps.at(-1).x.forEach((x) => close(x, 1));
  }
});
