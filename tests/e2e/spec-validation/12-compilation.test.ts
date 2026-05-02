/**
 * Spec validation: Section 12 — Compilation.
 *
 * Covers desugaring transformations, code generation patterns,
 * runtime behaviour of compiled code.
 */

import { describe, expect, it } from "vitest";

import { compileSource } from "../helpers.js";
import { expectRunOutput, expectRuns, withOutput } from "./helpers.js";

describe("12-compilation", () => {
    describe("desugaring", () => {
        it("multi-param lambda desugars to curried form", () => {
            expectRunOutput(
                withOutput(
                    `let add = (a: Int, b: Int, c: Int) => a + b + c;
let result = add(1)(2)(3);`,
                    `String.fromInt(result)`,
                ),
                "6",
            );
        });

        it("partial application works after desugaring", () => {
            expectRunOutput(
                withOutput(
                    `let add = (a: Int, b: Int) => a + b;
let inc = add(1);
let result = inc(5);`,
                    `String.fromInt(result)`,
                ),
                "6",
            );
        });

        it("while loop desugars correctly", () => {
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
            );
        });

        it("string & operator desugars correctly", () => {
            expectRunOutput(withOutput(`let greeting = "hello" & " " & "world";`, `greeting`), "hello world");
        });

        it("list literal desugars and supports cons prepend", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2, 3];
let ys = 0 :: xs;`,
                    `String.fromInt(List.length(ys))`,
                ),
                "4",
            );
        });

        it("pipe operator chains desugar correctly", () => {
            expectRunOutput(
                withOutput(
                    `let add1 = (x: Int) => x + 1;
let double = (x: Int) => x * 2;
let sub3 = (x: Int) => x - 3;
let result = 5 |> add1 |> double |> sub3;`,
                    `String.fromInt(result)`,
                ),
                "9",
            );
        });

        it("composition desugars to lambda", () => {
            expectRunOutput(
                withOutput(
                    `let inc = (x: Int) => x + 1;
let dbl = (x: Int) => x * 2;
let f = inc >> dbl;
let result = f(3);`,
                    `String.fromInt(result)`,
                ),
                "8",
            );
        });

        it("record update desugars preserving fields", () => {
            expectRunOutput(
                withOutput(
                    `let p = { name: "Alice", age: 30, city: "NYC" };
let p2 = { ...p, age: 31 };`,
                    `p2.name & " " & String.fromInt(p2.age) & " " & p2.city`,
                ),
                "Alice 31 NYC",
            );
        });
    });

    describe("code generation", () => {
        it("compiles to JavaScript successfully", () => {
            const result = compileSource(
                `let x = 42;
let y = x + 1;`,
            );
            expect(result.exitCode, `compilation failed\nstderr:\n${result.stderr}`).toBe(0);
            expect(result.stdout).toContain("x");
            expect(result.stdout).toContain("42");
        });

        it("generated JS is valid and executable", () => {
            expectRuns(
                `let x = 42;
let y = x + 1;`,
            );
        });

        it("functions compile to callable JS", () => {
            expectRunOutput(
                withOutput(
                    `let add = (a: Int, b: Int) => a + b;
let result = add(10, 20);`,
                    `String.fromInt(result)`,
                ),
                "30",
            );
        });

        it("pattern matching compiles correctly", () => {
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
            );
        });

        it("records compile to JS objects", () => {
            expectRunOutput(
                withOutput(`let p = { name: "Alice", age: 30 };`, `p.name & " is " & String.fromInt(p.age)`),
                "Alice is 30",
            );
        });

        it("lists compile and operate correctly", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2, 3];
let len = List.length(xs);`,
                    `String.fromInt(len)`,
                ),
                "3",
            );
        });

        it("variant constructors compile correctly", () => {
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
            );
        });
    });
});
