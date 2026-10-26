import { parseSquareMatrix } from './luFactorization.js';

export { parseSquareMatrix };
export const transpose = (a) => a[0].map((_, j) => a.map((row) => row[j]));
export const formatNumber = (x) => Number.isFinite(x) ? Number(x.toPrecision(7)).toString() : 'Fora da faixa numérica';
const clone = (a) => a.map((row) => [...row]);

function determinant(a) {
  if (a.length === 1) return a[0][0];
  return a[0].reduce((sum, value, j) => sum + (-1) ** j * value * determinant(a.slice(1).map((row) => row.filter((_, k) => k !== j))), 0);
}

// Jacobi rotations on a scaled real symmetric matrix.
function eigenvalues(matrix) {
  const a = clone(matrix);
  const n = a.length;
  for (let iteration = 0; iteration < 100 * n * n; iteration++) {
    let p = 0, q = 1;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (Math.abs(a[i][j]) > Math.abs(a[p][q])) { p = i; q = j; }
    }
    if (Math.abs(a[p][q]) <= 8 * Number.EPSILON) break;
    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(angle), s = Math.sin(angle);
    const app = a[p][p], aqq = a[q][q], apq = a[p][q];
    for (let k = 0; k < n; k++) if (k !== p && k !== q) {
      const akp = a[k][p], akq = a[k][q];
      a[k][p] = a[p][k] = c * akp - s * akq;
      a[k][q] = a[q][k] = s * akp + c * akq;
    }
    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = a[q][p] = 0;
  }
  return a.map((row, i) => row[i]).sort((x, y) => x - y);
}

export function quadraticForm(matrix, vector) {
  if (vector.length !== matrix.length || !vector.every(Number.isFinite) || vector.every((v) => v === 0)) {
    throw new Error(`Informe ${matrix.length} componentes finitas para um vetor não nulo.`);
  }
  const av = matrix.map((row) => row.reduce((sum, a, j) => sum + a * vector[j], 0));
  const value = vector.reduce((sum, v, i) => sum + v * av[i], 0);
  if (!Number.isFinite(value) || !av.every(Number.isFinite)) throw new Error('O cálculo excedeu a faixa numérica. Use valores menores.');
  return { av, value };
}

export function runCholesky({ matrix, tolerance = 1e-10 }) {
  // Reuse the same input limits and number syntax as the LU simulator.
  if (!Array.isArray(matrix) || !matrix.every(Array.isArray)) throw new Error('Informe uma matriz quadrada.');
  const a = parseSquareMatrix(matrix.map((row) => row.join(' ')).join('\n'));
  if (!Number.isFinite(tolerance) || tolerance < 1e-14 || tolerance >= 1) throw new Error('Use uma tolerância relativa entre 1e-14 (inclusive) e 1 (exclusive).');
  const n = a.length;
  const scale = Math.max(...a.flat().map(Math.abs)) || 1;
  const b = a.map((row) => row.map((x) => x / scale));
  const g = Array.from({ length: n }, () => Array(n).fill(0));
  const steps = [];
  const record = (type, title, description, extra = {}) => steps.push({ type, title, description, lower: g.map((row) => row.map((x) => x * Math.sqrt(scale))), ...extra });
  const symmetric = a.every((row, i) => row.every((x, j) => x === a[j][i]));
  const minors = b.map((_, i) => {
    let value = determinant(b.slice(0, i + 1).map((row) => row.slice(0, i + 1)));
    for (let k = 0; k <= i; k++) value *= scale;
    return value;
  });
  const spectrum = symmetric ? eigenvalues(b) : null;
  const result = { matrix: a, symmetric, minors, eigenvalues: spectrum?.map((x) => x * scale), steps, converged: false, tolerance };
  record('initial', 'Matriz inicial', 'Procuramos A = GGᵀ, com G triangular inferior e diagonal positiva.');
  record('symmetry', symmetric ? 'A = Aᵀ: matriz simétrica' : 'A ≠ Aᵀ: matriz não simétrica', symmetric ? 'Os elementos aᵢⱼ e aⱼᵢ coincidem.' : 'Cholesky exige simetria. Corrija os elementos espelhados antes de fatorar.');
  if (!symmetric) return { ...result, reason: 'A matriz não é simétrica.' };
  const minimum = spectrum[0];
  const positive = minimum > tolerance;
  const reason = minimum < -tolerance ? 'A matriz não é definida positiva: há autovalor negativo.' : 'Positividade não certificada: há autovalor nulo ou próximo de zero na tolerância escolhida.';
  record('positive', positive ? 'Matriz definida positiva' : 'Fatoração interrompida', positive ? 'Todos os autovalores são positivos acima da tolerância relativa.' : reason);
  if (!positive) return { ...result, reason };
  for (let j = 0; j < n; j++) for (let i = j; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < j; k++) sum += g[i][k] * g[j][k];
    const remainder = b[i][j] - sum;
    if (i === j && remainder <= 0) return { ...result, reason: 'A precisão numérica não permitiu calcular uma diagonal positiva.' };
    g[i][j] = i === j ? Math.sqrt(remainder) : remainder / g[j][j];
    const f = formatNumber;
    const label = `g${i + 1}${j + 1}`;
    record('entry', `Cálculo de ${label}`, i === j
      ? `${label} = √(a${i + 1}${i + 1} − Σ g${i + 1}k²) = √(${f(a[i][i])} − (${f(sum * scale)})) = ${f(g[i][j] * Math.sqrt(scale))}`
      : `${label} = (a${i + 1}${j + 1} − Σ g${i + 1}k g${j + 1}k) / g${j + 1}${j + 1} = (${f(a[i][j])} − (${f(sum * scale)})) / ${f(g[j][j] * Math.sqrt(scale))} = ${f(g[i][j] * Math.sqrt(scale))}`,
    { row: i, column: j });
  }
  const lower = g.map((row) => row.map((x) => x * Math.sqrt(scale)));
  const product = lower.map((row) => lower.map((other) => row.reduce((sum, v, k) => sum + v * other[k], 0)));
  if (!product.flat().every(Number.isFinite)) return { ...result, reason: 'O produto excedeu a faixa numérica. Reduza os valores da matriz.' };
  const residual = Math.max(...product.flatMap((row, i) => row.map((x, j) => Math.abs(x / scale - b[i][j]))));
  record('done', 'Fatoração concluída: A = GGᵀ', `Resíduo relativo máximo: ${formatNumber(residual)}. G tem diagonal positiva.`);
  return { ...result, converged: true, lower, product, residual };
}
