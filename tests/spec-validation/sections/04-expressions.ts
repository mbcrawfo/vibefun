/**
 * Spec validation tests for Section 04: Expressions
 *
 * Covers: literals, variables, function calls, operators, control flow,
 * data literals, lambdas, blocks, pipes, evaluation order.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput, withOutputs } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "04-expressions";

// --- Literal Expressions ---

test(S, "04-expressions/basic-expressions.md", "integer literal expression", () =>
    expectRunOutput(withOutput(``, `String.fromInt(42)`), "42"),
);

test(S, "04-expressions/basic-expressions.md", "float literal expression", () =>
    expectRunOutput(withOutput(``, `String.fromFloat(3.14)`), "3.14"),
);

test(S, "04-expressions/basic-expressions.md", "string literal expression", () =>
    expectRunOutput(withOutput(``, `"hello"`), "hello"),
);

test(S, "04-expressions/basic-expressions.md", "boolean literal expression", () =>
    expectRunOutput(withOutput(``, `if true then "yes" else "no"`), "yes"),
);

// --- Variable References ---

test(S, "04-expressions/basic-expressions.md", "variable reference", () =>
    expectRunOutput(withOutput(`let x = 42;`, `String.fromInt(x)`), "42"),
);

test(S, "04-expressions/basic-expressions.md", "variable shadowing", () =>
    expectRunOutput(withOutput(`let x = 1;\nlet x = 2;`, `String.fromInt(x)`), "2"),
);

// --- Function Calls ---

test(S, "04-expressions/basic-expressions.md", "single-argument function call", () =>
    expectRunOutput(
        withOutput(`let double = (x: Int) => x * 2;\nlet result = double(5);`, `String.fromInt(result)`),
        "10",
    ),
);

test(S, "04-expressions/basic-expressions.md", "multi-argument function call", () =>
    expectRunOutput(
        withOutput(`let add = (x: Int, y: Int) => x + y;\nlet result = add(3, 4);`, `String.fromInt(result)`),
        "7",
    ),
);

test(S, "04-expressions/basic-expressions.md", "no-argument function call", () =>
    expectRunOutput(withOutput(`let greet = () => "hi";\nlet result = greet();`, `result`), "hi"),
);

// --- Arithmetic Operators ---

test(S, "04-expressions/basic-expressions.md", "addition", () =>
    expectRunOutput(withOutput(`let x = 2 + 3;`, `String.fromInt(x)`), "5"),
);

test(S, "04-expressions/basic-expressions.md", "subtraction", () =>
    expectRunOutput(withOutput(`let x = 10 - 3;`, `String.fromInt(x)`), "7"),
);

test(S, "04-expressions/basic-expressions.md", "multiplication", () =>
    expectRunOutput(withOutput(`let x = 4 * 5;`, `String.fromInt(x)`), "20"),
);

test(S, "04-expressions/basic-expressions.md", "integer division", () =>
    expectRunOutput(withOutput(`let x = 10 / 3;`, `String.fromInt(x)`), "3"),
);

test(S, "04-expressions/basic-expressions.md", "modulo", () =>
    expectRunOutput(withOutput(`let x = 7 % 3;`, `String.fromInt(x)`), "1"),
);

test(S, "04-expressions/basic-expressions.md", "unary minus", () =>
    expectRunOutput(withOutput(`let x = -42;`, `String.fromInt(x)`), "-42"),
);

// --- Comparison Operators ---

test(S, "04-expressions/basic-expressions.md", "equality comparison", () =>
    expectRunOutput(withOutput(`let x = 1 == 1;`, `if x then "true" else "false"`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "inequality comparison", () =>
    expectRunOutput(withOutput(`let x = 1 != 2;`, `if x then "true" else "false"`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "less than comparison", () =>
    expectRunOutput(withOutput(`let x = 1 < 2;`, `if x then "true" else "false"`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "comparison requires same type", () =>
    expectCompileError(`let x = 1 == "one";`),
);

// --- Logical Operators ---

test(S, "04-expressions/basic-expressions.md", "logical AND short-circuit", () =>
    expectRunOutput(withOutput(`let x = false && true;`, `if x then "true" else "false"`), "false"),
);

test(S, "04-expressions/basic-expressions.md", "logical OR short-circuit", () =>
    expectRunOutput(withOutput(`let x = true || false;`, `if x then "true" else "false"`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "logical NOT", () =>
    expectRunOutput(withOutput(`let x = !false;`, `if x then "true" else "false"`), "true"),
);

// --- String Concatenation ---

test(S, "04-expressions/basic-expressions.md", "string concat with & operator", () =>
    expectRunOutput(withOutput(`let x = "hello" & " " & "world";`, `x`), "hello world"),
);

test(S, "04-expressions/basic-expressions.md", "string concat rejects non-string", () =>
    expectCompileError(`let x = "age: " & 42;`),
);

// --- Control Flow ---

test(S, "04-expressions/control-flow.md", "if-then-else expression", () =>
    expectRunOutput(withOutput(`let x = if true then "yes" else "no";`, `x`), "yes"),
);

test(S, "04-expressions/control-flow.md", "if-then-else with same types required", () =>
    expectCompileError(`let x = if true then 42 else "hello";`),
);

test(S, "04-expressions/control-flow.md", "if without else returns Unit", () =>
    expectCompiles(`let x = if true then ();`),
);

test(S, "04-expressions/control-flow.md", "nested if-else chains", () =>
    expectRunOutput(
        withOutput(
            `let x = 5;\nlet result = if x > 10 then "big" else if x > 0 then "positive" else "non-positive";`,
            `result`,
        ),
        "positive",
    ),
);

test(S, "04-expressions/control-flow.md", "match expression with variants", () =>
    expectRunOutput(
        withOutput(
            `type Color = Red | Green | Blue;\nlet c = Green;\nlet result = match c {\n  | Red => "red"\n  | Green => "green"\n  | Blue => "blue"\n};`,
            `result`,
        ),
        "green",
    ),
);

test(S, "04-expressions/control-flow.md", "while loop", () =>
    expectRunOutput(
        withOutputs(`let mut i = ref(0);\nwhile !i < 3 {\n  i := !i + 1;\n};`, [`String.fromInt(!i)`]),
        "3",
    ),
);

test(S, "04-expressions/control-flow.md", "while loop returns Unit", () =>
    expectCompiles(`let mut i = ref(0);\nlet result: Unit = while !i < 5 { i := !i + 1; };`),
);

// --- Data Literals ---

test(S, "04-expressions/data-literals.md", "record literal", () =>
    expectRunOutput(withOutput(`let p = { x: 1, y: 2 };`, `String.fromInt(p.x)`), "1"),
);

test(S, "04-expressions/data-literals.md", "list literal", () => expectCompiles(`let xs = [1, 2, 3];`));

test(S, "04-expressions/data-literals.md", "empty list", () => expectCompiles(`let xs: List<Int> = [];`));

test(S, "04-expressions/data-literals.md", "mixed type list rejected", () =>
    expectCompileError(`let xs = [1, "two", 3];`),
);

test(S, "04-expressions/data-literals.md", "list spread", () =>
    expectCompiles(`let xs = [1, 2];\nlet ys = [0, ...xs, 3];`),
);

test(S, "04-expressions/data-literals.md", "tuple literal", () => expectCompiles(`let pair = (1, "hello");`));

test(S, "04-expressions/data-literals.md", "record spread (immutable update)", () =>
    expectRunOutput(withOutput(`let p = { x: 1, y: 2 };\nlet p2 = { ...p, y: 10 };`, `String.fromInt(p2.y)`), "10"),
);

// --- Lambda Expressions ---

test(S, "04-expressions/functions-composition.md", "lambda with single param", () =>
    expectRunOutput(withOutput(`let inc = (x: Int) => x + 1;\nlet result = inc(5);`, `String.fromInt(result)`), "6"),
);

test(S, "04-expressions/functions-composition.md", "lambda with multiple params", () =>
    expectRunOutput(
        withOutput(`let add = (x: Int, y: Int) => x + y;\nlet result = add(3, 4);`, `String.fromInt(result)`),
        "7",
    ),
);

test(S, "04-expressions/functions-composition.md", "lambda with no params", () =>
    expectRunOutput(withOutput(`let f = () => "hello";\nlet result = f();`, `result`), "hello"),
);

test(S, "04-expressions/functions-composition.md", "lambda with block body", () =>
    expectRunOutput(
        withOutput(
            `let f = (x: Int) => {\n  let doubled = x * 2;\n  doubled + 1;\n};\nlet result = f(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);

// --- Block Expressions ---

test(S, "04-expressions/functions-composition.md", "block expression returns last value", () =>
    expectRunOutput(
        withOutput(`let result = {\n  let a = 1;\n  let b = 2;\n  a + b;\n};`, `String.fromInt(result)`),
        "3",
    ),
);

test(S, "04-expressions/functions-composition.md", "empty block returns Unit", () =>
    expectCompiles(`let x: Unit = {};`),
);

test(S, "04-expressions/functions-composition.md", "nested blocks", () =>
    expectRunOutput(
        withOutput(
            `let result = {\n  let a = {\n    let b = 10;\n    b * 2;\n  };\n  a + 1;\n};`,
            `String.fromInt(result)`,
        ),
        "21",
    ),
);

// --- Pipe Expressions ---

test(S, "04-expressions/functions-composition.md", "pipe operator basic", () =>
    expectRunOutput(
        withOutput(`let double = (x: Int) => x * 2;\nlet result = 5 |> double;`, `String.fromInt(result)`),
        "10",
    ),
);

test(S, "04-expressions/functions-composition.md", "pipe operator chaining", () =>
    expectRunOutput(
        withOutput(
            `let add1 = (x: Int) => x + 1;\nlet double = (x: Int) => x * 2;\nlet result = 5 |> add1 |> double;`,
            `String.fromInt(result)`,
        ),
        "12",
    ),
);

// --- Function Composition ---

test(S, "04-expressions/functions-composition.md", "forward composition >>", () =>
    expectRunOutput(
        withOutput(
            `let add1 = (x: Int) => x + 1;\nlet double = (x: Int) => x * 2;\nlet f = add1 >> double;\nlet result = f(5);`,
            `String.fromInt(result)`,
        ),
        "12",
    ),
);

test(S, "04-expressions/functions-composition.md", "backward composition <<", () =>
    expectRunOutput(
        withOutput(
            `let add1 = (x: Int) => x + 1;\nlet double = (x: Int) => x * 2;\nlet f = add1 << double;\nlet result = f(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);

// --- Field Access ---

test(S, "04-expressions/basic-expressions.md", "field access on record", () =>
    expectRunOutput(withOutput(`let p = { name: "Alice" };`, `p.name`), "Alice"),
);

test(S, "04-expressions/basic-expressions.md", "chained field access", () =>
    expectRunOutput(withOutput(`let obj = { inner: { value: "deep" } };`, `obj.inner.value`), "deep"),
);

// --- Cons Operator ---

test(S, "04-expressions/basic-expressions.md", "cons operator prepends to list", () =>
    expectCompiles(`let xs = 1 :: [2, 3];`),
);

test(S, "04-expressions/basic-expressions.md", "cons is right-associative", () =>
    expectCompiles(`let xs = 1 :: 2 :: 3 :: [];`),
);
