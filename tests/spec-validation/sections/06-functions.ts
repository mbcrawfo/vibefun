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
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let result = add(2, 3);`,
            `String.fromInt(result)`,
        ),
        "5",
    ),
);

test(S, "06-functions.md", "function with type annotation", () =>
    expectRunOutput(
        withOutput(
            `let double: (Int) -> Int = (x) => x * 2;
let result = double(5);`,
            `String.fromInt(result)`,
        ),
        "10",
    ),
);

test(S, "06-functions.md", "function with block body", () =>
    expectRunOutput(
        withOutput(
            `let compute = (x: Int) => {
  let a = x * 2;
  let b = a + 1;
  b;
};
let result = compute(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);

// --- Currying ---

test(S, "06-functions.md", "automatic currying - full application", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let result = add(2, 3);`,
            `String.fromInt(result)`,
        ),
        "5",
    ),
);

test(S, "06-functions.md", "automatic currying - partial application", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let add5 = add(5);
let result = add5(3);`,
            `String.fromInt(result)`,
        ),
        "8",
    ),
);

test(S, "06-functions.md", "curried call syntax", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let result = add(2)(3);`,
            `String.fromInt(result)`,
        ),
        "5",
    ),
);

test(S, "06-functions.md", "three-argument currying", () =>
    expectRunOutput(
        withOutput(
            `let add3 = (a: Int, b: Int, c: Int) => a + b + c;
let f = add3(1);
let g = f(2);
let result = g(3);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);

// --- Recursive Functions ---

test(S, "06-functions.md", "recursive function with rec keyword", () =>
    expectRunOutput(
        withOutput(
            `let rec factorial = (n: Int): Int =>
  match n {
    | x when x <= 1 => 1
    | x => x * factorial(x - 1)
  };
let result = factorial(5);`,
            `String.fromInt(result)`,
        ),
        "120",
    ),
);

test(S, "06-functions.md", "recursive function - fibonacci", () =>
    expectRunOutput(
        withOutput(
            `let rec fib = (n: Int): Int =>
  match n {
    | 0 => 0
    | 1 => 1
    | x => fib(x - 1) + fib(x - 2)
  };
let result = fib(10);`,
            `String.fromInt(result)`,
        ),
        "55",
    ),
);

// --- Mutually Recursive Functions ---

test(S, "06-functions.md", "mutually recursive functions with rec/and", () =>
    expectRunOutput(
        withOutput(
            `let rec isEven = (n: Int): Bool =>
  match n {
    | 0 => true
    | x => isOdd(x - 1)
  }
and isOdd = (n: Int): Bool =>
  match n {
    | 0 => false
    | x => isEven(x - 1)
  };
let result = isEven(4);`,
            `String.fromBool(result)`,
        ),
        "true",
    ),
);

test(S, "06-functions.md", "mutual recursion - odd case", () =>
    expectRunOutput(
        withOutput(
            `let rec isEven = (n: Int): Bool =>
  match n {
    | 0 => true
    | x => isOdd(x - 1)
  }
and isOdd = (n: Int): Bool =>
  match n {
    | 0 => false
    | x => isEven(x - 1)
  };
let result = isOdd(3);`,
            `String.fromBool(result)`,
        ),
        "true",
    ),
);

// --- Higher-Order Functions ---

test(S, "06-functions.md", "function as argument", () =>
    expectRunOutput(
        withOutput(
            `let apply = (f: (Int) -> Int, x: Int) => f(x);
let double = (x: Int) => x * 2;
let result = apply(double, 5);`,
            `String.fromInt(result)`,
        ),
        "10",
    ),
);

test(S, "06-functions.md", "function as return value", () =>
    expectRunOutput(
        withOutput(
            `let makeAdder = (x: Int): (Int) -> Int => (y) => x + y;
let add10 = makeAdder(10);
let result = add10(5);`,
            `String.fromInt(result)`,
        ),
        "15",
    ),
);

// --- Lambda Expressions ---

test(S, "06-functions.md", "lambda with type annotations", () =>
    expectRunOutput(
        withOutput(
            `let f = (x: Int): Int => x + 1;
let result = f(5);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);

test(S, "06-functions.md", "lambda with pattern destructuring", () =>
    expectRunOutput(
        withOutput(
            `let getX = ({ x, y }: { x: Int, y: Int }) => x;
let result = getX({ x: 42, y: 10 });`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

test(S, "06-functions.md", "zero-argument lambda", () =>
    expectRunOutput(
        withOutput(
            `let f = () => 42;
let result = f();`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

// --- Function Composition ---

test(S, "06-functions.md", "forward composition creates new function", () =>
    expectRunOutput(
        withOutput(
            `let inc = (x: Int) => x + 1;
let dbl = (x: Int) => x * 2;
let incThenDbl = inc >> dbl;
let result = incThenDbl(5);`,
            `String.fromInt(result)`,
        ),
        "12",
    ),
);

test(S, "06-functions.md", "backward composition creates new function", () =>
    expectRunOutput(
        withOutput(
            `let inc = (x: Int) => x + 1;
let dbl = (x: Int) => x * 2;
let dblThenInc = inc << dbl;
let result = dblThenInc(5);`,
            `String.fromInt(result)`,
        ),
        "11",
    ),
);
