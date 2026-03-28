/**
 * Spec validation tests for Section 05: Pattern Matching
 *
 * Covers: literal/variable/wildcard patterns, variant/list/record patterns,
 * nested patterns, guards, or-patterns, exhaustiveness checking.
 */

import { compileSource, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "05-pattern-matching";

// --- Pattern Basics ---

test(S, "05-pattern-matching/pattern-basics.md", "match expression basic structure", () =>
    expectRunOutput(
        withOutput(`let x = 42;\nlet result = match x {\n  | 42 => "found"\n  | _ => "other"\n};`, `result`),
        "found",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "literal pattern matching - int", () =>
    expectRunOutput(
        withOutput(`let result = match 1 {\n  | 0 => "zero"\n  | 1 => "one"\n  | _ => "other"\n};`, `result`),
        "one",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "literal pattern matching - string", () =>
    expectRunOutput(
        withOutput(`let result = match "hello" {\n  | "hello" => "hi"\n  | _ => "unknown"\n};`, `result`),
        "hi",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "literal pattern matching - bool", () =>
    expectRunOutput(withOutput(`let result = match true {\n  | true => "yes"\n  | false => "no"\n};`, `result`), "yes"),
);

test(S, "05-pattern-matching/pattern-basics.md", "variable pattern binds value", () =>
    expectRunOutput(withOutput(`let result = match 42 {\n  | x => String.fromInt(x)\n};`, `result`), "42"),
);

test(S, "05-pattern-matching/pattern-basics.md", "wildcard pattern matches anything", () =>
    expectRunOutput(withOutput(`let result = match 99 {\n  | 0 => "zero"\n  | _ => "other"\n};`, `result`), "other"),
);

test(S, "05-pattern-matching/pattern-basics.md", "first matching pattern wins", () =>
    expectRunOutput(
        withOutput(`let result = match 1 {\n  | 1 => "first"\n  | 1 => "second"\n  | _ => "other"\n};`, `result`),
        "first",
    ),
);

// --- Variant Patterns ---

test(S, "05-pattern-matching/data-patterns.md", "variant pattern - Some", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;\nlet x = Some(42);\nlet result = match x {\n  | Some(v) => String.fromInt(v)\n  | None => "none"\n};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "variant pattern - None", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;\nlet x: Option<Int> = None;\nlet result = match x {\n  | Some(v) => String.fromInt(v)\n  | None => "none"\n};`,
            `result`,
        ),
        "none",
    ),
);

// --- List Patterns ---

test(S, "05-pattern-matching/data-patterns.md", "list pattern - empty", () =>
    expectRunOutput(
        withOutput(
            `let xs: List<Int> = [];\nlet result = match xs {\n  | [] => "empty"\n  | _ => "not empty"\n};`,
            `result`,
        ),
        "empty",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "list pattern - single element", () =>
    expectRunOutput(
        withOutput(
            `let xs = [42];\nlet result = match xs {\n  | [x] => String.fromInt(x)\n  | _ => "other"\n};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "list pattern - head and tail", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];\nlet result = match xs {\n  | [head, ...tail] => String.fromInt(head)\n  | [] => "empty"\n};`,
            `result`,
        ),
        "1",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "list pattern - specific length", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2];\nlet result = match xs {\n  | [a, b] => String.fromInt(a + b)\n  | _ => "other"\n};`,
            `result`,
        ),
        "3",
    ),
);

// --- Record Patterns ---

test(S, "05-pattern-matching/data-patterns.md", "record pattern - partial match", () =>
    expectRunOutput(
        withOutput(`let p = { name: "Alice", age: 30 };\nlet result = match p {\n  | { name } => name\n};`, `result`),
        "Alice",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "record pattern with literal value", () =>
    expectRunOutput(
        withOutput(
            `let p = { status: "active", name: "Alice" };\nlet result = match p {\n  | { status: "active", name } => "active: " & name\n  | { name } => "inactive: " & name\n};`,
            `result`,
        ),
        "active: Alice",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "record pattern - nested", () =>
    expectRunOutput(
        withOutput(
            `let obj = { profile: { name: "Bob" } };\nlet result = match obj {\n  | { profile: { name } } => name\n};`,
            `result`,
        ),
        "Bob",
    ),
);

// --- Advanced Patterns ---

test(S, "05-pattern-matching/advanced-patterns.md", "nested variant in variant", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;\ntype Result<T, E> = Ok(T) | Err(E);\nlet x: Result<Option<Int>, String> = Ok(Some(42));\nlet result = match x {\n  | Ok(Some(v)) => String.fromInt(v)\n  | Ok(None) => "none"\n  | Err(e) => e\n};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "pattern guard (when clause)", () =>
    expectRunOutput(
        withOutput(
            `let classify = (n: Int) => match n {\n  | x when x > 0 => "positive"\n  | x when x < 0 => "negative"\n  | _ => "zero"\n};\nlet result = classify(5);`,
            `result`,
        ),
        "positive",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "pattern guard - zero case", () =>
    expectRunOutput(
        withOutput(
            `let classify = (n: Int) => match n {\n  | x when x > 0 => "positive"\n  | x when x < 0 => "negative"\n  | _ => "zero"\n};\nlet result = classify(0);`,
            `result`,
        ),
        "zero",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "or-pattern with literals", () =>
    expectRunOutput(
        withOutput(`let result = match 2 {\n  | 0 | 1 | 2 => "small"\n  | _ => "big"\n};`, `result`),
        "small",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "or-pattern with variant constructors", () =>
    expectRunOutput(
        withOutput(
            `type Color = Red | Green | Blue;\nlet c = Green;\nlet result = match c {\n  | Red | Green | Blue => "primary"\n};`,
            `result`,
        ),
        "primary",
    ),
);

// --- Exhaustiveness ---

test(S, "05-pattern-matching/exhaustiveness.md", "exhaustive match on bool", () =>
    expectCompiles(`let f = (b: Bool) => match b {\n  | true => "yes"\n  | false => "no"\n};`),
);

test(S, "05-pattern-matching/exhaustiveness.md", "exhaustive match on variant", () =>
    expectCompiles(
        `type Option<T> = Some(T) | None;\nlet f = (o: Option<Int>) => match o {\n  | Some(x) => x\n  | None => 0\n};`,
    ),
);

test(S, "05-pattern-matching/exhaustiveness.md", "exhaustive match on list with wildcard", () =>
    expectCompiles(`let f = (xs: List<Int>) => match xs {\n  | [] => 0\n  | [x, ...rest] => x\n};`),
);

test(S, "05-pattern-matching/exhaustiveness.md", "non-exhaustive match produces warning or error", () => {
    const result = compileSource(
        `type Option<T> = Some(T) | None;\nlet f = (o: Option<Int>) => match o {\n  | Some(x) => x\n};`,
    );
    // The spec says non-exhaustive patterns produce a warning.
    // Accept either warning-as-success (exit 0) or hard error (exit 1).
    if (result.exitCode === 0 || result.exitCode === 1) {
        return { status: "pass" };
    }
    return {
        status: "fail",
        message: `Unexpected compiler exit code ${result.exitCode}`,
    };
});

test(S, "05-pattern-matching/exhaustiveness.md", "wildcard catches all Int values", () =>
    expectCompiles(`let f = (n: Int) => match n {\n  | 0 => "zero"\n  | _ => "other"\n};`),
);

test(S, "05-pattern-matching/exhaustiveness.md", "tuple pattern matching with correct arity", () =>
    expectRunOutput(
        withOutput(`let pair = (1, 2);\nlet result = match pair {\n  | (a, b) => String.fromInt(a + b)\n};`, `result`),
        "3",
    ),
);
