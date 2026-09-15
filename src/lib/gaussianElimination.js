const DEFAULT_TOLERANCE = 1e-10;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

export class GaussianEliminationError extends Error {
  constructor(code, message, field = null, details = {}) {
    super(message);
    this.name = "GaussianEliminationError";
    this.code = code;
    this.field = field;
    Object.assign(this, details);
  }
}

function parseFiniteNumber(value, field, label) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new GaussianEliminationError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  if (typeof value !== "string" || !DECIMAL_NUMBER.test(value.trim())) {
    throw new GaussianEliminationError("INVALID_NUMBER", `Informe ${label} como um número válido.`, field);
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new GaussianEliminationError("INVALID_NUMBER", `${label} deve ser um número finito.`, field);
  }

  return parsed;
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function cleanNumber(value, tolerance) {
  return Math.abs(value) < tolerance ? 0 : value;
}

function normalizeMatrix(matrix, tolerance) {
  return matrix.map((row) => row.map((value) => cleanNumber(value, tolerance)));
}

function validateAugmentedMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    throw new GaussianEliminationError(
      "INVALID_MATRIX",
      "Use uma matriz aumentada com pelo menos 2 equações.",
      "matrix",
    );
  }

  const size = matrix.length;
  const expectedColumns = size + 1;

  if (size > 6) {
    throw new GaussianEliminationError(
      "MATRIX_TOO_LARGE",
      "Para a simulação visual, use no máximo 6 equações.",
      "matrix",
    );
  }

  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== expectedColumns) {
      throw new GaussianEliminationError(
        "INVALID_MATRIX_SHAPE",
        `A linha ${rowIndex + 1} precisa ter ${expectedColumns} valores: ${size} coeficientes e o termo independente.`,
        "matrix",
      );
    }

    row.forEach((value, columnIndex) => {
      if (!Number.isFinite(value)) {
        throw new GaussianEliminationError(
          "INVALID_MATRIX_VALUE",
          `O valor da linha ${rowIndex + 1}, coluna ${columnIndex + 1}, precisa ser finito.`,
          "matrix",
        );
      }
    });
  });
}

export function parseAugmentedMatrix(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new GaussianEliminationError(
      "EMPTY_MATRIX",
      "Digite a matriz aumentada, uma equação por linha.",
      "matrix",
    );
  }

  const rows = text
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, rowIndex) => {
      const values = line
        .split(/[\s;|]+/)
        .filter(Boolean)
        .map((token, columnIndex) => {
          try {
            return parseFiniteNumber(token, "matrix", `o valor da linha ${rowIndex + 1}, coluna ${columnIndex + 1}`);
          } catch (error) {
            if (error instanceof GaussianEliminationError) {
              throw new GaussianEliminationError(
                error.code,
                `Valor inválido na linha ${rowIndex + 1}, coluna ${columnIndex + 1}.`,
                "matrix",
              );
            }
            throw error;
          }
        });

      return values;
    });

  validateAugmentedMatrix(rows);
  return rows;
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

function makeStep(type, matrix, details = {}) {
  return {
    type,
    matrix: cloneMatrix(matrix),
    ...details,
  };
}

export function runGaussianElimination({ matrix, tolerance = DEFAULT_TOLERANCE, pivoting = true } = {}) {
  const parsedTolerance = parseFiniteNumber(tolerance, "tolerance", "a tolerância");
  if (parsedTolerance <= 0) {
    throw new GaussianEliminationError("INVALID_TOLERANCE", "A tolerância precisa ser maior que zero.", "tolerance");
  }

  validateAugmentedMatrix(matrix);

  const size = matrix.length;
  const work = cloneMatrix(matrix);
  const steps = [
    makeStep("initial", normalizeMatrix(work, parsedTolerance), {
      title: "Matriz aumentada inicial",
      description: pivoting
        ? "Começamos com [A | b] e permitimos trocas de linha para escolher bons pivôs."
        : "Começamos com [A | b] e mantemos a ordem original das equações.",
    }),
  ];

  for (let column = 0; column < size - 1; column += 1) {
    const { pivotRow, pivotMagnitude } = pivoting
      ? findPivotRow(work, column)
      : { pivotRow: column, pivotMagnitude: Math.abs(work[column][column]) };

    steps.push(makeStep("pivot", normalizeMatrix(work, parsedTolerance), {
      column,
      pivotRow,
      title: `Escolha do pivô na coluna ${column + 1}`,
      description: pivoting
        ? `Selecionamos a linha ${pivotRow + 1} porque tem o maior |aᵢ${column + 1}| disponível.`
        : `Usamos a própria linha ${column + 1} como pivô, sem permutar equações.`,
    }));

    if (pivotMagnitude <= parsedTolerance) {
      return {
        matrix: cloneMatrix(matrix),
        tolerance: parsedTolerance,
        pivoting,
        steps,
        solution: null,
        converged: false,
        reason: "singular",
      };
    }

    if (pivoting && pivotRow !== column) {
      [work[column], work[pivotRow]] = [work[pivotRow], work[column]];
      steps.push(makeStep("swap", normalizeMatrix(work, parsedTolerance), {
        column,
        pivotRow: column,
        swappedRow: pivotRow,
        title: `Troca L${column + 1} ↔ L${pivotRow + 1}`,
        description: "Trazemos o melhor pivô para a diagonal para reduzir instabilidade numérica.",
      }));
    }

    const pivot = work[column][column];
    for (let row = column + 1; row < size; row += 1) {
      const factor = work[row][column] / pivot;

      if (Math.abs(factor) <= parsedTolerance) {
        work[row][column] = 0;
        steps.push(makeStep("skip", normalizeMatrix(work, parsedTolerance), {
          column,
          pivotRow: column,
          targetRow: row,
          factor: 0,
          title: `Linha ${row + 1} já está zerada na coluna ${column + 1}`,
          description: "Nenhuma operação é necessária para esta entrada.",
        }));
        continue;
      }

      for (let currentColumn = column; currentColumn <= size; currentColumn += 1) {
        work[row][currentColumn] -= factor * work[column][currentColumn];
        work[row][currentColumn] = cleanNumber(work[row][currentColumn], parsedTolerance);
      }

      steps.push(makeStep("eliminate", normalizeMatrix(work, parsedTolerance), {
        column,
        pivotRow: column,
        targetRow: row,
        factor,
        title: `Zerando a${row + 1}${column + 1}`,
        description: `Aplicamos L${row + 1} ← L${row + 1} − (${factor})·L${column + 1}.`,
      }));
    }
  }

  const lastPivot = work[size - 1][size - 1];
  if (Math.abs(lastPivot) <= parsedTolerance) {
    steps.push(makeStep("singular", normalizeMatrix(work, parsedTolerance), {
      pivotRow: size - 1,
      column: size - 1,
      title: "Pivô final nulo",
      description: "A matriz triangular não tem pivôs suficientes para determinar uma única solução.",
    }));

    return {
      matrix: cloneMatrix(matrix),
      triangularMatrix: normalizeMatrix(work, parsedTolerance),
      tolerance: parsedTolerance,
      pivoting,
      steps,
      solution: null,
      converged: false,
      reason: "singular",
    };
  }

  steps.push(makeStep("triangular", normalizeMatrix(work, parsedTolerance), {
    title: "Sistema triangular superior",
    description: "Todos os coeficientes abaixo da diagonal principal foram anulados.",
  }));

  const solution = Array(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    const diagonal = work[row][row];
    if (Math.abs(diagonal) <= parsedTolerance) {
      return {
        matrix: cloneMatrix(matrix),
        triangularMatrix: normalizeMatrix(work, parsedTolerance),
        tolerance: parsedTolerance,
        pivoting,
        steps,
        solution: null,
        converged: false,
        reason: "singular",
      };
    }

    let knownTerms = 0;
    for (let column = row + 1; column < size; column += 1) {
      knownTerms += work[row][column] * solution[column];
    }

    solution[row] = cleanNumber((work[row][size] - knownTerms) / diagonal, parsedTolerance);
    steps.push(makeStep("back-substitution", normalizeMatrix(work, parsedTolerance), {
      solvedRow: row,
      solution: [...solution],
      title: `Substituição retroativa em x${row + 1}`,
      description: `Isolamos x${row + 1} usando os valores já conhecidos à direita da linha ${row + 1}.`,
    }));
  }

  return {
    matrix: cloneMatrix(matrix),
    triangularMatrix: normalizeMatrix(work, parsedTolerance),
    tolerance: parsedTolerance,
    pivoting,
    steps,
    solution,
    converged: true,
    reason: "unique-solution",
  };
}
