const DEFAULT_TOLERANCE = 1e-10;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class LUFactorizationError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "LUFactorizationError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new LUFactorizationError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new LUFactorizationError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new LUFactorizationError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  return parsed;
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function identity(size) {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0)),
  );
}

function zeroMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function cleanNumber(value, tolerance) {
  return Math.abs(value) < tolerance ? 0 : value;
}

function normalizeMatrix(matrix, tolerance) {
  return matrix.map((row) => row.map((value) => cleanNumber(value, tolerance)));
}

function validateSquareMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    throw new LUFactorizationError(
      "INVALID_MATRIX",
      "Use uma matriz quadrada com pelo menos 2 linhas.",
      "matrix",
    );
  }

  if (matrix.length > 6) {
    throw new LUFactorizationError(
      "MATRIX_TOO_LARGE",
      "Para a simulação visual, use no máximo uma matriz 6×6.",
      "matrix",
    );
  }

  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== matrix.length) {
      throw new LUFactorizationError(
        "INVALID_MATRIX_SHAPE",
        `A linha ${rowIndex + 1} precisa ter ${matrix.length} valores.`,
        "matrix",
      );
    }

    row.forEach((value, columnIndex) => {
      if (!Number.isFinite(value)) {
        throw new LUFactorizationError(
          "INVALID_MATRIX_VALUE",
          `O valor da linha ${rowIndex + 1}, coluna ${columnIndex + 1}, precisa ser finito.`,
          "matrix",
        );
      }
    });
  });
}

export function parseSquareMatrix(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new LUFactorizationError("EMPTY_MATRIX", "Digite a matriz A, uma linha por vez.", "matrix");
  }

  const rows = text
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, rowIndex) =>
      line
        .split(/[\s;|]+/)
        .filter(Boolean)
        .map((token, columnIndex) => {
          try {
            return parseFiniteNumber(token, "matrix", `o valor da linha ${rowIndex + 1}, coluna ${columnIndex + 1}`);
          } catch (error) {
            if (error instanceof LUFactorizationError) {
              throw new LUFactorizationError(
                error.code,
                `Valor inválido na linha ${rowIndex + 1}, coluna ${columnIndex + 1}.`,
                "matrix",
              );
            }
            throw error;
          }
        }),
    );

  validateSquareMatrix(rows);
  return rows;
}

function makeStep(type, details, tolerance) {
  return {
    type,
    matrix: normalizeMatrix(details.matrix, tolerance),
    lower: normalizeMatrix(details.lower, tolerance),
    upper: normalizeMatrix(details.upper, tolerance),
    permutation: normalizeMatrix(details.permutation, tolerance),
    ...details,
  };
}

function findPivotRow(matrix, column) {
  let pivotRow = column;
  let pivotMagnitude = Math.abs(matrix[column][column]);

  for (let row = column + 1; row < matrix.length; row += 1) {
    const magnitude = Math.abs(matrix[row][column]);
    if (magnitude > pivotMagnitude) {
      pivotMagnitude = magnitude;
      pivotRow = row;
    }
  }

  return { pivotRow, pivotMagnitude };
}

export function runLUFactorization({ matrix, tolerance = DEFAULT_TOLERANCE, pivoting = true } = {}) {
  const parsedTolerance = parseFiniteNumber(tolerance, "tolerance", "a tolerância");
  if (parsedTolerance <= 0) {
    throw new LUFactorizationError("INVALID_TOLERANCE", "A tolerância precisa ser maior que zero.", "tolerance");
  }

  validateSquareMatrix(matrix);

  const size = matrix.length;
  const lower = identity(size);
  const upper = cloneMatrix(matrix);
  const permutation = identity(size);
  const steps = [
    makeStep("initial", {
      matrix: upper,
      lower,
      upper,
      permutation,
      title: "Matriz inicial",
      description: "Começamos procurando uma decomposição PA = LU.",
    }, parsedTolerance),
  ];

  for (let column = 0; column < size - 1; column += 1) {
    const { pivotRow, pivotMagnitude } = pivoting
      ? findPivotRow(upper, column)
      : { pivotRow: column, pivotMagnitude: Math.abs(upper[column][column]) };

    steps.push(makeStep("pivot", {
      matrix: upper,
      lower,
      upper,
      permutation,
      column,
      pivotRow,
      title: `Pivô da coluna ${column + 1}`,
      description: pivoting
        ? `A linha ${pivotRow + 1} fornece o maior pivô disponível em módulo.`
        : "Usamos o elemento da diagonal como pivô, sem troca de linhas.",
    }, parsedTolerance));

    if (pivotMagnitude <= parsedTolerance) {
      return {
        matrix: cloneMatrix(matrix),
        lower: normalizeMatrix(lower, parsedTolerance),
        upper: normalizeMatrix(upper, parsedTolerance),
        permutation: normalizeMatrix(permutation, parsedTolerance),
        tolerance: parsedTolerance,
        pivoting,
        steps,
        converged: false,
        reason: "singular",
      };
    }

    if (pivoting && pivotRow !== column) {
      [upper[column], upper[pivotRow]] = [upper[pivotRow], upper[column]];
      [permutation[column], permutation[pivotRow]] = [permutation[pivotRow], permutation[column]];

      for (let previous = 0; previous < column; previous += 1) {
        [lower[column][previous], lower[pivotRow][previous]] = [lower[pivotRow][previous], lower[column][previous]];
      }

      steps.push(makeStep("swap", {
        matrix: upper,
        lower,
        upper,
        permutation,
        column,
        pivotRow: column,
        swappedRow: pivotRow,
        title: `Troca L${column + 1} ↔ L${pivotRow + 1}`,
        description: "A mesma troca é registrada em P; os multiplicadores anteriores acompanham as linhas.",
      }, parsedTolerance));
    }

    const pivot = upper[column][column];
    for (let row = column + 1; row < size; row += 1) {
      const multiplier = upper[row][column] / pivot;
      lower[row][column] = cleanNumber(multiplier, parsedTolerance);

      for (let currentColumn = column; currentColumn < size; currentColumn += 1) {
        upper[row][currentColumn] -= multiplier * upper[column][currentColumn];
        upper[row][currentColumn] = cleanNumber(upper[row][currentColumn], parsedTolerance);
      }

      steps.push(makeStep("eliminate", {
        matrix: upper,
        lower,
        upper,
        permutation,
        column,
        pivotRow: column,
        targetRow: row,
        multiplier,
        title: `Multiplicador ℓ${row + 1}${column + 1}`,
        description: `Guardamos ℓ${row + 1}${column + 1} = ${multiplier} em L e zeramos u${row + 1}${column + 1}.`,
      }, parsedTolerance));
    }
  }

  if (Math.abs(upper[size - 1][size - 1]) <= parsedTolerance) {
    steps.push(makeStep("singular", {
      matrix: upper,
      lower,
      upper,
      permutation,
      pivotRow: size - 1,
      column: size - 1,
      title: "Pivô final nulo",
      description: "A fatoração não determina uma matriz U com diagonal não nula.",
    }, parsedTolerance));

    return {
      matrix: cloneMatrix(matrix),
      lower: normalizeMatrix(lower, parsedTolerance),
      upper: normalizeMatrix(upper, parsedTolerance),
      permutation: normalizeMatrix(permutation, parsedTolerance),
      tolerance: parsedTolerance,
      pivoting,
      steps,
      converged: false,
      reason: "singular",
    };
  }

  steps.push(makeStep("done", {
    matrix: upper,
    lower,
    upper,
    permutation,
    title: pivoting ? "Fatoração concluída: PA = LU" : "Fatoração concluída: A = LU",
    description: "L reúne os multiplicadores da eliminação e U guarda a forma triangular superior.",
  }, parsedTolerance));

  return {
    matrix: cloneMatrix(matrix),
    lower: normalizeMatrix(lower, parsedTolerance),
    upper: normalizeMatrix(upper, parsedTolerance),
    permutation: normalizeMatrix(permutation, parsedTolerance),
    tolerance: parsedTolerance,
    pivoting,
    steps,
    converged: true,
    reason: "factorized",
  };
}
