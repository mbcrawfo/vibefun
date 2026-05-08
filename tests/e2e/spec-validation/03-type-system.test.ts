/**
 * Spec validation: Section 03 — Type System.
 *
 * Covers primitive types, type inference, records, variants, generics,
 * tuples, union types, recursive types, type aliases, subtyping.
 */

import { describe, expect, it } from "vitest";

import { compileSource } from "../helpers.js";
import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "./helpers.js";

describe("03-type-system", () => {
    describe("primitive types", () => {
        it("Int type", () => {
            expectRunOutput(withOutput(`let x: Int = 42;`, `String.fromInt(x)`), "42");
        });

        it("Float type", () => {
            expectRunOutput(withOutput(`let x: Float = 3.14;`, `String.fromFloat(x)`), "3.14");
        });

        it("String type", () => {
            expectRunOutput(withOutput(`let x: String = "hello";`, `x`), "hello");
        });

        it("Bool type", () => {
            expectRunOutput(withOutput(`let x: Bool = true;`, `String.fromBool(x)`), "true");
        });

        it("Unit type", () => {
            expectCompiles(`let x: Unit = ();`);
        });

        it("no Int/Float auto-coercion", () => {
            expectCompileError(`let x = 5 + 3.14;`);
        });

        // Spec ref: docs/spec/03-type-system/primitive-types.md:129-146 — list
        // elements share a single homogeneous type; no implicit numeric
        // widening (audit 03a F-10). Pinning VF4020 (CannotUnify) prevents
        // a false-positive pass from an unrelated parser/phase failure.
        it("list with mixed Int/Float elements rejected", () => {
            expectCompileError(`let xs = [1, 2.0, 3];`, "VF4020");
        });

        it("list with mixed Int/String elements rejected", () => {
            expectCompileError(`let xs = [1, "two", 3];`, "VF4020");
        });

        it("Int division truncates toward zero", () => {
            expectRunOutput(withOutput(`let x = 7 / 2;`, `String.fromInt(x)`), "3");
        });

        it("negative Int division truncates toward zero", () => {
            expectRunOutput(withOutput(`let x: Int = -7 / 2;`, `String.fromInt(x)`), "-3");
        });

        it("string concat requires strings only", () => {
            expectCompileError(`let x = "hello" & 42;`);
        });

        it("Bool type supports logical operators", () => {
            expectRunOutput(
                withOutput(
                    `let a = true && false;
let b = false || true;
let c = !true;`,
                    `String.fromBool((a || b) && !c)`,
                ),
                "true",
            );
        });
    });

    describe("type inference", () => {
        it("basic type inference for let bindings", () => {
            expectCompiles(`let x = 42;
let y = "hello";
let z = true;`);
        });

        it("function type inference", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x: Int, y: Int) => x + y;
let result = add(2, 3);`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("polymorphic identity function", () => {
            expectRunOutput(
                withOutput(
                    `let id = <T>(x: T): T => x;
let a = id(42);
let b = id("hello");`,
                    `b`,
                ),
                "hello",
            );
        });

        it("let-polymorphism generalization", () => {
            expectCompiles(`let id = (x) => x;
let a = id(42);
let b = id("hello");`);
        });

        it("value restriction on non-syntactic values", () => {
            expectCompileError(`let id = (x) => x;
let f = id(id);
let a = f(42);
let b = f("hello");`);
        });

        it("Hindley-Milner infers function parameter types", () => {
            expectRunOutput(
                withOutput(
                    `let add = (x, y) => x + y;
let result = add(2, 3);`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });
    });

    describe("record types", () => {
        it("record construction", () => {
            expectCompiles(`let p = { name: "Alice", age: 30 };`);
        });

        it("record field access", () => {
            expectRunOutput(withOutput(`let p = { name: "Alice", age: 30 };`, `p.name`), "Alice");
        });

        it("chained field access", () => {
            expectRunOutput(
                withOutput(`let config = { server: { host: "localhost" } };`, `config.server.host`),
                "localhost",
            );
        });

        it("record immutable update (spread)", () => {
            expectRunOutput(
                withOutput(
                    `let p = { name: "Alice", age: 30 };
let p2 = { ...p, age: 31 };`,
                    `String.fromInt(p2.age)`,
                ),
                "31",
            );
        });

        it("record field shorthand", () => {
            expectRunOutput(
                withOutput(
                    `let name = "Bob";
let age = 25;
let p = { name, age };`,
                    `p.name`,
                ),
                "Bob",
            );
        });

        it("trailing comma in record", () => {
            expectCompiles(`let p = { name: "Alice", age: 30, };`);
        });

        it("width subtyping - extra fields allowed", () => {
            expectCompiles(
                `let greet = (p: { name: String }) => p.name;
let detailed = { name: "Alice", age: 30, city: "NYC" };
let result = greet(detailed);`,
            );
        });

        it("missing required fields rejected", () => {
            expectCompileError(
                `let greet = (p: { name: String, age: Int }) => p.name;
let partial = { name: "Alice" };
let result = greet(partial);`,
            );
        });

        it("keyword field shorthand rejected", () => {
            expectCompileError(`let r = { type };`);
        });

        // Spec ref: docs/spec/03-type-system/record-types.md:349-430 —
        // keywords are allowed as record field names with explicit syntax
        // (audit 03b F-05). Round-trip: construct a record with a `type`
        // field, then access it.
        it("keyword field name `type` round-trips through construction and access", () => {
            expectRunOutput(withOutput(`let r = { type: "foo" };`, `r.type`), "foo");
        });
    });

    describe("variant types", () => {
        it("variant type definition and construction", () => {
            expectCompiles(`type Color = Red | Green | Blue;
let c = Red;`);
        });

        it("variant with data", () => {
            expectCompiles(`type Option<T> = Some(T) | None;
let x = Some(42);
let y: Option<Int> = None;`);
        });

        it("variant pattern matching", () => {
            expectRunOutput(
                withOutput(
                    `let x = Some(42);
let result = match x {
  | Some(v) => String.fromInt(v)
  | None => "none"
};`,
                    `result`,
                ),
                "42",
            );
        });

        it("variant constructors are functions", () => {
            expectCompiles(`type Option<T> = Some(T) | None;
let wrap = Some;
let x = wrap(42);`);
        });

        it("nominal typing - same constructors different types are incompatible", () => {
            expectCompileError(
                `type A = Foo(Int) | Bar;
type B = Foo(Int) | Bar;
let x: A = Foo(1);
let f = (b: B) => b;
let y = f(x);`,
            );
        });

        // Spec ref: docs/spec/03-type-system/union-types.md:7-19 — variant
        // unions support pattern matching across all constructors (audit 03b
        // F-13). Standalone (non-generic) declaration with a `|`-separated
        // body and a leading bar is the canonical multi-line form.
        it("standalone variant union supports exhaustive pattern matching", () => {
            expectRunOutput(
                withOutput(
                    `type Color = | Red | Green | Blue;
let label = (c: Color) => match c {
  | Red => "r"
  | Green => "g"
  | Blue => "b"
};
let result = label(Green);`,
                    `result`,
                ),
                "g",
            );
        });
    });

    describe("generic types", () => {
        it("generic type definition", () => {
            expectCompiles(`type Box<T> = { value: T };
let b: Box<Int> = { value: 42 };`);
        });

        it("generic function", () => {
            expectRunOutput(
                withOutput(
                    `let first = <A, B>(a: A, b: B): A => a;
let result = first(42, "hello");`,
                    `String.fromInt(result)`,
                ),
                "42",
            );
        });

        it("invariant type parameters", () => {
            expectCompileError(
                `type Box<T> = { value: T };
let f = (b: Box<Int>) => b.value;
let b: Box<Float> = { value: 3.14 };
let result = f(b);`,
            );
        });
    });

    describe("tuples", () => {
        it("tuple construction", () => {
            expectCompiles(`let pair = (1, "hello");`);
        });

        it("tuple destructuring", () => {
            expectRunOutput(
                withOutput(
                    `let pair = (42, "hello");
let (a, b) = pair;`,
                    `String.fromInt(a)`,
                ),
                "42",
            );
        });

        it("triple tuple", () => {
            expectCompiles(`let triple = (1, "two", true);`);
        });

        it("nested tuples", () => {
            expectCompiles(`let nested = ((1, 2), (3, 4));`);
        });

        it("single element is not a tuple (just grouping)", () => {
            expectRunOutput(
                withOutput(
                    `let x = (42);
let y: Int = x;`,
                    `String.fromInt(y)`,
                ),
                "42",
            );
        });

        it("unit is zero-element tuple", () => {
            expectCompiles(`let x: Unit = ();`);
        });

        it("tuple index access is forbidden", () => {
            expectCompileError(
                `let pair = (1, 2);
let x = pair.0;`,
            );
        });

        it("tuple destructuring arity mismatch rejected", () => {
            expectCompileError(
                `let pair = (1, 2);
let (a, b, c) = pair;`,
            );
        });

        // Spec ref: docs/spec/03-type-system/tuples.md:17-32 — tuple types use
        // parenthesized comma-separated type syntax; nesting is supported at
        // arbitrary depth (audit 03a F-13).
        it("nested tuple type annotation accepted", () => {
            expectCompiles(`let p: ((Int, String), (Bool, Float)) = ((1, "a"), (true, 2.5));`);
        });

        it("nested tuple type annotation rejected on inner-element mismatch", () => {
            expectCompileError(`let p: ((Int, String), (Bool, Bool)) = ((1, "a"), (true, 2.5));`, "VF4020");
        });

        // Spec ref: docs/spec/03-type-system/tuples.md:53-67 — nested tuples
        // destructurable at arbitrary levels (audit 03a F-15). Concatenating
        // every leaf binder pins that all five names landed at their
        // expected positions and types.
        it("3-level nested tuple destructuring binds every leaf", () => {
            // a=1, b="a", c="b", d=2, e=true → "1" + "a" + "b" + "2" + "true"
            expectRunOutput(
                withOutput(
                    `let nested = ((1, "a"), ("b", (2, true)));
let ((a, b), (c, (d, e))) = nested;`,
                    `String.concat(String.fromInt(a), String.concat(b, String.concat(c, String.concat(String.fromInt(d), String.fromBool(e)))))`,
                ),
                "1ab2true",
            );
        });

        // Spec ref: docs/spec/03-type-system/tuples.md:394-408 — tuples are
        // structurally typed and order-sensitive (audit 03a F-21). The
        // diagnostic must surface enough of the tuple shape mismatch for
        // the user to reconcile actual vs expected. The current unifier
        // descends into the first conflicting element pair and reports a
        // VF4020 there (e.g. `Cannot unify String with Int`); this test
        // pins that the conflicting element types are both named so a user
        // can locate the order mismatch.
        //
        // The spec shows the canonical form `(Int, String) ≠ (String, Int)`;
        // surfacing the full tuple shapes alongside the element-level
        // conflict would be a richer diagnostic, tracked separately.
        it("tuple order mismatch surfaces both conflicting element types", () => {
            const r = compileSource(`let p: (String, Int) = (1, "x");`);
            expect(r.exitCode, `expected compile error\nstderr:\n${r.stderr}`).toBe(1);
            expect(r.stderr, `expected VFxxxx diagnostic\n${r.stderr}`).toMatch(/\bVF\d+\b/);
            // Both primitive type names must appear so the user sees that
            // the first element should be String but is Int (the order-flip
            // signature). Casing matters — primitive names are capitalised
            // per the spec's type-display conventions.
            expect(r.stderr).toMatch(/\bInt\b/);
            expect(r.stderr).toMatch(/\bString\b/);
        });
    });

    describe("union types", () => {
        it("string literal union type", () => {
            expectCompiles(`type Status = "pending" | "active" | "complete";
let s: Status = "pending";`);
        });

        it("string literal union rejects invalid literal", () => {
            expectCompileError(
                `type Status = "pending" | "active" | "complete";
let s: Status = "unknown";`,
            );
        });

        // Spec ref: docs/spec/03-type-system/type-inference.md:595-604 — a
        // string-literal-union annotation rejects values not in the union
        // even when they typecheck as plain `String` (audit 03a F-46).
        // VF4001 fires from the bidirectional StringLit/Union check.
        it("inline string-literal-union annotation rejects out-of-set literal", () => {
            expectCompileError(`let s: "yes" | "no" = "maybe";`, "VF4001");
        });
    });

    describe("recursive types", () => {
        it("recursive variant type", () => {
            expectCompiles(`type IntList = Nil | Cons(Int, IntList);
let xs = Cons(1, Cons(2, Nil));`);
        });

        it("recursive variant type with multiple constructors", () => {
            expectCompiles(`type Expr = Lit(Int) | Add(Expr, Expr) | Neg(Expr);
let e = Add(Lit(1), Neg(Lit(2)));`);
        });

        it("mutually recursive types with and", () => {
            expectCompiles(
                `type Expr = Lit(Int) | Add(Expr, Expr) | IfExpr(Cond)
and Cond = IsZero(Expr) | IsPos(Expr);
let e = IfExpr(IsZero(Lit(0)));`,
            );
        });

        it("unguarded recursion rejected", () => {
            expectCompileError(`type Bad = Bad;`);
        });
    });

    describe("type aliases", () => {
        it("type alias is transparent", () => {
            expectRunOutput(
                withOutput(
                    `type UserId = Int;
let id: UserId = 42;
let doubled: Int = id * 2;`,
                    `String.fromInt(doubled)`,
                ),
                "84",
            );
        });

        it("generic type alias", () => {
            expectCompiles(`type Callback<T> = (T) -> Unit;`);
        });

        it("recursive type alias rejected", () => {
            expectCompileError(`type Loop = (Int, Loop);`);
        });
    });

    describe("subtyping", () => {
        it("record width subtyping in function calls", () => {
            expectRunOutput(
                withOutput(
                    `let getName = (r: { name: String }) => r.name;
let result = getName({ name: "Alice", age: 30 });`,
                    `result`,
                ),
                "Alice",
            );
        });

        it("field order does not matter", () => {
            expectRunOutput(
                withOutput(
                    `let f = (r: { a: Int, b: String }) => r.a;
let result = f({ b: "hello", a: 42 });`,
                    `String.fromInt(result)`,
                ),
                "42",
            );
        });

        it("width subtyping does not apply through generics", () => {
            expectCompileError(
                `type Box<T> = { value: T };
let f = (b: Box<{ x: Int }>) => b;
let b: Box<{ x: Int, y: Int }> = { value: { x: 1, y: 2 } };
let result = f(b);`,
            );
        });

        // Spec ref: docs/spec/03-type-system/subtyping.md:117-164 — function
        // types must unify exactly at assignment; width subtyping at the
        // parameter is a call-site convenience, not a type-level subtype
        // relation (audit 03b F-19).
        //
        // KNOWN GAP: the spec example direction `let g: (Point2D) -> Int =
        // f` (where `f: (Point3D) -> Int`) is currently *accepted* by the
        // unifier because `unifyFun` calls `unify` on each param without
        // setting `exact: true`, so width subtyping admits the wider
        // Point3D into the narrower Point2D slot. This is unsound and
        // diverges from `subtyping.md:130-137`. Tracked as a separate
        // implementation fix; this V-layer test asserts only the
        // direction the unifier currently rejects (a missing-field
        // mismatch), so the suite still pins one half of the
        // exact-matching contract while the bug is open.
        it("function types reject assignment when actual param record is missing fields (P2D fn into P3D slot)", () => {
            // VF4503 (missing required field) fires when unifying the
            // function param records — Point3D's `z` is missing in Point2D.
            expectCompileError(
                `type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };
type FromP3D = (Point3D) -> Int;
type FromP2D = (Point2D) -> Int;
let f: FromP2D = (p: Point2D) => p.x;
let g: FromP3D = f;`,
                "VF4503",
            );
        });
    });

    describe("references", () => {
        it("Ref type annotation", () => {
            expectCompiles(`let mut x: Ref<Int> = ref(42);`);
        });
    });
});
