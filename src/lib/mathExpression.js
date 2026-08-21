const MAX_EXPRESSION_LENGTH = 300;
const MAX_TOKENS = 256;
const MAX_AST_DEPTH = 64;

const CONSTANTS = Object.freeze({
  e: Math.E,
  pi: Math.PI,
  "π": Math.PI,
});

const FUNCTIONS = Object.freeze({
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  cbrt: Math.cbrt,
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  raiz: Math.sqrt,
  sen: Math.sin,
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
  tg: Math.tan,
});

export class MathExpressionError extends Error {
  constructor(code, message, position = null) {
    super(message);
    this.name = "MathExpressionError";
    this.code = code;
    this.position = position;
  }
}

function expressionError(code, message, position = null) {
  return new MathExpressionError(code, message, position);
}

function isDigit(character) {
  return typeof character === "string" && character >= "0" && character <= "9";
}

function isIdentifierStart(character) {
  return typeof character === "string" && /^[A-Za-z_]$/.test(character);
}

function isIdentifierPart(character) {
  return typeof character === "string" && /^[A-Za-z0-9_]$/.test(character);
}

function tokenize(source) {
  const tokens = [];
  let position = 0;

  function addToken(type, value, tokenPosition) {
    tokens.push({ type, value, position: tokenPosition });

    if (tokens.length > MAX_TOKENS) {
      throw expressionError(
        "TOO_MANY_TOKENS",
        `A expressão pode ter no máximo ${MAX_TOKENS} elementos.`,
        tokenPosition,
      );
    }
  }

  while (position < source.length) {
    const character = source[position];

    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    if (isDigit(character) || ((character === "." || character === ",") && isDigit(source[position + 1]))) {
      const start = position;
      let hasDecimalSeparator = false;

      while (isDigit(source[position])) position += 1;

      if (source[position] === "." || source[position] === ",") {
        hasDecimalSeparator = true;
        position += 1;
        while (isDigit(source[position])) position += 1;
      }

      if (source[position] === "e" || source[position] === "E") {
        position += 1;
        if (source[position] === "+" || source[position] === "-") position += 1;

        const exponentStart = position;
        while (isDigit(source[position])) position += 1;

        if (position === exponentStart) {
          throw expressionError("INVALID_NUMBER", "O expoente do número está incompleto.", start);
        }
      }

      if (source[position] === "." || source[position] === ",") {
        const reason = hasDecimalSeparator
          ? "Um número pode ter apenas um separador decimal."
          : "Número inválido.";
        throw expressionError("INVALID_NUMBER", reason, position);
      }

      const rawNumber = source.slice(start, position).replace(",", ".");
      const number = Number(rawNumber);

      if (!Number.isFinite(number)) {
        throw expressionError("NON_FINITE_NUMBER", "O número informado é grande demais.", start);
      }

      addToken("number", number, start);
      continue;
    }

    if (isIdentifierStart(character)) {
      const start = position;
      position += 1;
      while (isIdentifierPart(source[position])) position += 1;
      addToken("identifier", source.slice(start, position).toLowerCase(), start);
      continue;
    }

    if (character === "π") {
      addToken("identifier", "π", position);
      position += 1;
      continue;
    }

    if (character === "(" || character === ")") {
      addToken(character === "(" ? "left-parenthesis" : "right-parenthesis", character, position);
      position += 1;
      continue;
    }

    if (character === "*" && source[position + 1] === "*") {
      addToken("operator", "^", position);
      position += 2;
      continue;
    }

    const normalizedOperator = {
      "+": "+",
      "-": "-",
      "−": "-",
      "*": "*",
      "×": "*",
      "/": "/",
      "÷": "/",
      "^": "^",
    }[character];

    if (normalizedOperator) {
      addToken("operator", normalizedOperator, position);
      position += 1;
      continue;
    }

    throw expressionError(
      "INVALID_CHARACTER",
      `O caractere "${character}" não é permitido na expressão.`,
      position,
    );
  }

  tokens.push({ type: "end", value: null, position: source.length });
  return tokens;
}

function node(type, properties, position) {
  const children = [];
  if (properties.argument) children.push(properties.argument);
  if (properties.left) children.push(properties.left);
  if (properties.right) children.push(properties.right);

  const depth = children.length === 0 ? 1 : 1 + Math.max(...children.map((child) => child.depth));
  if (depth > MAX_AST_DEPTH) {
    throw expressionError(
      "EXPRESSION_TOO_DEEP",
      `A expressão pode ter no máximo ${MAX_AST_DEPTH} níveis.`,
      position,
    );
  }

  return { type, ...properties, depth, position };
}

function parse(tokens) {
  let cursor = 0;

  function current() {
    return tokens[cursor];
  }

  function match(type, value = null) {
    const token = current();
    if (token.type !== type || (value !== null && token.value !== value)) return null;
    cursor += 1;
    return token;
  }

  function expect(type, message) {
    const token = match(type);
    if (!token) throw expressionError("UNEXPECTED_TOKEN", message, current().position);
    return token;
  }

  function parsePrimary() {
    const numberToken = match("number");
    if (numberToken) return node("number", { value: numberToken.value }, numberToken.position);

    const identifierToken = match("identifier");
    if (identifierToken) {
      const name = identifierToken.value;

      if (name === "x") return node("variable", {}, identifierToken.position);

      if (Object.hasOwn(CONSTANTS, name)) {
        return node("number", { value: CONSTANTS[name] }, identifierToken.position);
      }

      if (!Object.hasOwn(FUNCTIONS, name)) {
        throw expressionError(
          "UNKNOWN_IDENTIFIER",
          `O nome "${name}" não é reconhecido. Use apenas x, constantes e funções permitidas.`,
          identifierToken.position,
        );
      }

      if (!match("left-parenthesis")) {
        throw expressionError(
          "FUNCTION_PARENTHESES_REQUIRED",
          `Escreva ${name}(...) usando parênteses.`,
          current().position,
        );
      }

      const argument = parseAdditive();
      expect("right-parenthesis", `Falta fechar os parênteses de ${name}(...).`);
      return node("function", { name, argument }, identifierToken.position);
    }

    const leftParenthesis = match("left-parenthesis");
    if (leftParenthesis) {
      const expression = parseAdditive();
      expect("right-parenthesis", "Falta fechar um parêntese na expressão.");
      return expression;
    }

    if (current().type === "right-parenthesis") {
      throw expressionError("MISSING_OPERAND", "Falta um valor antes deste parêntese.", current().position);
    }

    throw expressionError("MISSING_OPERAND", "Falta um número, x ou uma função.", current().position);
  }

  function parsePower() {
    const left = parsePrimary();
    const operator = match("operator", "^");
    if (!operator) return left;

    const right = parseUnary();
    return node("binary", { operator: "^", left, right }, operator.position);
  }

  function parseUnary() {
    const plus = match("operator", "+");
    if (plus) return node("unary", { operator: "+", argument: parseUnary() }, plus.position);

    const minus = match("operator", "-");
    if (minus) return node("unary", { operator: "-", argument: parseUnary() }, minus.position);

    return parsePower();
  }

  function parseMultiplicative() {
    let left = parseUnary();

    while (current().type === "operator" && (current().value === "*" || current().value === "/")) {
      const operator = current();
      cursor += 1;
      const right = parseUnary();
      left = node("binary", { operator: operator.value, left, right }, operator.position);
    }

    return left;
  }

  function parseAdditive() {
    let left = parseMultiplicative();

    while (current().type === "operator" && (current().value === "+" || current().value === "-")) {
      const operator = current();
      cursor += 1;
      const right = parseMultiplicative();
      left = node("binary", { operator: operator.value, left, right }, operator.position);
    }

    return left;
  }

  const tree = parseAdditive();
  const remaining = current();

  if (remaining.type !== "end") {
    const message =
      remaining.type === "number" || remaining.type === "identifier" || remaining.type === "left-parenthesis"
        ? "Use * para indicar multiplicação. Por exemplo: 2*x."
        : "Há um elemento inesperado na expressão.";
    throw expressionError("UNEXPECTED_TOKEN", message, remaining.position);
  }

  return tree;
}

function ensureFiniteResult(value, position) {
  if (!Number.isFinite(value)) {
    throw expressionError(
      "NON_FINITE_RESULT",
      "A função ficou indefinida ou excedeu o limite numérico neste ponto.",
      position,
    );
  }

  return value;
}

function evaluateNode(tree, x) {
  if (tree.type === "number") return tree.value;
  if (tree.type === "variable") return x;

  if (tree.type === "unary") {
    const argument = evaluateNode(tree.argument, x);
    return ensureFiniteResult(tree.operator === "-" ? -argument : argument, tree.position);
  }

  if (tree.type === "function") {
    const argument = evaluateNode(tree.argument, x);
    return ensureFiniteResult(FUNCTIONS[tree.name](argument), tree.position);
  }

  const left = evaluateNode(tree.left, x);
  const right = evaluateNode(tree.right, x);

  if (tree.operator === "/" && right === 0) {
    throw expressionError("DIVISION_BY_ZERO", "A função tentou dividir por zero neste ponto.", tree.position);
  }

  let result;
  if (tree.operator === "+") result = left + right;
  else if (tree.operator === "-") result = left - right;
  else if (tree.operator === "*") result = left * right;
  else if (tree.operator === "/") result = left / right;
  else result = Math.pow(left, right);

  return ensureFiniteResult(result, tree.position);
}

/**
 * Compila uma expressão matemática em uma função segura para o navegador.
 * Nenhum código JavaScript fornecido pelo usuário é executado.
 */
export function compileExpression(expression) {
  if (typeof expression !== "string") {
    throw expressionError("INVALID_EXPRESSION", "Informe a função como texto.");
  }

  const source = expression.trim();
  if (!source) throw expressionError("EMPTY_EXPRESSION", "Informe uma função de x.", 0);

  if (source.length > MAX_EXPRESSION_LENGTH) {
    throw expressionError(
      "EXPRESSION_TOO_LONG",
      `A expressão pode ter no máximo ${MAX_EXPRESSION_LENGTH} caracteres.`,
      MAX_EXPRESSION_LENGTH,
    );
  }

  const tree = parse(tokenize(source));

  return function evaluate(x) {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      throw expressionError("INVALID_X", "x deve ser um número finito.");
    }

    return evaluateNode(tree, x);
  };
}
