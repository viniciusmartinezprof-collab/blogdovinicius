import assert from "node:assert/strict";
import test from "node:test";
import { MathExpressionError, compileExpression } from "./mathExpression.js";

test("avalia operadores com a precedência matemática esperada", () => {
  assert.equal(compileExpression("x^2 - 2")(2), 2);
  assert.equal(compileExpression("-2^2")(0), -4);
  assert.equal(compileExpression("(-2)^2")(0), 4);
  assert.equal(compileExpression("2^3^2")(0), 512);
  assert.equal(compileExpression("2^-2")(0), 0.25);
});

test("aceita constantes, funções, notação científica e vírgula decimal", () => {
  assert.ok(Math.abs(compileExpression("sen(pi/2)")(0) - 1) < 1e-15);
  assert.ok(Math.abs(compileExpression("cos(π)")(0) + 1) < 1e-15);
  assert.equal(compileExpression("0,5*x + 1e-3")(2), 1.001);
  assert.equal(compileExpression("log(100) + ln(e)")(0), 3);
  assert.equal(compileExpression("2**3")(0), 8);
});

test("aceita os símbolos visuais de multiplicação, divisão e menos", () => {
  assert.equal(compileExpression("6 × x ÷ 2 − 1")(3), 8);
});

test("rejeita código JavaScript e nomes fora da lista permitida", () => {
  for (const expression of ["Math.sin(x)", "globalThis.alert(1)", "x;alert(1)", "constructor.constructor('return 1')()"] ) {
    assert.throws(() => compileExpression(expression), MathExpressionError);
  }
});

test("exige multiplicação e parênteses explícitos", () => {
  assert.throws(() => compileExpression("2x"), (error) => error.code === "UNEXPECTED_TOKEN");
  assert.throws(
    () => compileExpression("sin x"),
    (error) => error.code === "FUNCTION_PARENTHESES_REQUIRED",
  );
});

test("rejeita números e expressões malformados", () => {
  assert.throws(() => compileExpression(""), (error) => error.code === "EMPTY_EXPRESSION");
  assert.throws(() => compileExpression("1..2"), (error) => error.code === "INVALID_NUMBER");
  assert.throws(() => compileExpression("1e+"), (error) => error.code === "INVALID_NUMBER");
  assert.throws(() => compileExpression("(x + 1"), (error) => error.code === "UNEXPECTED_TOKEN");
  assert.throws(() => compileExpression("1e309"), (error) => error.code === "NON_FINITE_NUMBER");
});

test("rejeita pontos fora do domínio e resultados não finitos", () => {
  assert.throws(() => compileExpression("sqrt(x)")(-1), (error) => error.code === "NON_FINITE_RESULT");
  assert.throws(() => compileExpression("ln(x)")(0), (error) => error.code === "NON_FINITE_RESULT");
  assert.throws(() => compileExpression("1/(x-1)")(1), (error) => error.code === "DIVISION_BY_ZERO");
  assert.throws(() => compileExpression("exp(x)")(1000), (error) => error.code === "NON_FINITE_RESULT");
  assert.throws(() => compileExpression("x")(Number.NaN), (error) => error.code === "INVALID_X");
});

test("limita tamanho e profundidade para proteger a interface", () => {
  assert.throws(() => compileExpression("x".repeat(301)), (error) => error.code === "EXPRESSION_TOO_LONG");
  assert.throws(
    () => compileExpression(`${"-".repeat(70)}x`),
    (error) => error.code === "EXPRESSION_TOO_DEEP",
  );
});
