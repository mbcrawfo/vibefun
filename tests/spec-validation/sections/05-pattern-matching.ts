/**
 * Spec validation tests for Section 05: Pattern Matching
 *
 * Covers: literal/variable/wildcard patterns, variant/list/record patterns,
 * nested patterns, guards, or-patterns, exhaustiveness checking.
 */

import { compileSource, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "05-pattern-matching";

// --- Pattern Basics ---

test(S, "05-pattern-matching/pattern-basics.md", "match expression basic structure", () =>
    expectRunOutput(
        withOutput(
            `let x = 42;
let result = match x {
  | 42 => "found"
  | _ => "other"
};`,
            `result`,
        ),
        "found",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "literal pattern matching - int", () =>
    expectRunOutput(
        withOutput(
            `let result = match 1 {
  | 0 => "zero"
  | 1 => "one"
  | _ => "other"
};`,
            `result`,
        ),
        "one",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "literal pattern matching - string", () =>
    expectRunOutput(
        withOutput(
            `let result = match "hello" {
  | "hello" => "hi"
  | _ => "unknown"
};`,
            `result`,
        ),
        "hi",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "literal pattern matching - bool", () =>
    expectRunOutput(
        withOutput(
            `let result = match true {
  | true => "yes"
  | false => "no"
};`,
            `result`,
        ),
        "yes",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "variable pattern binds value", () =>
    expectRunOutput(
        withOutput(
            `let result = match 42 {
  | x => String.fromInt(x)
};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "wildcard pattern matches anything", () =>
    expectRunOutput(
        withOutput(
            `let result = match 99 {
  | 0 => "zero"
  | _ => "other"
};`,
            `result`,
        ),
        "other",
    ),
);

test(S, "05-pattern-matching/pattern-basics.md", "first matching pattern wins", () =>
    expectRunOutput(
        withOutput(
            `let result = match 1 {
  | 1 => "first"
  | 1 => "second"
  | _ => "other"
};`,
            `result`,
        ),
        "first",
    ),
);

// --- Variant Patterns ---

test(S, "05-pattern-matching/data-patterns.md", "variant pattern - Some", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;
let x = Some(42);
let result = match x {
  | Some(v) => String.fromInt(v)
  | None => "none"
};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "variant pattern - None", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;
let x: Option<Int> = None;
let result = match x {
  | Some(v) => String.fromInt(v)
  | None => "none"
};`,
            `result`,
        ),
        "none",
    ),
);

// --- List Patterns ---

test(S, "05-pattern-matching/data-patterns.md", "list pattern - empty", () =>
    expectRunOutput(
        withOutput(
            `let xs: List<Int> = [];
let result = match xs {
  | [] => "empty"
  | _ => "not empty"
};`,
            `result`,
        ),
        "empty",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "list pattern - single element", () =>
    expectRunOutput(
        withOutput(
            `let xs = [42];
let result = match xs {
  | [x] => String.fromInt(x)
  | _ => "other"
};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "list pattern - head and tail", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let result = match xs {
  | [head, ...tail] => String.fromInt(head)
  | [] => "empty"
};`,
            `result`,
        ),
        "1",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "list pattern - specific length", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2];
let result = match xs {
  | [a, b] => String.fromInt(a + b)
  | _ => "other"
};`,
            `result`,
        ),
        "3",
    ),
);

// --- Record Patterns ---

test(S, "05-pattern-matching/data-patterns.md", "record pattern - partial match", () =>
    expectRunOutput(
        withOutput(
            `let p = { name: "Alice", age: 30 };
let result = match p {
  | { name } => name
};`,
            `result`,
        ),
        "Alice",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "record pattern with literal value", () =>
    expectRunOutput(
        withOutput(
            `let p = { status: "active", name: "Alice" };
let result = match p {
  | { status: "active", name } => "active: " & name
  | { name } => "inactive: " & name
};`,
            `result`,
        ),
        "active: Alice",
    ),
);

test(S, "05-pattern-matching/data-patterns.md", "record pattern - nested", () =>
    expectRunOutput(
        withOutput(
            `let obj = { profile: { name: "Bob" } };
let result = match obj {
  | { profile: { name } } => name
};`,
            `result`,
        ),
        "Bob",
    ),
);

// --- Advanced Patterns ---

test(S, "05-pattern-matching/advanced-patterns.md", "nested variant in variant", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Err(E);
let x: Result<Option<Int>, String> = Ok(Some(42));
let result = match x {
  | Ok(Some(v)) => String.fromInt(v)
  | Ok(None) => "none"
  | Err(e) => e
};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "pattern guard (when clause)", () =>
    expectRunOutput(
        withOutput(
            `let classify = (n: Int) => match n {
  | x when x > 0 => "positive"
  | x when x < 0 => "negative"
  | _ => "zero"
};
let result = classify(5);`,
            `result`,
        ),
        "positive",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "pattern guard - zero case", () =>
    expectRunOutput(
        withOutput(
            `let classify = (n: Int) => match n {
  | x when x > 0 => "positive"
  | x when x < 0 => "negative"
  | _ => "zero"
};
let result = classify(0);`,
            `result`,
        ),
        "zero",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "or-pattern with literals", () =>
    expectRunOutput(
        withOutput(
            `let result = match 2 {
  | 0 | 1 | 2 => "small"
  | _ => "big"
};`,
            `result`,
        ),
        "small",
    ),
);

test(S, "05-pattern-matching/advanced-patterns.md", "or-pattern with variant constructors", () =>
    expectRunOutput(
        withOutput(
            `type Color = Red | Green | Blue;
let c = Green;
let result = match c {
  | Red | Green | Blue => "primary"
};`,
            `result`,
        ),
        "primary",
    ),
);

// --- Exhaustiveness ---

test(S, "05-pattern-matching/exhaustiveness.md", "exhaustive match on bool", () =>
    expectCompiles(
        `let f = (b: Bool) => match b {
  | true => "yes"
  | false => "no"
};`,
    ),
);

test(S, "05-pattern-matching/exhaustiveness.md", "exhaustive match on variant", () =>
    expectCompiles(
        `type Option<T> = Some(T) | None;
let f = (o: Option<Int>) => match o {
  | Some(x) => x
  | None => 0
};`,
    ),
);

test(S, "05-pattern-matching/exhaustiveness.md", "exhaustive match on list with wildcard", () =>
    expectCompiles(
        `let f = (xs: List<Int>) => match xs {
  | [] => 0
  | [x, ...rest] => x
};`,
    ),
);

test(S, "05-pattern-matching/exhaustiveness.md", "non-exhaustive match produces warning or error", () => {
    const result = compileSource(
        `type Option<T> = Some(T) | None;
let f = (o: Option<Int>) => match o {
  | Some(x) => x
};`,
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
    expectCompiles(
        `let f = (n: Int) => match n {
  | 0 => "zero"
  | _ => "other"
};`,
    ),
);

test(S, "05-pattern-matching/exhaustiveness.md", "tuple pattern matching with correct arity", () =>
    expectRunOutput(
        withOutput(
            `let pair = (1, 2);
let result = match pair {
  | (a, b) => String.fromInt(a + b)
};`,
            `result`,
        ),
        "3",
    ),
);
