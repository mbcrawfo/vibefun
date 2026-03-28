/**
 * Spec validation tests for Section 12: Compilation
 *
 * Covers: desugaring transformations, code generation patterns,
 * runtime behavior of compiled code.
 */

import { compileSource, expectRunOutput, expectRuns, withOutput } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "12-compilation";

// --- Desugaring: Multi-param Functions ---

test(S, "12-compilation/desugaring.md", "multi-param lambda desugars to curried form", () =>
    expectRunOutput(
        withOutput(
            `let add = (a: Int, b: Int, c: Int) => a + b + c;
let result = add(1)(2)(3);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);

test(S, "12-compilation/desugaring.md", "partial application works after desugaring", () =>
    expectRunOutput(
        withOutput(
            `let add = (a: Int, b: Int) => a + b;
let inc = add(1);
let result = inc(5);`,
            `String.fromInt(result)`,
        ),
        "6",
    ),
);

// --- Desugaring: While Loops ---

test(S, "12-compilation/desugaring.md", "while loop desugars correctly", () =>
    expectRunOutput(
        withOutput(
            `let mut sum = ref(0);
let mut i = ref(0);
while !i < 5 {
  sum := !sum + !i;
  i := !i + 1;
};`,
            `String.fromInt(!sum)`,
        ),
        "10",
    ),
);

// --- Desugaring: String Concatenation ---

test(S, "12-compilation/desugaring.md", "string & operator desugars correctly", () =>
    expectRunOutput(withOutput(`let greeting = "hello" & " " & "world";`, `greeting`), "hello world"),
);

// --- Code Generation: JavaScript Output ---

test(S, "12-compilation/code-generation.md", "compiles to JavaScript successfully", () => {
    const result = compileSource(
        `let x = 42;
let y = x + 1;`,
    );
    if (result.exitCode !== 0) {
        return {
            status: "fail",
            message: `Compilation failed with exit code ${result.exitCode}`,
        };
    }
    // Check that output contains JavaScript-like code
    if (!result.stdout.includes("const") && !result.stdout.includes("let") && !result.stdout.includes("var")) {
        return {
            status: "fail",
            message: "Output does not appear to contain JavaScript",
        };
    }
    return { status: "pass" };
});

test(S, "12-compilation/code-generation.md", "generated JS is valid and executable", () =>
    expectRuns(
        `let x = 42;
let y = x + 1;`,
    ),
);

// --- Code Generation: Function Compilation ---

test(S, "12-compilation/code-generation.md", "functions compile to callable JS", () =>
    expectRunOutput(
        withOutput(
            `let add = (a: Int, b: Int) => a + b;
let result = add(10, 20);`,
            `String.fromInt(result)`,
        ),
        "30",
    ),
);

// --- Code Generation: Pattern Matching ---

test(S, "12-compilation/code-generation.md", "pattern matching compiles correctly", () =>
    expectRunOutput(
        withOutput(
            `type Shape = Circle(Float) | Rect(Float, Float);
let area = (s: Shape): String => match s {
  | Circle(r) => "circle"
  | Rect(w, h) => "rect"
};
let result = area(Circle(5.0));`,
            `result`,
        ),
        "circle",
    ),
);

// --- Code Generation: Records ---

test(S, "12-compilation/code-generation.md", "records compile to JS objects", () =>
    expectRunOutput(
        withOutput(`let p = { name: "Alice", age: 30 };`, `p.name & " is " & String.fromInt(p.age)`),
        "Alice is 30",
    ),
);

// --- Code Generation: Lists ---

test(S, "12-compilation/code-generation.md", "lists compile and operate correctly", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let len = List.length(xs);`,
            `String.fromInt(len)`,
        ),
        "3",
    ),
);

// --- Code Generation: Variants ---

test(S, "12-compilation/code-generation.md", "variant constructors compile correctly", () =>
    expectRunOutput(
        withOutput(
            `type Color = Red | Green | Blue;
let c = Green;
let name = match c {
  | Red => "red"
  | Green => "green"
  | Blue => "blue"
};`,
            `name`,
        ),
        "green",
    ),
);
