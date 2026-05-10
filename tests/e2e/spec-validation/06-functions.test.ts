/**
 * Spec validation: Section 06 — Functions.
 *
 * Covers named functions, currying, partial application, recursive
 * functions, mutual recursion, higher-order functions, lambdas,
 * composition.
 */

import { describe, it } from "vitest";

import { expectCompileError, expectRunOutput, withOutput } from "./helpers.js";

describe("06-functions", () => {
    describe("function definitions", () => {
        it("named function definition", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x: Int, y: Int) => x + y;
let result = add(2, 3);`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("function with type annotation", () => {
            expectRunOutput(
                withOutput(
                    `let double: (Int) -> Int = (x) => x * 2;
let result = double(5);`,
                    `String.fromInt(result)`,
                ),
                "10",
            );
        });

        it("function with block body", () => {
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
            );
        });
    });

    describe("currying", () => {
        it("automatic currying - partial application", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x: Int, y: Int) => x + y;
let add5 = add(5);
let result = add5(3);`,
                    `String.fromInt(result)`,
                ),
                "8",
            );
        });

        it("curried call syntax", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x: Int, y: Int) => x + y;
let result = add(2)(3);`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("three-argument currying", () => {
            expectRunOutput(
                withOutput(
                    `let add3 = (a: Int, b: Int, c: Int) => a + b + c;
let f = add3(1);
let g = f(2);
let result = g(3);`,
                    `String.fromInt(result)`,
                ),
                "6",
            );
        });

        it("mixed calling conventions for 3-arg function", () => {
            expectRunOutput(
                withOutput(
                    `let add3 = (a: Int, b: Int, c: Int) => a + b + c;
let result1 = add3(1, 2)(3);
let result2 = add3(1)(2, 3);`,
                    `String.fromInt(result1) & " " & String.fromInt(result2)`,
                ),
                "6 6",
            );
        });
    });

    describe("recursion", () => {
        it("recursive function with rec keyword", () => {
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
            );
        });

        it("recursive function - fibonacci", () => {
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
            );
        });

        it("recursive function without rec is error", () => {
            expectCompileError(
                `let factorial = (n: Int): Int =>
  match n {
    | x when x <= 1 => 1
    | x => x * factorial(x - 1)
  };`,
            );
        });
    });

    describe("mutual recursion", () => {
        it("mutually recursive functions with rec/and", () => {
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
            );
        });

        it("mutual recursion - odd case", () => {
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
            );
        });
    });

    describe("higher-order functions", () => {
        it("function as argument", () => {
            expectRunOutput(
                withOutput(
                    `let apply = (f: (Int) -> Int, x: Int) => f(x);
let double = (x: Int) => x * 2;
let result = apply(double, 5);`,
                    `String.fromInt(result)`,
                ),
                "10",
            );
        });

        it("function as return value", () => {
            expectRunOutput(
                withOutput(
                    `let makeAdder = (x: Int): (Int) -> Int => (y) => x + y;
let add10 = makeAdder(10);
let result = add10(5);`,
                    `String.fromInt(result)`,
                ),
                "15",
            );
        });
    });

    describe("lambda expressions", () => {
        it("lambda with type annotations", () => {
            expectRunOutput(
                withOutput(
                    `let f = (x: Int): Int => x + 1;
let result = f(5);`,
                    `String.fromInt(result)`,
                ),
                "6",
            );
        });

        it("lambda with pattern destructuring", () => {
            expectRunOutput(
                withOutput(
                    `let getX = ({ x, y }: { x: Int, y: Int }) => x;
let result = getX({ x: 42, y: 10 });`,
                    `String.fromInt(result)`,
                ),
                "42",
            );
        });

        it("zero-argument lambda", () => {
            expectRunOutput(
                withOutput(
                    `let f = () => 42;
let result = f();`,
                    `String.fromInt(result)`,
                ),
                "42",
            );
        });

        it("lambda with return type annotation", () => {
            expectRunOutput(
                withOutput(
                    `let show = (x: Int): String => String.fromInt(x);
let result = show(42);`,
                    `result`,
                ),
                "42",
            );
        });
    });

    describe("composition", () => {
        it("forward composition creates new function", () => {
            expectRunOutput(
                withOutput(
                    `let inc = (x: Int) => x + 1;
let dbl = (x: Int) => x * 2;
let incThenDbl = inc >> dbl;
let result = incThenDbl(5);`,
                    `String.fromInt(result)`,
                ),
                "12",
            );
        });

        it("backward composition creates new function", () => {
            expectRunOutput(
                withOutput(
                    `let inc = (x: Int) => x + 1;
let dbl = (x: Int) => x * 2;
let dblThenInc = inc << dbl;
let result = dblThenInc(5);`,
                    `String.fromInt(result)`,
                ),
                "11",
            );
        });
    });

    describe("closures", () => {
        it("closure captures outer variable", () => {
            expectRunOutput(
                withOutput(
                    `let x = 10;
let addX = (y: Int) => x + y;
let result = addX(5);`,
                    `String.fromInt(result)`,
                ),
                "15",
            );
        });
    });

    describe("application errors", () => {
        it("over-application is compile error", () => {
            expectCompileError(
                `let add = (x: Int, y: Int) => x + y;
let result = add(1, 2, 3);`,
            );
        });
    });

    // Spec ref: docs/spec/06-functions.md:311 — "Vibefun does not
    // support polymorphic recursion." Audit (06 F-21) flagged the
    // lack of an explicit V-layer test pinning this rejection.
    // The recursive call `f([x])` requires f : List<'a> -> _ while
    // the binding gives f : 'a -> _, so 'a must unify with List<'a>
    // — the occurs check rejects it (VF4300 — InfiniteType).
    describe("polymorphic recursion", () => {
        it("rejects polymorphic recursion with InfiniteType (VF4300)", () => {
            expectCompileError(
                `let rec f = (x) => f([x]);
let r = f(1);`,
                "VF4300",
            );
        });
    });

    // Spec ref: docs/spec/06-functions.md (lexical scoping is implicit).
    // Audit (06 F-24) flagged the lack of an explicit V-layer test that
    // an inner lambda parameter shadows an outer let-binding of the
    // same name. A regression that mishandles environment extension
    // would surface as the outer binding leaking into the inner scope.
    describe("name shadowing", () => {
        it("inner lambda parameter shadows outer let binding", () => {
            expectRunOutput(
                withOutput(
                    `let x = 1;
let f = (x: Int) => x + 10;
let result = f(5);`,
                    `String.fromInt(result)`,
                ),
                "15",
            );
        });

        it("inner let binding shadows outer let binding within a block", () => {
            expectRunOutput(
                withOutput(
                    `let x = 1;
let result = {
  let x = 100;
  x + 1;
};`,
                    `String.fromInt(result)`,
                ),
                "101",
            );
        });
    });
});
