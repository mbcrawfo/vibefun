/**
 * Spec validation tests for Section 03: Type System
 *
 * Covers: primitive types, type inference, records, variants, generics,
 * tuples, union types, recursive types, type aliases, subtyping.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

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

test(S, "03-type-system/primitive-types.md", "Bool type supports logical operators", () =>
    expectRunOutput(
        withOutput(
            `let a = true && false;
let b = false || true;
let c = !true;`,
            `String.fromBool((a || b) && !c)`,
        ),
        "true",
    ),
);

// --- Type Inference ---

test(S, "03-type-system/type-inference.md", "basic type inference for let bindings", () =>
    expectCompiles(`let x = 42;
let y = "hello";
let z = true;`),
);

test(S, "03-type-system/type-inference.md", "function type inference", () =>
    expectRunOutput(
        withOutput(
            `let add = (x: Int, y: Int) => x + y;
let result = add(2, 3);`,
            `String.fromInt(result)`,
        ),
        "5",
    ),
);

test(S, "03-type-system/type-inference.md", "polymorphic identity function", () =>
    expectRunOutput(
        withOutput(
            `let id = <T>(x: T): T => x;
let a = id(42);
let b = id("hello");`,
            `b`,
        ),
        "hello",
    ),
);

test(S, "03-type-system/type-inference.md", "let-polymorphism generalization", () =>
    expectCompiles(`let id = (x) => x;
let a = id(42);
let b = id("hello");`),
);

test(S, "03-type-system/type-inference.md", "value restriction on non-syntactic values", () =>
    expectCompileError(`let id = (x) => x;
let f = id(id);
let a = f(42);
let b = f("hello");`),
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
        withOutput(
            `let p = { name: "Alice", age: 30 };
let p2 = { ...p, age: 31 };`,
            `String.fromInt(p2.age)`,
        ),
        "31",
    ),
);

test(S, "03-type-system/record-types.md", "record field shorthand", () =>
    expectRunOutput(
        withOutput(
            `let name = "Bob";
let age = 25;
let p = { name, age };`,
            `p.name`,
        ),
        "Bob",
    ),
);

test(S, "03-type-system/record-types.md", "trailing comma in record", () =>
    expectCompiles(`let p = { name: "Alice", age: 30, };`),
);

test(S, "03-type-system/record-types.md", "width subtyping - extra fields allowed", () =>
    expectCompiles(
        `let greet = (p: { name: String }) => p.name;
let detailed = { name: "Alice", age: 30, city: "NYC" };
let result = greet(detailed);`,
    ),
);

test(S, "03-type-system/record-types.md", "missing required fields rejected", () =>
    expectCompileError(
        `let greet = (p: { name: String, age: Int }) => p.name;
let partial = { name: "Alice" };
let result = greet(partial);`,
    ),
);

// --- Variant Types ---

test(S, "03-type-system/variant-types.md", "variant type definition and construction", () =>
    expectCompiles(`type Color = Red | Green | Blue;
let c = Red;`),
);

test(S, "03-type-system/variant-types.md", "variant with data", () =>
    expectCompiles(`type Option<T> = Some(T) | None;
let x = Some(42);
let y: Option<Int> = None;`),
);

test(S, "03-type-system/variant-types.md", "variant pattern matching", () =>
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

test(S, "03-type-system/variant-types.md", "variant constructors are functions", () =>
    expectCompiles(`type Option<T> = Some(T) | None;
let wrap = Some;
let x = wrap(42);`),
);

// --- Generic Types ---

test(S, "03-type-system/generic-types.md", "generic type definition", () =>
    expectCompiles(`type Box<T> = { value: T };
let b: Box<Int> = { value: 42 };`),
);

test(S, "03-type-system/generic-types.md", "generic function", () =>
    expectRunOutput(
        withOutput(
            `let first = <A, B>(a: A, b: B): A => a;
let result = first(42, "hello");`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

test(S, "03-type-system/generic-types.md", "invariant type parameters", () =>
    expectCompileError(
        `type Box<T> = { value: T };
let f = (b: Box<Int>) => b.value;
let b: Box<Float> = { value: 3.14 };
let result = f(b);`,
    ),
);

// --- Tuples ---

test(S, "03-type-system/tuples.md", "tuple construction", () => expectCompiles(`let pair = (1, "hello");`));

test(S, "03-type-system/tuples.md", "tuple destructuring", () =>
    expectRunOutput(
        withOutput(
            `let pair = (42, "hello");
let (a, b) = pair;`,
            `String.fromInt(a)`,
        ),
        "42",
    ),
);

test(S, "03-type-system/tuples.md", "triple tuple", () => expectCompiles(`let triple = (1, "two", true);`));

test(S, "03-type-system/tuples.md", "nested tuples", () => expectCompiles(`let nested = ((1, 2), (3, 4));`));

test(S, "03-type-system/tuples.md", "single element is not a tuple (just grouping)", () =>
    expectRunOutput(
        withOutput(
            `let x = (42);
let y: Int = x;`,
            `String.fromInt(y)`,
        ),
        "42",
    ),
);

test(S, "03-type-system/tuples.md", "unit is zero-element tuple", () => expectCompiles(`let x: Unit = ();`));

// --- Union Types ---

test(S, "03-type-system/union-types.md", "string literal union type", () =>
    expectCompiles(`type Status = "pending" | "active" | "complete";
let s: Status = "pending";`),
);

// --- Recursive Types ---

test(S, "03-type-system/recursive-types.md", "recursive variant type", () =>
    expectCompiles(`type IntList = Nil | Cons(Int, IntList);
let xs = Cons(1, Cons(2, Nil));`),
);

test(S, "03-type-system/recursive-types.md", "recursive variant type with multiple constructors", () =>
    expectCompiles(`type Expr = Lit(Int) | Add(Expr, Expr) | Neg(Expr);
let e = Add(Lit(1), Neg(Lit(2)));`),
);

// --- Type Aliases ---

test(S, "03-type-system/type-aliases.md", "type alias is transparent", () =>
    expectRunOutput(
        withOutput(
            `type UserId = Int;
let id: UserId = 42;
let doubled: Int = id * 2;`,
            `String.fromInt(doubled)`,
        ),
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
            `let getName = (r: { name: String }) => r.name;
let result = getName({ name: "Alice", age: 30 });`,
            `result`,
        ),
        "Alice",
    ),
);

test(S, "03-type-system/subtyping.md", "field order does not matter", () =>
    expectRunOutput(
        withOutput(
            `let f = (r: { a: Int, b: String }) => r.a;
let result = f({ b: "hello", a: 42 });`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

// --- Additional Type System Tests ---

test(S, "03-type-system/recursive-types.md", "mutually recursive types with and", () =>
    expectCompiles(
        `type Expr = Lit(Int) | Add(Expr, Expr) | IfExpr(Cond)
and Cond = IsZero(Expr) | IsPos(Expr);
let e = IfExpr(IsZero(Lit(0)));`,
    ),
);

test(S, "03-type-system/recursive-types.md", "unguarded recursion rejected", () =>
    expectCompileError(`type Bad = Bad;`),
);

test(S, "03-type-system/type-aliases.md", "recursive type alias rejected", () =>
    expectCompileError(`type Loop = (Int, Loop);`),
);

test(S, "03-type-system/variant-types.md", "nominal typing - same constructors different types are incompatible", () =>
    expectCompileError(
        `type A = Foo(Int) | Bar;
type B = Foo(Int) | Bar;
let x: A = Foo(1);
let f = (b: B) => b;
let y = f(x);`,
    ),
);

test(S, "03-type-system/tuples.md", "tuple index access is forbidden", () =>
    expectCompileError(
        `let pair = (1, 2);
let x = pair.0;`,
    ),
);

test(S, "03-type-system/tuples.md", "tuple destructuring arity mismatch rejected", () =>
    expectCompileError(
        `let pair = (1, 2);
let (a, b, c) = pair;`,
    ),
);

test(S, "03-type-system/union-types.md", "string literal union rejects invalid literal", () =>
    expectCompileError(
        `type Status = "pending" | "active" | "complete";
let s: Status = "unknown";`,
    ),
);

test(S, "03-type-system/record-types.md", "keyword field shorthand rejected", () =>
    expectCompileError(`let r = { type };`),
);

test(S, "03-type-system/subtyping.md", "width subtyping does not apply through generics", () =>
    expectCompileError(
        `type Box<T> = { value: T };
let f = (b: Box<{ x: Int }>) => b;
let b: Box<{ x: Int, y: Int }> = { value: { x: 1, y: 2 } };
let result = f(b);`,
    ),
);

test(S, "03-type-system/primitive-types.md", "Ref type annotation", () =>
    expectCompiles(`let mut x: Ref<Int> = ref(42);`),
);

test(S, "03-type-system/type-inference.md", "Hindley-Milner infers function parameter types", () =>
    expectRunOutput(
        withOutput(
            `let add = (x, y) => x + y;
let result = add(2, 3);`,
            `String.fromInt(result)`,
        ),
        "5",
    ),
);
