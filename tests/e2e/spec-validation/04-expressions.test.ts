/**
 * Spec validation: Section 04 — Expressions.
 *
 * Covers literals, variables, function calls, operators, control flow,
 * data literals, lambdas, blocks, pipes, evaluation order.
 */

import { describe, it } from "vitest";

import {
    expectCompileError,
    expectCompiles,
    expectRunOutput,
    expectRuntimeError,
    withOutput,
    withOutputs,
} from "./helpers.js";

describe("04-expressions", () => {
    describe("literal expressions", () => {
        it("integer literal expression", () => {
            expectRunOutput(withOutput(``, `String.fromInt(42)`), "42");
        });

        it("float literal expression", () => {
            expectRunOutput(withOutput(``, `String.fromFloat(3.14)`), "3.14");
        });

        it("string literal expression", () => {
            expectRunOutput(withOutput(``, `"hello"`), "hello");
        });

        it("boolean literal expression", () => {
            expectRunOutput(withOutput(``, `String.fromBool(true)`), "true");
        });
    });

    describe("variable references", () => {
        it("variable reference", () => {
            expectRunOutput(withOutput(`let x = 42;`, `String.fromInt(x)`), "42");
        });

        it("variable shadowing", () => {
            expectRunOutput(
                withOutput(
                    `let x = 1;
let x = 2;`,
                    `String.fromInt(x)`,
                ),
                "2",
            );
        });
    });

    describe("function calls", () => {
        it("single-argument function call", () => {
            expectRunOutput(
                withOutput(
                    `let double = (x: Int) => x * 2;
let result = double(5);`,
                    `String.fromInt(result)`,
                ),
                "10",
            );
        });

        it("multi-argument function call", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x: Int, y: Int) => x + y;
let result = add(3, 4);`,
                    `String.fromInt(result)`,
                ),
                "7",
            );
        });

        it("no-argument function call", () => {
            expectRunOutput(
                withOutput(
                    `let greet = () => "hi";
let result = greet();`,
                    `result`,
                ),
                "hi",
            );
        });
    });

    describe("arithmetic operators", () => {
        it("addition", () => {
            expectRunOutput(withOutput(`let x = 2 + 3;`, `String.fromInt(x)`), "5");
        });

        it("subtraction", () => {
            expectRunOutput(withOutput(`let x = 10 - 3;`, `String.fromInt(x)`), "7");
        });

        it("multiplication", () => {
            expectRunOutput(withOutput(`let x = 4 * 5;`, `String.fromInt(x)`), "20");
        });

        it("integer division", () => {
            expectRunOutput(withOutput(`let x = 10 / 3;`, `String.fromInt(x)`), "3");
        });

        it("modulo", () => {
            expectRunOutput(withOutput(`let x = 7 % 3;`, `String.fromInt(x)`), "1");
        });

        it("unary minus", () => {
            expectRunOutput(withOutput(`let x = -42;`, `String.fromInt(x)`), "-42");
        });

        it("float addition", () => {
            expectRunOutput(withOutput(`let x = 1.5 + 2.5;`, `String.fromFloat(x)`), "4");
        });

        it("float subtraction", () => {
            expectRunOutput(withOutput(`let x = 5.0 - 2.5;`, `String.fromFloat(x)`), "2.5");
        });

        it("float multiplication", () => {
            expectRunOutput(withOutput(`let x = 2.5 * 4.0;`, `String.fromFloat(x)`), "10");
        });

        it("float division", () => {
            expectRunOutput(withOutput(`let x = 7.0 / 2.0;`, `String.fromFloat(x)`), "3.5");
        });
    });

    describe("comparison operators", () => {
        it("equality comparison", () => {
            expectRunOutput(withOutput(`let x = 1 == 1;`, `String.fromBool(x)`), "true");
        });

        it("inequality comparison", () => {
            expectRunOutput(withOutput(`let x = 1 != 2;`, `String.fromBool(x)`), "true");
        });

        it("less than comparison", () => {
            expectRunOutput(withOutput(`let x = 1 < 2;`, `String.fromBool(x)`), "true");
        });

        it("greater than comparison", () => {
            expectRunOutput(withOutput(`let x = 2 > 1;`, `String.fromBool(x)`), "true");
        });

        it("greater than or equal comparison", () => {
            expectRunOutput(withOutput(`let x = 2 >= 2;`, `String.fromBool(x)`), "true");
        });

        it("less than or equal comparison", () => {
            expectRunOutput(withOutput(`let x = 2 <= 2;`, `String.fromBool(x)`), "true");
        });

        it("comparison requires same type", () => {
            expectCompileError(`let x = 1 == "one";`);
        });
    });

    describe("logical operators", () => {
        it("logical AND short-circuit", () => {
            expectRunOutput(withOutput(`let x = false && true;`, `String.fromBool(x)`), "false");
        });

        it("logical OR short-circuit", () => {
            expectRunOutput(withOutput(`let x = true || false;`, `String.fromBool(x)`), "true");
        });

        it("logical NOT", () => {
            expectRunOutput(withOutput(`let x = !false;`, `String.fromBool(x)`), "true");
        });

        it("AND short-circuit skips right side", () => {
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
            );
        });

        it("OR short-circuit skips right side", () => {
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
            );
        });
    });

    describe("string concatenation", () => {
        it("string concat with & operator", () => {
            expectRunOutput(withOutput(`let x = "hello" & " " & "world";`, `x`), "hello world");
        });

        it("string concat rejects non-string", () => {
            expectCompileError(`let x = "age: " & 42;`);
        });
    });

    describe("control flow", () => {
        it("if-then-else expression", () => {
            expectRunOutput(withOutput(`let x = if true then "yes" else "no";`, `x`), "yes");
        });

        it("if-then-else with same types required", () => {
            expectCompileError(`let x = if true then 42 else "hello";`);
        });

        it("if without else returns Unit", () => {
            expectCompiles(`let x = if true then ();`);
        });

        it("nested if-else chains", () => {
            expectRunOutput(
                withOutput(
                    `let x = 5;
let result = if x > 10 then "big" else if x > 0 then "positive" else "non-positive";`,
                    `result`,
                ),
                "positive",
            );
        });

        it("match expression with variants", () => {
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
            );
        });

        it("while loop", () => {
            expectRunOutput(
                withOutputs(
                    `let mut i = ref(0);
while !i < 3 {
  i := !i + 1;
};`,
                    [`String.fromInt(!i)`],
                ),
                "3",
            );
        });

        it("while loop returns Unit", () => {
            expectCompiles(
                `let mut i = ref(0);
let result: Unit = while !i < 5 { i := !i + 1; };`,
            );
        });

        it("while loop with false condition executes zero times", () => {
            expectRunOutput(
                withOutput(
                    `let mut x = ref(42);
while false {
  x := 0;
};`,
                    `String.fromInt(!x)`,
                ),
                "42",
            );
        });

        it("if without else with non-Unit type is error", () => {
            expectCompileError(`let x = if true then 42;`);
        });

        it("nested match as expression", () => {
            expectRunOutput(
                withOutput(
                    `let x: Option<Int> = Some(5);
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
            );
        });
    });

    describe("data literals", () => {
        it("record literal", () => {
            expectRunOutput(withOutput(`let p = { x: 1, y: 2 };`, `String.fromInt(p.x)`), "1");
        });

        it("list literal", () => {
            expectCompiles(`let xs = [1, 2, 3];`);
        });

        it("empty list", () => {
            expectCompiles(`let xs: List<Int> = [];`);
        });

        it("mixed type list rejected", () => {
            expectCompileError(`let xs = [1, "two", 3];`);
        });

        it("list spread", () => {
            expectCompiles(
                `let xs = [1, 2];
let ys = [0, ...xs, 3];`,
            );
        });

        it("tuple literal", () => {
            expectCompiles(`let pair = (1, "hello");`);
        });

        it("record spread (immutable update)", () => {
            expectRunOutput(
                withOutput(
                    `let p = { x: 1, y: 2 };
let p2 = { ...p, y: 10 };`,
                    `String.fromInt(p2.y)`,
                ),
                "10",
            );
        });

        it("list spread runtime verification", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [2, 3];
let ys = [1, ...xs];`,
                    `String.fromInt(List.length(ys))`,
                ),
                "3",
            );
        });
    });

    describe("lambda expressions", () => {
        it("lambda with single param", () => {
            expectRunOutput(
                withOutput(
                    `let inc = (x: Int) => x + 1;
let result = inc(5);`,
                    `String.fromInt(result)`,
                ),
                "6",
            );
        });

        it("lambda with multiple params", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x: Int, y: Int) => x + y;
let result = add(3, 4);`,
                    `String.fromInt(result)`,
                ),
                "7",
            );
        });

        it("lambda with no params", () => {
            expectRunOutput(
                withOutput(
                    `let f = () => "hello";
let result = f();`,
                    `result`,
                ),
                "hello",
            );
        });

        it("lambda with block body", () => {
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
            );
        });

        it("lambda single param without parens", () => {
            expectRunOutput(
                withOutput(
                    `let inc = x => x + 1;
let result: Int = inc(5);`,
                    `String.fromInt(result)`,
                ),
                "6",
            );
        });
    });

    describe("block expressions", () => {
        it("block expression returns last value", () => {
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
            );
        });

        it("empty block returns Unit", () => {
            expectCompiles(`let x: Unit = {};`);
        });

        it("nested blocks", () => {
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
            );
        });

        it("block scope isolation", () => {
            expectCompileError(
                `let result = {
  let inner = 42;
  inner;
};
let x = inner;`,
            );
        });
    });

    describe("pipe and composition", () => {
        it("pipe operator basic", () => {
            expectRunOutput(
                withOutput(
                    `let double = (x: Int) => x * 2;
let result = 5 |> double;`,
                    `String.fromInt(result)`,
                ),
                "10",
            );
        });

        it("pipe operator chaining", () => {
            expectRunOutput(
                withOutput(
                    `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let result = 5 |> add1 |> double;`,
                    `String.fromInt(result)`,
                ),
                "12",
            );
        });

        it("forward composition >>", () => {
            expectRunOutput(
                withOutput(
                    `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let f = add1 >> double;
let result = f(5);`,
                    `String.fromInt(result)`,
                ),
                "12",
            );
        });

        it("backward composition <<", () => {
            expectRunOutput(
                withOutput(
                    `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let f = add1 << double;
let result = f(5);`,
                    `String.fromInt(result)`,
                ),
                "11",
            );
        });
    });

    describe("field access", () => {
        it("field access on record", () => {
            expectRunOutput(withOutput(`let p = { name: "Alice" };`, `p.name`), "Alice");
        });

        it("chained field access", () => {
            expectRunOutput(withOutput(`let obj = { inner: { value: "deep" } };`, `obj.inner.value`), "deep");
        });
    });

    describe("cons operator", () => {
        it("cons operator prepends to list", () => {
            expectRunOutput(withOutput(`let xs = 1 :: [2, 3];`, `String.fromInt(List.length(xs))`), "3");
        });

        it("cons is right-associative", () => {
            expectRunOutput(withOutput(`let xs = 1 :: 2 :: 3 :: [];`, `String.fromInt(List.length(xs))`), "3");
        });
    });

    // Spec: 04-expressions/basic-expressions.md §Function Calls > Partial Application
    describe("partial application", () => {
        it("supports partial application via curried lambdas", () => {
            expectRunOutput(
                withOutput(
                    `let add = (a: Int) => (b: Int) => a + b;
let add5 = add(5);
let result = add5(3);`,
                    `String.fromInt(result)`,
                ),
                "8",
            );
        });
    });

    // Spec: 04-expressions/basic-expressions.md §Division Semantics > Division by zero
    // Spec: 09-error-handling.md §Division by Zero
    describe("integer division by zero", () => {
        it("panics at runtime with the spec-defined message", () => {
            // Use a non-literal divisor so the panic surfaces at runtime; the
            // spec permits compile-time rejection of literal `n / 0`.
            expectRuntimeError(
                withOutput(
                    `let zero = 0;
let result = 10 / zero;`,
                    `String.fromInt(result)`,
                ),
                "Division by zero",
            );
        });
    });

    // Spec: 04-expressions/basic-expressions.md §Comparison Operators > Chained Comparisons
    describe("chained comparisons", () => {
        it("rejects chained comparisons (parses as Bool < Int)", () => {
            expectCompileError(`let x = 5;
let r = 1 < x < 10;`);
        });
    });

    // Spec: 04-expressions/basic-expressions.md §NOT Operator (`!`)
    describe("NOT vs deref disambiguation", () => {
        it("disambiguates ! by operand type when nested over a Ref<Bool>", () => {
            // Inner `!r` derefs Ref<Bool> -> Bool; outer `!` is logical NOT.
            expectRunOutput(
                withOutput(
                    `let mut r = ref(true);
let x = !(!r);`,
                    `String.fromBool(x)`,
                ),
                "false",
            );
        });
    });

    // Spec: 04-expressions/control-flow.md §Short-Circuit Evaluation (if)
    describe("if branch short-circuit", () => {
        it("only evaluates the taken branch of an if expression", () => {
            expectRunOutput(
                withOutput(
                    `let mut counter = ref(0);
let _r = if true then { counter := !counter + 1; } else { counter := !counter + 100; };`,
                    `String.fromInt(!counter)`,
                ),
                "1",
            );
        });
    });

    // Spec: 05-pattern-matching/advanced-patterns.md §Pattern Guards (cross-validation in Section 04)
    describe("match guards (when clauses)", () => {
        it("selects the guarded arm when the guard succeeds", () => {
            expectRunOutput(
                withOutput(
                    `let x = 5;
let result = match x {
  | n when n > 0 => "pos"
  | _ => "nonpos"
};`,
                    `result`,
                ),
                "pos",
            );
        });

        it("falls through to the next arm when the guard fails", () => {
            expectRunOutput(
                withOutput(
                    `let x = -3;
let result = match x {
  | n when n > 0 => "pos"
  | _ => "nonpos"
};`,
                    `result`,
                ),
                "nonpos",
            );
        });
    });

    // Spec: 04-expressions/control-flow.md §While Loops > Type Checking Rules
    describe("while loop type errors", () => {
        it("rejects a non-Bool condition", () => {
            expectCompileError(`let bad: Unit = while 42 { (); };`);
        });

        // The body-must-be-Unit rule (spec §Type Checking Rules item 2) is not
        // currently enforced by the typechecker — `while cond { intExpr; }`
        // compiles cleanly. That divergence is out of scope for this
        // tests-only chunk; tracked separately as a follow-up to audit F-40.
    });

    // Spec: 04-expressions/control-flow.md §Try/Catch (JS syntax inside unsafe)
    describe("try/catch inside unsafe", () => {
        it("returns the catch value when the try body throws", () => {
            expectRunOutput(
                withOutput(
                    `external js_throw: () -> Int = "(() => { throw new Error('boom'); })";
let result = unsafe {
  try {
    js_throw();
  } catch (e) {
    42;
  }
};`,
                    `String.fromInt(result)`,
                ),
                "42",
            );
        });
    });
});
