/**
 * Spec validation tests for Section 06: Functions
 *
 * Covers: named functions, currying, partial application, recursive functions,
 * mutual recursion, higher-order functions, lambdas, composition.
 */

import { expectRunOutput, withOutput } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "06-functions";

// --- Function Definitions ---

test(S, "06-functions.md", "named function definition", () =>
    expectRunOutput(
        withOutput(`let add = (x: Int, y: Int) => x + y;\nlet result = add(2, 3);`, `String.fromInt(result)`),
        "5",
    ),
);

test(S, "06-functions.md", "function with type annotation", () =>
    expectRunOutput(
        withOutput(`let double: (Int) -> Int = (x) => x * 2;\nlet result = double(5);`, `String.fromInt(result)`),
        "10",
    ),
);

test(S, "06-functions.md", "function with block body", () =>
    expectRunOutput(
        withOutput(
            `let compute = (x: Int) => {\n  let a = x * 2;\n  let b = a + 1;\n  b;\n};\nlet result = compute(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);

// --- Currying ---

test(S, "06-functions.md", "automatic currying - full application", () =>
    expectRunOutput(
        withOutput(`let add = (x: Int, y: Int) => x + y;\nlet result = add(2, 3);`, `String.fromInt(result)`),
        "5",
    ),
);

test(S, "06-functions.md", "automatic currying - partial application", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;\nlet add5 = add(5);\nlet result = add5(3);`,
            `String.fromInt(result)`,
        ),
        "8",
    ),
);

test(S, "06-functions.md", "curried call syntax", () =>
    expectRunOutput(
        withOutput(`let add = (x: Int, y: Int) => x + y;\nlet result = add(2)(3);`, `String.fromInt(result)`),
        "5",
    ),
);

test(S, "06-functions.md", "three-argument currying", () =>
    expectRunOutput(
        withOutput(
            `let add3 = (a: Int, b: Int, c: Int) => a + b + c;\nlet f = add3(1);\nlet g = f(2);\nlet result = g(3);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);

// --- Recursive Functions ---

test(S, "06-functions.md", "recursive function with rec keyword", () =>
    expectRunOutput(
        withOutput(
            `let rec factorial = (n: Int): Int =>\n  if n <= 1 then 1\n  else n * factorial(n - 1);\nlet result = factorial(5);`,
            `String.fromInt(result)`,
        ),
        "120",
    ),
);

test(S, "06-functions.md", "recursive function - fibonacci", () =>
    expectRunOutput(
        withOutput(
            `let rec fib = (n: Int): Int =>\n  if n <= 1 then n\n  else fib(n - 1) + fib(n - 2);\nlet result = fib(10);`,
            `String.fromInt(result)`,
        ),
        "55",
    ),
);

// --- Mutually Recursive Functions ---

test(S, "06-functions.md", "mutually recursive functions with rec/and", () =>
    expectRunOutput(
        withOutput(
            `let rec isEven = (n: Int): Bool =>\n  if n == 0 then true else isOdd(n - 1)\nand isOdd = (n: Int): Bool =>\n  if n == 0 then false else isEven(n - 1);\nlet result = isEven(4);`,
            `if result then "true" else "false"`,
        ),
        "true",
    ),
);

test(S, "06-functions.md", "mutual recursion - odd case", () =>
    expectRunOutput(
        withOutput(
            `let rec isEven = (n: Int): Bool =>\n  if n == 0 then true else isOdd(n - 1)\nand isOdd = (n: Int): Bool =>\n  if n == 0 then false else isEven(n - 1);\nlet result = isOdd(3);`,
            `if result then "true" else "false"`,
        ),
        "true",
    ),
);

// --- Higher-Order Functions ---

test(S, "06-functions.md", "function as argument", () =>
    expectRunOutput(
        withOutput(
            `let apply = (f: (Int) -> Int, x: Int) => f(x);\nlet double = (x: Int) => x * 2;\nlet result = apply(double, 5);`,
            `String.fromInt(result)`,
        ),
        "10",
    ),
);

test(S, "06-functions.md", "function as return value", () =>
    expectRunOutput(
        withOutput(
            `let makeAdder = (x: Int): (Int) -> Int => (y) => x + y;\nlet add10 = makeAdder(10);\nlet result = add10(5);`,
            `String.fromInt(result)`,
        ),
        "15",
    ),
);

// --- Lambda Expressions ---

test(S, "06-functions.md", "lambda with type annotations", () =>
    expectRunOutput(withOutput(`let f = (x: Int): Int => x + 1;\nlet result = f(5);`, `String.fromInt(result)`), "6"),
);

test(S, "06-functions.md", "lambda with pattern destructuring", () =>
    expectRunOutput(
        withOutput(
            `let getX = ({ x, y }: { x: Int, y: Int }) => x;\nlet result = getX({ x: 42, y: 10 });`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

test(S, "06-functions.md", "zero-argument lambda", () =>
    expectRunOutput(withOutput(`let f = () => 42;\nlet result = f();`, `String.fromInt(result)`), "42"),
);

// --- Function Composition ---

test(S, "06-functions.md", "forward composition creates new function", () =>
    expectRunOutput(
        withOutput(
            `let inc = (x: Int) => x + 1;\nlet dbl = (x: Int) => x * 2;\nlet incThenDbl = inc >> dbl;\nlet result = incThenDbl(5);`,
            `String.fromInt(result)`,
        ),
        "12",
    ),
);

test(S, "06-functions.md", "backward composition creates new function", () =>
    expectRunOutput(
        withOutput(
            `let inc = (x: Int) => x + 1;\nlet dbl = (x: Int) => x * 2;\nlet dblThenInc = inc << dbl;\nlet result = dblThenInc(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);
