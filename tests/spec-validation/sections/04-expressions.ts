/**
 * Spec validation tests for Section 04: Expressions
 *
 * Covers: literals, variables, function calls, operators, control flow,
 * data literals, lambdas, blocks, pipes, evaluation order.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput, withOutputs } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

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
    expectRunOutput(withOutput(``, `String.fromBool(true)`), "true"),
);

// --- Variable References ---

test(S, "04-expressions/basic-expressions.md", "variable reference", () =>
    expectRunOutput(withOutput(`let x = 42;`, `String.fromInt(x)`), "42"),
);

test(S, "04-expressions/basic-expressions.md", "variable shadowing", () =>
    expectRunOutput(
        withOutput(
            `let x = 1;
let x = 2;`,
            `String.fromInt(x)`,
        ),
        "2",
    ),
);

// --- Function Calls ---

test(S, "04-expressions/basic-expressions.md", "single-argument function call", () =>
    expectRunOutput(
        withOutput(
            `let double = (x: Int) => x * 2;
let result = double(5);`,
            `String.fromInt(result)`,
        ),
        "10",
    ),
);

test(S, "04-expressions/basic-expressions.md", "multi-argument function call", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let result = add(3, 4);`,
            `String.fromInt(result)`,
        ),
        "7",
    ),
);

test(S, "04-expressions/basic-expressions.md", "no-argument function call", () =>
    expectRunOutput(
        withOutput(
            `let greet = () => "hi";
let result = greet();`,
            `result`,
        ),
        "hi",
    ),
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
    expectRunOutput(withOutput(`let x = 1 == 1;`, `String.fromBool(x)`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "inequality comparison", () =>
    expectRunOutput(withOutput(`let x = 1 != 2;`, `String.fromBool(x)`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "less than comparison", () =>
    expectRunOutput(withOutput(`let x = 1 < 2;`, `String.fromBool(x)`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "comparison requires same type", () =>
    expectCompileError(`let x = 1 == "one";`),
);

// --- Logical Operators ---

test(S, "04-expressions/basic-expressions.md", "logical AND short-circuit", () =>
    expectRunOutput(withOutput(`let x = false && true;`, `String.fromBool(x)`), "false"),
);

test(S, "04-expressions/basic-expressions.md", "logical OR short-circuit", () =>
    expectRunOutput(withOutput(`let x = true || false;`, `String.fromBool(x)`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "logical NOT", () =>
    expectRunOutput(withOutput(`let x = !false;`, `String.fromBool(x)`), "true"),
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
            `let x = 5;
let result = if x > 10 then "big" else if x > 0 then "positive" else "non-positive";`,
            `result`,
        ),
        "positive",
    ),
);

test(S, "04-expressions/control-flow.md", "match expression with variants", () =>
    expectRunOutput(
        withOutput(
            `type Color = Red | Green | Blue;
let c = Green;
let result = match c {
  | Red => "red"
  | Green => "green"
  | Blue => "blue"
};`,
            `result`,
        ),
        "green",
    ),
);

test(S, "04-expressions/control-flow.md", "while loop", () =>
    expectRunOutput(
        withOutputs(
            `let mut i = ref(0);
while !i < 3 {
  i := !i + 1;
};`,
            [`String.fromInt(!i)`],
        ),
        "3",
    ),
);

test(S, "04-expressions/control-flow.md", "while loop returns Unit", () =>
    expectCompiles(
        `let mut i = ref(0);
let result: Unit = while !i < 5 { i := !i + 1; };`,
    ),
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
    expectCompiles(
        `let xs = [1, 2];
let ys = [0, ...xs, 3];`,
    ),
);

test(S, "04-expressions/data-literals.md", "tuple literal", () => expectCompiles(`let pair = (1, "hello");`));

test(S, "04-expressions/data-literals.md", "record spread (immutable update)", () =>
    expectRunOutput(
        withOutput(
            `let p = { x: 1, y: 2 };
let p2 = { ...p, y: 10 };`,
            `String.fromInt(p2.y)`,
        ),
        "10",
    ),
);

// --- Lambda Expressions ---

test(S, "04-expressions/functions-composition.md", "lambda with single param", () =>
    expectRunOutput(
        withOutput(
            `let inc = (x: Int) => x + 1;
let result = inc(5);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);

test(S, "04-expressions/functions-composition.md", "lambda with multiple params", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let result = add(3, 4);`,
            `String.fromInt(result)`,
        ),
        "7",
    ),
);

test(S, "04-expressions/functions-composition.md", "lambda with no params", () =>
    expectRunOutput(
        withOutput(
            `let f = () => "hello";
let result = f();`,
            `result`,
        ),
        "hello",
    ),
);

test(S, "04-expressions/functions-composition.md", "lambda with block body", () =>
    expectRunOutput(
        withOutput(
            `let f = (x: Int) => {
  let doubled = x * 2;
  doubled + 1;
};
let result = f(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);

// --- Block Expressions ---

test(S, "04-expressions/functions-composition.md", "block expression returns last value", () =>
    expectRunOutput(
        withOutput(
            `let result = {
  let a = 1;
  let b = 2;
  a + b;
};`,
            `String.fromInt(result)`,
        ),
        "3",
    ),
);

test(S, "04-expressions/functions-composition.md", "empty block returns Unit", () =>
    expectCompiles(`let x: Unit = {};`),
);

test(S, "04-expressions/functions-composition.md", "nested blocks", () =>
    expectRunOutput(
        withOutput(
            `let result = {
  let a = {
    let b = 10;
    b * 2;
  };
  a + 1;
};`,
            `String.fromInt(result)`,
        ),
        "21",
    ),
);

// --- Pipe Expressions ---

test(S, "04-expressions/functions-composition.md", "pipe operator basic", () =>
    expectRunOutput(
        withOutput(
            `let double = (x: Int) => x * 2;
let result = 5 |> double;`,
            `String.fromInt(result)`,
        ),
        "10",
    ),
);

test(S, "04-expressions/functions-composition.md", "pipe operator chaining", () =>
    expectRunOutput(
        withOutput(
            `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let result = 5 |> add1 |> double;`,
            `String.fromInt(result)`,
        ),
        "12",
    ),
);

// --- Function Composition ---

test(S, "04-expressions/functions-composition.md", "forward composition >>", () =>
    expectRunOutput(
        withOutput(
            `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let f = add1 >> double;
let result = f(5);`,
            `String.fromInt(result)`,
        ),
        "12",
    ),
);

test(S, "04-expressions/functions-composition.md", "backward composition <<", () =>
    expectRunOutput(
        withOutput(
            `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let f = add1 << double;
let result = f(5);`,
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
    expectRunOutput(withOutput(`let xs = 1 :: [2, 3];`, `String.fromInt(List.length(xs))`), "3"),
);

test(S, "04-expressions/basic-expressions.md", "cons is right-associative", () =>
    expectRunOutput(withOutput(`let xs = 1 :: 2 :: 3 :: [];`, `String.fromInt(List.length(xs))`), "3"),
);

// --- Float Arithmetic ---

test(S, "04-expressions/basic-expressions.md", "float addition", () =>
    expectRunOutput(withOutput(`let x = 1.5 + 2.5;`, `String.fromFloat(x)`), "4"),
);

test(S, "04-expressions/basic-expressions.md", "float subtraction", () =>
    expectRunOutput(withOutput(`let x = 5.0 - 2.5;`, `String.fromFloat(x)`), "2.5"),
);

test(S, "04-expressions/basic-expressions.md", "float multiplication", () =>
    expectRunOutput(withOutput(`let x = 2.5 * 4.0;`, `String.fromFloat(x)`), "10"),
);

test(S, "04-expressions/basic-expressions.md", "float division", () =>
    expectRunOutput(withOutput(`let x = 7.0 / 2.0;`, `String.fromFloat(x)`), "3.5"),
);

// --- Additional Comparison Operators ---

test(S, "04-expressions/basic-expressions.md", "greater than comparison", () =>
    expectRunOutput(withOutput(`let x = 2 > 1;`, `String.fromBool(x)`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "greater than or equal comparison", () =>
    expectRunOutput(withOutput(`let x = 2 >= 2;`, `String.fromBool(x)`), "true"),
);

test(S, "04-expressions/basic-expressions.md", "less than or equal comparison", () =>
    expectRunOutput(withOutput(`let x = 2 <= 2;`, `String.fromBool(x)`), "true"),
);

// --- Control Flow Edge Cases ---

test(S, "04-expressions/control-flow.md", "while loop with false condition executes zero times", () =>
    expectRunOutput(
        withOutput(
            `let mut x = ref(42);
while false {
  x := 0;
};`,
            `String.fromInt(!x)`,
        ),
        "42",
    ),
);

test(S, "04-expressions/control-flow.md", "if without else with non-Unit type is error", () =>
    expectCompileError(`let x = if true then 42;`),
);

test(S, "04-expressions/control-flow.md", "nested match as expression", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;
let x: Option<Int> = Some(5);
let result = match x {
  | Some(n) => match n > 0 {
    | true => "positive"
    | false => "non-positive"
  }
  | None => "none"
};`,
            `result`,
        ),
        "positive",
    ),
);

// --- Block Expression Edge Cases ---

test(S, "04-expressions/functions-composition.md", "block scope isolation", () =>
    expectCompileError(
        `let result = {
  let inner = 42;
  inner;
};
let x = inner;`,
    ),
);

// --- Short-Circuit Verification ---

test(S, "04-expressions/evaluation-order.md", "AND short-circuit skips right side", () =>
    expectRunOutput(
        withOutput(
            `let mut counter = ref(0);
let sideEffect = () => {
  counter := !counter + 1;
  true;
};
let result = false && sideEffect();`,
            `String.fromInt(!counter)`,
        ),
        "0",
    ),
);

test(S, "04-expressions/evaluation-order.md", "OR short-circuit skips right side", () =>
    expectRunOutput(
        withOutput(
            `let mut counter = ref(0);
let sideEffect = () => {
  counter := !counter + 1;
  false;
};
let result = true || sideEffect();`,
            `String.fromInt(!counter)`,
        ),
        "0",
    ),
);

// --- List Spread Runtime Verification ---

test(S, "04-expressions/data-literals.md", "list spread runtime verification", () =>
    expectRunOutput(
        withOutput(
            `let xs = [2, 3];
let ys = [1, ...xs];`,
            `String.fromInt(List.length(ys))`,
        ),
        "3",
    ),
);

// --- Lambda Edge Cases ---

test(S, "04-expressions/functions-composition.md", "lambda single param without parens", () =>
    expectRunOutput(
        withOutput(
            `let inc = x => x + 1;
let result: Int = inc(5);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);
