/**
 * Spec validation tests for Section 03: Type System
 *
 * Covers: primitive types, type inference, records, variants, generics,
 * tuples, union types, recursive types, type aliases, subtyping.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "03-type-system";

// --- Primitive Types ---

test(S, "03-type-system/primitive-types.md", "Int type", () =>
    expectRunOutput(withOutput(`let x: Int = 42;`, `String.fromInt(x)`), "42"),
);

test(S, "03-type-system/primitive-types.md", "Float type", () =>
    expectRunOutput(withOutput(`let x: Float = 3.14;`, `String.fromFloat(x)`), "3.14"),
);

test(S, "03-type-system/primitive-types.md", "String type", () =>
    expectRunOutput(withOutput(`let x: String = "hello";`, `x`), "hello"),
);

test(S, "03-type-system/primitive-types.md", "Bool type", () =>
    expectRunOutput(withOutput(`let x: Bool = true;`, `String.fromBool(x)`), "true"),
);

test(S, "03-type-system/primitive-types.md", "Unit type", () => expectCompiles(`let x: Unit = ();`));

test(S, "03-type-system/primitive-types.md", "no Int/Float auto-coercion", () =>
    expectCompileError(`let x = 5 + 3.14;`),
);

test(S, "03-type-system/primitive-types.md", "Int division truncates toward zero", () =>
    expectRunOutput(withOutput(`let x = 7 / 2;`, `String.fromInt(x)`), "3"),
);

test(S, "03-type-system/primitive-types.md", "negative Int division truncates toward zero", () =>
    expectRunOutput(withOutput(`let x: Int = -7 / 2;`, `String.fromInt(x)`), "-3"),
);

test(S, "03-type-system/primitive-types.md", "string concat requires strings only", () =>
    expectCompileError(`let x = "hello" & 42;`),
);

test(S, "03-type-system/primitive-types.md", "Bool logical AND", () =>
    expectRunOutput(withOutput(`let x = true && false;`, `String.fromBool(x)`), "false"),
);

test(S, "03-type-system/primitive-types.md", "Bool logical OR", () =>
    expectRunOutput(withOutput(`let x = false || true;`, `String.fromBool(x)`), "true"),
);

// --- Type Inference ---

test(S, "03-type-system/type-inference.md", "basic type inference for let bindings", () =>
    expectCompiles(`let x = 42;\nlet y = "hello";\nlet z = true;`),
);

test(S, "03-type-system/type-inference.md", "function type inference", () =>
    expectRunOutput(
        withOutput(`let add = (x: Int, y: Int) => x + y;\nlet result = add(2, 3);`, `String.fromInt(result)`),
        "5",
    ),
);

test(S, "03-type-system/type-inference.md", "polymorphic identity function", () =>
    expectRunOutput(withOutput(`let id = <T>(x: T): T => x;\nlet a = id(42);\nlet b = id("hello");`, `b`), "hello"),
);

test(S, "03-type-system/type-inference.md", "let-polymorphism generalization", () =>
    expectCompiles(`let id = (x) => x;\nlet a = id(42);\nlet b = id("hello");`),
);

test(S, "03-type-system/type-inference.md", "value restriction on non-syntactic values", () =>
    expectCompileError(`let id = (x) => x;\nlet f = id(id);\nlet a = f(42);\nlet b = f("hello");`),
);

// --- Record Types ---

test(S, "03-type-system/record-types.md", "record construction", () =>
    expectCompiles(`let p = { name: "Alice", age: 30 };`),
);

test(S, "03-type-system/record-types.md", "record field access", () =>
    expectRunOutput(withOutput(`let p = { name: "Alice", age: 30 };`, `p.name`), "Alice"),
);

test(S, "03-type-system/record-types.md", "chained field access", () =>
    expectRunOutput(withOutput(`let config = { server: { host: "localhost" } };`, `config.server.host`), "localhost"),
);

test(S, "03-type-system/record-types.md", "record immutable update (spread)", () =>
    expectRunOutput(
        withOutput(`let p = { name: "Alice", age: 30 };\nlet p2 = { ...p, age: 31 };`, `String.fromInt(p2.age)`),
        "31",
    ),
);

test(S, "03-type-system/record-types.md", "record field shorthand", () =>
    expectRunOutput(withOutput(`let name = "Bob";\nlet age = 25;\nlet p = { name, age };`, `p.name`), "Bob"),
);

test(S, "03-type-system/record-types.md", "trailing comma in record", () =>
    expectCompiles(`let p = { name: "Alice", age: 30, };`),
);

test(S, "03-type-system/record-types.md", "width subtyping - extra fields allowed", () =>
    expectCompiles(
        `let greet = (p: { name: String }) => p.name;\nlet detailed = { name: "Alice", age: 30, city: "NYC" };\nlet result = greet(detailed);`,
    ),
);

test(S, "03-type-system/record-types.md", "missing required fields rejected", () =>
    expectCompileError(
        `let greet = (p: { name: String, age: Int }) => p.name;\nlet partial = { name: "Alice" };\nlet result = greet(partial);`,
    ),
);

// --- Variant Types ---

test(S, "03-type-system/variant-types.md", "variant type definition and construction", () =>
    expectCompiles(`type Color = Red | Green | Blue;\nlet c = Red;`),
);

test(S, "03-type-system/variant-types.md", "variant with data", () =>
    expectCompiles(`type Option<T> = Some(T) | None;\nlet x = Some(42);\nlet y: Option<Int> = None;`),
);

test(S, "03-type-system/variant-types.md", "variant pattern matching", () =>
    expectRunOutput(
        withOutput(
            `type Option<T> = Some(T) | None;\nlet x = Some(42);\nlet result = match x {\n  | Some(v) => String.fromInt(v)\n  | None => "none"\n};`,
            `result`,
        ),
        "42",
    ),
);

test(S, "03-type-system/variant-types.md", "variant constructors are functions", () =>
    expectCompiles(`type Option<T> = Some(T) | None;\nlet wrap = Some;\nlet x = wrap(42);`),
);

// --- Generic Types ---

test(S, "03-type-system/generic-types.md", "generic type definition", () =>
    expectCompiles(`type Box<T> = { value: T };\nlet b: Box<Int> = { value: 42 };`),
);

test(S, "03-type-system/generic-types.md", "generic function", () =>
    expectRunOutput(
        withOutput(
            `let first = <A, B>(a: A, b: B): A => a;\nlet result = first(42, "hello");`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

test(S, "03-type-system/generic-types.md", "invariant type parameters", () =>
    expectCompileError(
        `type Box<T> = { value: T };\nlet f = (b: Box<Int>) => b.value;\nlet b: Box<Float> = { value: 3.14 };\nlet result = f(b);`,
    ),
);

// --- Tuples ---

test(S, "03-type-system/tuples.md", "tuple construction", () => expectCompiles(`let pair = (1, "hello");`));

test(S, "03-type-system/tuples.md", "tuple destructuring", () =>
    expectRunOutput(withOutput(`let pair = (42, "hello");\nlet (a, b) = pair;`, `String.fromInt(a)`), "42"),
);

test(S, "03-type-system/tuples.md", "triple tuple", () => expectCompiles(`let triple = (1, "two", true);`));

test(S, "03-type-system/tuples.md", "nested tuples", () => expectCompiles(`let nested = ((1, 2), (3, 4));`));

test(S, "03-type-system/tuples.md", "single element is not a tuple (just grouping)", () =>
    expectRunOutput(withOutput(`let x = (42);\nlet y: Int = x;`, `String.fromInt(y)`), "42"),
);

test(S, "03-type-system/tuples.md", "unit is zero-element tuple", () => expectCompiles(`let x: Unit = ();`));

// --- Union Types ---

test(S, "03-type-system/union-types.md", "string literal union type", () =>
    expectCompiles(`type Status = "pending" | "active" | "complete";\nlet s: Status = "pending";`),
);

// --- Recursive Types ---

test(S, "03-type-system/recursive-types.md", "recursive variant type", () =>
    expectCompiles(`type IntList = Nil | Cons(Int, IntList);\nlet xs = Cons(1, Cons(2, Nil));`),
);

test(S, "03-type-system/recursive-types.md", "mutually recursive types", () =>
    expectCompiles(`type Expr = Lit(Int) | Add(Expr, Expr) | Neg(Expr);\nlet e = Add(Lit(1), Neg(Lit(2)));`),
);

// --- Type Aliases ---

test(S, "03-type-system/type-aliases.md", "type alias is transparent", () =>
    expectRunOutput(
        withOutput(`type UserId = Int;\nlet id: UserId = 42;\nlet doubled: Int = id * 2;`, `String.fromInt(doubled)`),
        "84",
    ),
);

test(S, "03-type-system/type-aliases.md", "generic type alias", () =>
    expectCompiles(`type Callback<T> = (T) -> Unit;`),
);

// --- Subtyping ---

test(S, "03-type-system/subtyping.md", "record width subtyping in function calls", () =>
    expectRunOutput(
        withOutput(
            `let getName = (r: { name: String }) => r.name;\nlet result = getName({ name: "Alice", age: 30 });`,
            `result`,
        ),
        "Alice",
    ),
);

test(S, "03-type-system/subtyping.md", "field order does not matter", () =>
    expectCompiles(`let f = (r: { a: Int, b: String }) => r.a;\nlet result = f({ b: "hello", a: 42 });`),
);
