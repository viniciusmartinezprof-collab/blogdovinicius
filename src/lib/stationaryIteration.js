import { EigenvalueDecomposition, Matrix } from 'ml-matrix';
import { parseSquareMatrix } from './luFactorization.js';
export { parseSquareMatrix };
export const formatNumber = (x) => x === null ? '—' : Number.isFinite(x) ? Number(x.toPrecision(7)).toString() : 'Fora da faixa numérica';
const norm = (v) => Math.max(...v.map(Math.abs));

export function parseNumber(text, label) {
  const value = String(text).trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value.replace(',', '.')))) throw new Error(`Informe um número finito para ${label}.`);
  return Number(value.replace(',', '.'));
}
export function parseVector(text, n, label = 'o vetor') {
  const values = String(text).trim().split(/[\s;|]+/).map((x) => parseNumber(x, label));
  if (values.length !== n) throw new Error(`${label} deve ter ${n} componentes.`);
  return values;
}

export function spectralAnalysis(t) {
  const scale = norm(t.flat());
  if (!Number.isFinite(scale)) return { status: 'unknown', values: [], radius: null };
  if (scale === 0) return { status: 'convergent', radius: 0, values: t.map(() => ({ real: 0, imaginary: 0, modulus: 0 })) };
  try {
    const evd = new EigenvalueDecomposition(new Matrix(t.map((row) => row.map((x) => x / scale))));
    const values = evd.realEigenvalues.map((x, i) => {
      const real = x * scale, imaginary = evd.imaginaryEigenvalues[i] * scale;
      return { real, imaginary, modulus: Math.hypot(real, imaginary) };
    });
    const radius = Math.max(...values.map((x) => x.modulus));
    if (!Number.isFinite(radius)) throw new Error('Nonfinite spectrum');
    return { values, radius, status: Math.abs(radius - 1) <= 1e-8 ? 'boundary' : radius < 1 ? 'convergent' : 'not-convergent' };
  } catch {
    return { status: 'unknown', values: [], radius: null };
  }
}

export function runStationaryIteration({ matrix, b, initial, method = 'jacobi', tolerance = 1e-6, maxIterations = 100 }) {
  if (!['jacobi', 'seidel'].includes(method)) throw new Error('Método inválido.');
  if (!Array.isArray(matrix) || !matrix.every(Array.isArray)) throw new Error('Informe uma matriz quadrada.');
  const a = parseSquareMatrix(matrix.map((row) => row.join(' ')).join('\n'));
  const n = a.length;
  for (const [vector, label] of [[b, 'B'], [initial, 'X⁽⁰⁾']]) if (!Array.isArray(vector) || vector.length !== n || !vector.every(Number.isFinite)) throw new Error(`${label} deve ter ${n} componentes finitas.`);
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance >= 1) throw new Error('Use uma tolerância maior que zero e menor que 1.');
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 500) throw new Error('O limite deve ser um inteiro de 1 a 500 iterações.');
  const d = a.map((row, i) => row.map((v, j) => i === j ? v : 0));
  const l = a.map((row, i) => row.map((v, j) => i > j ? v : 0));
  const u = a.map((row, i) => row.map((v, j) => i < j ? v : 0));
  const dominance = a.map((row, i) => {
    const diagonal = Math.abs(row[i]);
    const sum = row.reduce((s, v, j) => s + (i === j ? 0 : Math.abs(v)), 0);
    return { diagonal, sum, strict: diagonal > sum, weak: diagonal >= sum };
  });
  const result = { matrix: a, b: [...b], initial: [...initial], method, d, l, u, dominance, strict: dominance.every((row) => row.strict), weak: dominance.every((row) => row.weak), tolerance, maxIterations, steps: [], converged: false };
  if (a.some((row, i) => row[i] === 0)) return { ...result, reason: 'zero-diagonal', message: 'Há elemento nulo na diagonal. Este método exige aᵢᵢ ≠ 0; reorganize o sistema antes de iterar.' };
  const scaled = a.map((row, i) => row.map((v) => v / row[i]));
  const rhs = b.map((v, i) => v / a[i][i]);
  if (![...scaled.flat(), ...rhs].every(Number.isFinite)) return { ...result, reason: 'numeric', message: 'A divisão pela diagonal excedeu a faixa numérica. Revise a escala dos coeficientes.' };
  function sweep(old, forcing, details = false) {
    const next = [...old], calculations = [];
    for (let i = 0; i < n; i++) {
      const terms = [];
      let sum = 0;
      for (let j = 0; j < n; j++) if (i !== j) {
        const fresh = method === 'seidel' && j < i;
        const value = fresh ? next[j] : old[j];
        sum += scaled[i][j] * value;
        if (details) terms.push({ column: j, coefficient: scaled[i][j], value, fresh });
      }
      next[i] = forcing[i] - sum;
      if (details) calculations.push({ row: i, terms, rhs: forcing[i], value: next[i] });
    }
    return { x: next, calculations };
  }
  const zero = Array(n).fill(0);
  const columns = zero.map((_, j) => sweep(zero.map((_, i) => i === j ? 1 : 0), zero).x);
  result.t = columns.map((_, i) => columns.map((col) => col[i]));
  result.c = sweep(zero, rhs).x;
  if (![...result.t.flat(), ...result.c].every(Number.isFinite)) return { ...result, t: undefined, c: undefined, reason: 'numeric', message: 'A matriz de iteração excedeu a faixa numérica.' };
  result.spectral = spectralAnalysis(result.t);
  // Relative residual of the row-normalized system, invariant under equation scaling.
  const aNorm = Math.max(...scaled.map((row) => row.reduce((s, v) => s + Math.abs(v), 0)));
  function residual(x) {
    const r = norm(scaled.map((row, i) => row.reduce((sum, v, j) => sum + v * x[j], 0) - rhs[i]));
    const denominator = aNorm * norm(x) + norm(rhs);
    return denominator === 0 ? r : r / denominator;
  }
  let x = [...initial];
  let error = residual(x);
  result.steps.push({ iteration: 0, x: [...x], delta: null, residual: error, calculations: [] });
  if (error === 0) return { ...result, converged: true, reason: 'initial', message: 'O chute inicial já satisfaz o sistema na precisão numérica.' };
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const next = sweep(x, rhs, true);
    const delta = norm(next.x.map((v, i) => v - x[i])) / Math.max(1, norm(next.x));
    error = residual(next.x);
    if (![...next.x, delta, error].every(Number.isFinite)) return { ...result, reason: 'numeric', message: 'Iteração interrompida: os valores excederam a faixa numérica. O último estado finito foi preservado.' };
    result.steps.push({ iteration, ...next, delta, residual: error });
    x = next.x;
    if (delta <= tolerance && error <= tolerance) return { ...result, converged: true, reason: 'tolerance', message: 'Tolerância atingida para a variação relativa e o resíduo relativo.' };
  }
  return { ...result, reason: 'limit', message: 'Limite de iterações atingido sem satisfazer os dois critérios de parada. Isso, isoladamente, não prova divergência.' };
}
