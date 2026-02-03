import type { EmitContext } from "./context.js";

import { describe, expect, it } from "vitest";

import {
    emitExpr,
    escapeString,
    setEmitMatchPattern,
    setEmitPattern,
    setExtractPatternNames,
} from "./emit-expressions.js";
import { emitMatchPattern, emitPattern, extractPatternNames } from "./emit-patterns.js";
import {
    app,
    binOp,
    boolLit,
    createTestContext,
    floatLit,
    intLit,
    lambda,
    letExpr,
    letRecExpr,
    literalPat,
    matchExpr,
    record,
    recordAccess,
    recordUpdate,
    recordWithSpread,
    stringLit,
    tuple,
    tuplePat,
    unaryOp,
    unitLit,
    variant,
    variantPat,
    varPat,
    varRef,
    wildcardPat,
} from "./test-helpers.js";

// Set up pattern emission dependencies (cast to unknown to satisfy DI types)
setEmitPattern(emitPattern as (pattern: unknown, ctx: EmitContext) => string);
setEmitMatchPattern(
    emitMatchPattern as (
        pattern: unknown,
        scrutinee: string,
        ctx: EmitContext,
    ) => { condition: string | null; bindings: string[] },
);
setExtractPatternNames(extractPatternNames as (pattern: unknown) => string[]);

describe("Expression Emission", () => {
    describe("Literals", () => {
        describe("Integer literals", () => {
            it("should emit positive integers", () => {
                const ctx = createTestContext();
                expect(emitExpr(intLit(42), ctx)).toBe("42");
                expect(emitExpr(intLit(0), ctx)).toBe("0");
                expect(emitExpr(intLit(1000000), ctx)).toBe("1000000");
            });

            it("should wrap negative integers in parentheses", () => {
                const ctx = createTestContext();
                expect(emitExpr(intLit(-1), ctx)).toBe("(-1)");
                expect(emitExpr(intLit(-42), ctx)).toBe("(-42)");
                expect(emitExpr(intLit(-1000000), ctx)).toBe("(-1000000)");
            });
        });

        describe("Float literals", () => {
            it("should emit positive floats", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(3.14), ctx)).toBe("3.14");
                expect(emitExpr(floatLit(0.5), ctx)).toBe("0.5");
            });

            it("should ensure float representation for whole numbers", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(1.0), ctx)).toBe("1.0");
                expect(emitExpr(floatLit(42.0), ctx)).toBe("42.0");
            });

            it("should wrap negative floats in parentheses", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(-3.14), ctx)).toBe("(-3.14)");
                expect(emitExpr(floatLit(-0.5), ctx)).toBe("(-0.5)");
            });

            it("should emit Infinity", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(Infinity), ctx)).toBe("Infinity");
            });

            it("should emit -Infinity with parentheses", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(-Infinity), ctx)).toBe("(-Infinity)");
            });

            it("should emit NaN", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(NaN), ctx)).toBe("NaN");
            });

            it("should emit negative zero with parentheses", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(-0), ctx)).toBe("(-0)");
            });

            it("should handle scientific notation", () => {
                const ctx = createTestContext();
                expect(emitExpr(floatLit(1e10), ctx)).toBe("10000000000.0");
                expect(emitExpr(floatLit(1.5e-5), ctx)).toBe("0.000015");
            });
        });

        describe("String literals", () => {
            it("should emit simple strings", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("hello"), ctx)).toBe('"hello"');
                expect(emitExpr(stringLit(""), ctx)).toBe('""');
            });

            it("should escape backslashes", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("a\\b"), ctx)).toBe('"a\\\\b"');
            });

            it("should escape quotes", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit('say "hello"'), ctx)).toBe('"say \\"hello\\""');
            });

            it("should escape newlines", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("line1\nline2"), ctx)).toBe('"line1\\nline2"');
            });

            it("should escape tabs", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("col1\tcol2"), ctx)).toBe('"col1\\tcol2"');
            });

            it("should escape carriage returns", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("line1\rline2"), ctx)).toBe('"line1\\rline2"');
            });

            it("should escape null bytes", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("a\0b"), ctx)).toBe('"a\\0b"');
            });

            it("should use \\x00 for null bytes followed by digits", () => {
                const ctx = createTestContext();
                // When null is followed by a digit, we must use \x00 to avoid
                // creating invalid octal escape sequences like \01
                expect(emitExpr(stringLit("\x001"), ctx)).toBe('"\\x001"');
                expect(emitExpr(stringLit("\x009"), ctx)).toBe('"\\x009"');
                expect(emitExpr(stringLit("a\x005b"), ctx)).toBe('"a\\x005b"');
            });

            it("should escape U+2028 line separator", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("a\u2028b"), ctx)).toBe('"a\\u2028b"');
            });

            it("should escape U+2029 paragraph separator", () => {
                const ctx = createTestContext();
                expect(emitExpr(stringLit("a\u2029b"), ctx)).toBe('"a\\u2029b"');
            });

            it("should escape other control characters", () => {
                const ctx = createTestContext();
                // Bell character (0x07)
                expect(emitExpr(stringLit("a\x07b"), ctx)).toBe('"a\\x07b"');
            });
        });

        describe("Boolean literals", () => {
            it("should emit true", () => {
                const ctx = createTestContext();
                expect(emitExpr(boolLit(true), ctx)).toBe("true");
            });

            it("should emit false", () => {
                const ctx = createTestContext();
                expect(emitExpr(boolLit(false), ctx)).toBe("false");
            });
        });

        describe("Unit literal", () => {
            it("should emit undefined", () => {
                const ctx = createTestContext();
                expect(emitExpr(unitLit(), ctx)).toBe("undefined");
            });
        });
    });

    describe("Variables", () => {
        it("should emit simple variable names", () => {
            const ctx = createTestContext();
            expect(emitExpr(varRef("x"), ctx)).toBe("x");
            expect(emitExpr(varRef("myVar"), ctx)).toBe("myVar");
            expect(emitExpr(varRef("foo123"), ctx)).toBe("foo123");
        });

        it("should escape reserved words", () => {
            const ctx = createTestContext();
            expect(emitExpr(varRef("class"), ctx)).toBe("class$");
            expect(emitExpr(varRef("function"), ctx)).toBe("function$");
            expect(emitExpr(varRef("const"), ctx)).toBe("const$");
            expect(emitExpr(varRef("let"), ctx)).toBe("let$");
        });

        it("should use jsName for external bindings", () => {
            const ctx = createTestContext();
            ctx.env.values.set("floor", {
                kind: "External",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                jsName: "Math.floor",
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            });

            expect(emitExpr(varRef("floor"), ctx)).toBe("Math.floor");
        });

        it("should use jsName for external overload bindings", () => {
            const ctx = createTestContext();
            ctx.env.values.set("abs", {
                kind: "ExternalOverload",
                overloads: [],
                jsName: "Math.abs",
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            });

            expect(emitExpr(varRef("abs"), ctx)).toBe("Math.abs");
        });
    });

    describe("Operators", () => {
        describe("Binary operators", () => {
            it("should emit arithmetic operators", () => {
                const ctx = createTestContext();
                expect(emitExpr(binOp("Add", intLit(1), intLit(2)), ctx)).toBe("1 + 2");
                expect(emitExpr(binOp("Subtract", intLit(5), intLit(3)), ctx)).toBe("5 - 3");
                expect(emitExpr(binOp("Multiply", intLit(4), intLit(2)), ctx)).toBe("4 * 2");
                expect(emitExpr(binOp("FloatDivide", floatLit(10.0), floatLit(3.0)), ctx)).toBe("10.0 / 3.0");
                expect(emitExpr(binOp("Modulo", intLit(7), intLit(3)), ctx)).toBe("7 % 3");
            });

            it("should emit IntDivide with Math.trunc", () => {
                const ctx = createTestContext();
                expect(emitExpr(binOp("IntDivide", intLit(7), intLit(2)), ctx)).toBe("Math.trunc(7 / 2)");
            });

            it("should emit comparison operators", () => {
                const ctx = createTestContext();
                expect(emitExpr(binOp("LessThan", intLit(1), intLit(2)), ctx)).toBe("1 < 2");
                expect(emitExpr(binOp("LessEqual", intLit(1), intLit(2)), ctx)).toBe("1 <= 2");
                expect(emitExpr(binOp("GreaterThan", intLit(2), intLit(1)), ctx)).toBe("2 > 1");
                expect(emitExpr(binOp("GreaterEqual", intLit(2), intLit(1)), ctx)).toBe("2 >= 1");
            });

            it("should emit equality with === for primitives", () => {
                const ctx = createTestContext();
                expect(emitExpr(binOp("Equal", intLit(1), intLit(2)), ctx)).toBe("1 === 2");
                expect(emitExpr(binOp("NotEqual", intLit(1), intLit(2)), ctx)).toBe("1 !== 2");
            });

            it("should emit logical operators", () => {
                const ctx = createTestContext();
                expect(emitExpr(binOp("LogicalAnd", boolLit(true), boolLit(false)), ctx)).toBe("true && false");
                expect(emitExpr(binOp("LogicalOr", boolLit(true), boolLit(false)), ctx)).toBe("true || false");
            });

            it("should emit string concatenation", () => {
                const ctx = createTestContext();
                expect(emitExpr(binOp("Concat", stringLit("hello"), stringLit("world")), ctx)).toBe(
                    '"hello" + "world"',
                );
            });

            it("should throw on unlowered Divide operator", () => {
                const ctx = createTestContext();
                expect(() => emitExpr(binOp("Divide", intLit(1), intLit(2)), ctx)).toThrow(
                    "Internal error: Unlowered Divide operator reached codegen",
                );
            });
        });

        describe("Unary operators", () => {
            it("should emit negation", () => {
                const ctx = createTestContext();
                expect(emitExpr(unaryOp("Negate", intLit(5)), ctx)).toBe("-5");
            });

            it("should emit logical not", () => {
                const ctx = createTestContext();
                expect(emitExpr(unaryOp("LogicalNot", boolLit(true)), ctx)).toBe("!true");
            });

            it("should emit deref as .$value", () => {
                const ctx = createTestContext();
                expect(emitExpr(unaryOp("Deref", varRef("x")), ctx)).toBe("x.$value");
                expect(ctx.needsRefHelper).toBe(true);
            });
        });

        describe("Precedence and parenthesization", () => {
            it("should parenthesize lower precedence in higher precedence context", () => {
                const ctx = createTestContext();
                // (1 + 2) * 3 - the + has lower precedence than *
                const add = binOp("Add", intLit(1), intLit(2));
                const mult = binOp("Multiply", add, intLit(3));
                expect(emitExpr(mult, ctx)).toBe("(1 + 2) * 3");
            });

            it("should not parenthesize higher precedence in lower precedence context", () => {
                const ctx = createTestContext();
                // 1 + 2 * 3 - the * has higher precedence than +
                const mult = binOp("Multiply", intLit(2), intLit(3));
                const add = binOp("Add", intLit(1), mult);
                expect(emitExpr(add, ctx)).toBe("1 + 2 * 3");
            });

            it("should handle nested expressions", () => {
                const ctx = createTestContext();
                // (1 + 2) * (3 + 4)
                const left = binOp("Add", intLit(1), intLit(2));
                const right = binOp("Add", intLit(3), intLit(4));
                const mult = binOp("Multiply", left, right);
                expect(emitExpr(mult, ctx)).toBe("(1 + 2) * (3 + 4)");
            });
        });
    });

    describe("Functions", () => {
        it("should emit simple lambda", () => {
            const ctx = createTestContext();
            const expr = lambda(varPat("x"), varRef("x"));
            expect(emitExpr(expr, ctx)).toBe("(x) => x");
        });

        it("should emit function application", () => {
            const ctx = createTestContext();
            const expr = app(varRef("f"), intLit(42));
            expect(emitExpr(expr, ctx)).toBe("f(42)");
        });

        it("should emit curried application", () => {
            const ctx = createTestContext();
            // f(1)(2)
            const inner = app(varRef("f"), intLit(1));
            const outer = app(inner, intLit(2));
            expect(emitExpr(outer, ctx)).toBe("f(1)(2)");
        });

        it("should emit nested lambdas (curried function)", () => {
            const ctx = createTestContext();
            // (x) => (y) => x + y
            const body = binOp("Add", varRef("x"), varRef("y"));
            const inner = lambda(varPat("y"), body);
            const outer = lambda(varPat("x"), inner);
            expect(emitExpr(outer, ctx)).toBe("(x) => (y) => x + y");
        });
    });

    describe("Tuples", () => {
        it("should emit empty tuple as empty array", () => {
            const ctx = createTestContext();
            expect(emitExpr(tuple([]), ctx)).toBe("[]");
        });

        it("should emit tuple as array", () => {
            const ctx = createTestContext();
            expect(emitExpr(tuple([intLit(1), intLit(2), intLit(3)]), ctx)).toBe("[1, 2, 3]");
        });

        it("should emit mixed tuple", () => {
            const ctx = createTestContext();
            expect(emitExpr(tuple([intLit(1), stringLit("hello"), boolLit(true)]), ctx)).toBe('[1, "hello", true]');
        });
    });

    describe("Match expressions", () => {
        it("should emit match with wildcard pattern", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("x"), [{ pattern: wildcardPat(), body: intLit(42) }]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain("const $match = x;");
            expect(result).toContain("return 42;");
            // Wildcard has no condition, so no if statement
            expect(result).not.toContain("if");
        });

        it("should emit match with variable pattern", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("x"), [{ pattern: varPat("y"), body: varRef("y") }]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain("const $match = x;");
            expect(result).toContain("const y = $match;");
            expect(result).toContain("return y;");
        });

        it("should emit match with literal pattern", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("x"), [
                { pattern: literalPat(1), body: stringLit("one") },
                { pattern: wildcardPat(), body: stringLit("other") },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain('if ($match === 1) { return "one"; }');
            expect(result).toContain('return "other";');
        });

        it("should emit match with guard", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("x"), [
                {
                    pattern: varPat("n"),
                    guard: binOp("GreaterThan", varRef("n"), intLit(0)),
                    body: stringLit("positive"),
                },
                { pattern: wildcardPat(), body: stringLit("non-positive") },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain("const n = $match;");
            expect(result).toContain("n > 0");
            expect(result).toContain('return "positive";');
        });

        it("should emit match with tuple pattern", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("pair"), [
                { pattern: tuplePat([varPat("a"), varPat("b")]), body: binOp("Add", varRef("a"), varRef("b")) },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain("Array.isArray($match)");
            expect(result).toContain("$match.length === 2");
            expect(result).toContain("const a = $match[0];");
            expect(result).toContain("const b = $match[1];");
        });

        it("should emit match with variant pattern", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("opt"), [
                { pattern: variantPat("Some", [varPat("x")]), body: varRef("x") },
                { pattern: variantPat("None", []), body: intLit(0) },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain('$match.$tag === "Some"');
            expect(result).toContain("const x = $match.$0;");
            expect(result).toContain('$match.$tag === "None"');
        });

        it("should emit exhaustiveness fallback when needed", () => {
            const ctx = createTestContext();
            // Match that doesn't have an unconditional final case
            const expr = matchExpr(varRef("x"), [
                { pattern: literalPat(1), body: stringLit("one") },
                { pattern: literalPat(2), body: stringLit("two") },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain('throw new Error("Match exhausted")');
        });

        it("should not emit fallback after unconditional match", () => {
            const ctx = createTestContext();
            const expr = matchExpr(varRef("x"), [
                { pattern: literalPat(1), body: stringLit("one") },
                { pattern: wildcardPat(), body: stringLit("other") },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).not.toContain('throw new Error("Match exhausted")');
        });

        it("should emit match with nested patterns", () => {
            const ctx = createTestContext();
            // match opt with
            // | Some((a, b)) -> a + b
            // | None -> 0
            const expr = matchExpr(varRef("opt"), [
                {
                    pattern: variantPat("Some", [tuplePat([varPat("a"), varPat("b")])]),
                    body: binOp("Add", varRef("a"), varRef("b")),
                },
                { pattern: variantPat("None", []), body: intLit(0) },
            ]);
            const result = emitExpr(expr, ctx);
            expect(result).toContain('$match.$tag === "Some"');
            expect(result).toContain("Array.isArray($match.$0)");
            expect(result).toContain("const a = $match.$0[0];");
            expect(result).toContain("const b = $match.$0[1];");
        });
    });

    describe("Let expressions", () => {
        it("should emit simple let expression as IIFE", () => {
            const ctx = createTestContext();
            // let x = 5 in x + 1
            const expr = letExpr(varPat("x"), intLit(5), binOp("Add", varRef("x"), intLit(1)));
            const result = emitExpr(expr, ctx);
            expect(result).toBe("(() => { const x = 5; return x + 1; })()");
        });

        it("should emit let with pattern destructuring", () => {
            const ctx = createTestContext();
            // let (a, b) = pair in a + b
            const expr = letExpr(
                tuplePat([varPat("a"), varPat("b")]),
                varRef("pair"),
                binOp("Add", varRef("a"), varRef("b")),
            );
            const result = emitExpr(expr, ctx);
            expect(result).toBe("(() => { const [a, b] = pair; return a + b; })()");
        });

        it("should emit recursive let with let keyword", () => {
            const ctx = createTestContext();
            // let rec f = (n) => if n == 0 then 1 else n * f(n-1) in f(5)
            const expr = letExpr(
                varPat("f"),
                lambda(varPat("n"), varRef("n")), // simplified body
                app(varRef("f"), intLit(5)),
                { recursive: true },
            );
            const result = emitExpr(expr, ctx);
            expect(result).toContain("let f =");
            expect(result).toContain("return f(5);");
        });

        it("should emit mutable let with ref wrapper", () => {
            const ctx = createTestContext();
            // let mutable x = 5 in x
            const expr = letExpr(varPat("x"), intLit(5), varRef("x"), { mutable: true });
            const result = emitExpr(expr, ctx);
            expect(result).toBe("(() => { const x = { $value: 5 }; return x; })()");
            expect(ctx.needsRefHelper).toBe(true);
        });

        it("should emit nested let expressions", () => {
            const ctx = createTestContext();
            // let x = 1 in let y = 2 in x + y
            const innerLet = letExpr(varPat("y"), intLit(2), binOp("Add", varRef("x"), varRef("y")));
            const expr = letExpr(varPat("x"), intLit(1), innerLet);
            const result = emitExpr(expr, ctx);
            expect(result).toContain("const x = 1");
            expect(result).toContain("const y = 2");
            expect(result).toContain("x + y");
        });
    });

    describe("Let rec expressions (mutual recursion)", () => {
        it("should emit mutually recursive bindings with let declarations", () => {
            const ctx = createTestContext();
            // let rec isEven = (n) => ... and isOdd = (n) => ... in isEven(10)
            const expr = letRecExpr(
                [
                    { pattern: varPat("isEven"), value: lambda(varPat("n"), varRef("n")) },
                    { pattern: varPat("isOdd"), value: lambda(varPat("n"), varRef("n")) },
                ],
                app(varRef("isEven"), intLit(10)),
            );
            const result = emitExpr(expr, ctx);
            expect(result).toContain("let isEven, isOdd;");
            expect(result).toContain("isEven = (n) => n");
            expect(result).toContain("isOdd = (n) => n");
            expect(result).toContain("return isEven(10);");
        });

        it("should handle mutable bindings in let rec", () => {
            const ctx = createTestContext();
            const expr = letRecExpr(
                [{ pattern: varPat("counter"), value: intLit(0), mutable: true }],
                varRef("counter"),
            );
            const result = emitExpr(expr, ctx);
            expect(result).toContain("{ $value: 0 }");
            expect(ctx.needsRefHelper).toBe(true);
        });
    });

    describe("Records", () => {
        it("should emit empty record", () => {
            const ctx = createTestContext();
            expect(emitExpr(record([]), ctx)).toBe("{  }");
        });

        it("should emit simple record", () => {
            const ctx = createTestContext();
            const expr = record([
                { name: "x", value: intLit(1) },
                { name: "y", value: intLit(2) },
            ]);
            expect(emitExpr(expr, ctx)).toBe("{ x: 1, y: 2 }");
        });

        it("should emit record with complex values", () => {
            const ctx = createTestContext();
            const expr = record([
                { name: "name", value: stringLit("Alice") },
                { name: "age", value: intLit(30) },
                { name: "active", value: boolLit(true) },
            ]);
            expect(emitExpr(expr, ctx)).toBe('{ name: "Alice", age: 30, active: true }');
        });

        it("should emit record with spread", () => {
            const ctx = createTestContext();
            const expr = recordWithSpread(varRef("base"), [{ name: "x", value: intLit(10) }]);
            expect(emitExpr(expr, ctx)).toBe("{ ...base, x: 10 }");
        });

        it("should emit record access", () => {
            const ctx = createTestContext();
            expect(emitExpr(recordAccess(varRef("person"), "name"), ctx)).toBe("person.name");
        });

        it("should emit nested record access", () => {
            const ctx = createTestContext();
            const expr = recordAccess(recordAccess(varRef("user"), "profile"), "email");
            expect(emitExpr(expr, ctx)).toBe("user.profile.email");
        });

        it("should emit record update", () => {
            const ctx = createTestContext();
            const expr = recordUpdate(varRef("person"), [{ name: "age", value: intLit(31) }]);
            expect(emitExpr(expr, ctx)).toBe("{ ...person, age: 31 }");
        });

        it("should emit record update with multiple fields", () => {
            const ctx = createTestContext();
            const expr = recordUpdate(varRef("person"), [
                { name: "age", value: intLit(31) },
                { name: "active", value: boolLit(false) },
            ]);
            expect(emitExpr(expr, ctx)).toBe("{ ...person, age: 31, active: false }");
        });

        it("should emit record update with complex base expression", () => {
            const ctx = createTestContext();
            const expr = recordUpdate(recordAccess(varRef("users"), "first"), [
                { name: "name", value: stringLit("Bob") },
            ]);
            expect(emitExpr(expr, ctx)).toBe('{ ...users.first, name: "Bob" }');
        });
    });

    describe("Variants", () => {
        it("should emit zero-arg variant constructor", () => {
            const ctx = createTestContext();
            expect(emitExpr(variant("None", []), ctx)).toBe('{ $tag: "None" }');
        });

        it("should emit single-arg variant constructor", () => {
            const ctx = createTestContext();
            const expr = variant("Some", [intLit(42)]);
            expect(emitExpr(expr, ctx)).toBe('{ $tag: "Some", $0: 42 }');
        });

        it("should emit multi-arg variant constructor", () => {
            const ctx = createTestContext();
            const expr = variant("Node", [varRef("left"), intLit(5), varRef("right")]);
            expect(emitExpr(expr, ctx)).toBe('{ $tag: "Node", $0: left, $1: 5, $2: right }');
        });

        it("should emit variant with complex arguments", () => {
            const ctx = createTestContext();
            const expr = variant("Pair", [tuple([intLit(1), intLit(2)]), record([{ name: "x", value: intLit(3) }])]);
            expect(emitExpr(expr, ctx)).toBe('{ $tag: "Pair", $0: [1, 2], $1: { x: 3 } }');
        });

        it("should emit nested variants", () => {
            const ctx = createTestContext();
            // Some(Some(42))
            const inner = variant("Some", [intLit(42)]);
            const outer = variant("Some", [inner]);
            expect(emitExpr(outer, ctx)).toBe('{ $tag: "Some", $0: { $tag: "Some", $0: 42 } }');
        });

        it("should emit variant inside record", () => {
            const ctx = createTestContext();
            const expr = record([
                { name: "value", value: variant("Some", [intLit(10)]) },
                { name: "next", value: variant("None", []) },
            ]);
            expect(emitExpr(expr, ctx)).toBe('{ value: { $tag: "Some", $0: 10 }, next: { $tag: "None" } }');
        });
    });

    describe("Type annotations and unsafe", () => {
        it("should pass through type annotation", () => {
            const ctx = createTestContext();
            const expr = {
                kind: "CoreTypeAnnotation" as const,
                expr: intLit(42),
                typeExpr: {
                    kind: "CoreTypeConst" as const,
                    name: "Int",
                    loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            };
            expect(emitExpr(expr, ctx)).toBe("42");
        });

        it("should pass through unsafe block", () => {
            const ctx = createTestContext();
            const expr = {
                kind: "CoreUnsafe" as const,
                expr: varRef("dangerousValue"),
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            };
            expect(emitExpr(expr, ctx)).toBe("dangerousValue");
        });

        it("should pass through nested annotations", () => {
            const ctx = createTestContext();
            const inner = {
                kind: "CoreTypeAnnotation" as const,
                expr: intLit(5),
                typeExpr: {
                    kind: "CoreTypeConst" as const,
                    name: "Int",
                    loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            };
            const outer = {
                kind: "CoreUnsafe" as const,
                expr: inner,
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            };
            expect(emitExpr(outer, ctx)).toBe("5");
        });
    });
});

describe("escapeString", () => {
    it("should escape all control characters", () => {
        expect(escapeString("\b")).toBe("\\b");
        expect(escapeString("\f")).toBe("\\f");
        expect(escapeString("\v")).toBe("\\v");
    });

    it("should handle mixed content", () => {
        expect(escapeString('hello\nworld\t"test"')).toBe('hello\\nworld\\t\\"test\\"');
    });

    it("should preserve normal characters", () => {
        expect(escapeString("Hello, World!")).toBe("Hello, World!");
        expect(escapeString("abc123")).toBe("abc123");
    });

    it("should handle Unicode correctly", () => {
        // BMP characters should pass through unchanged
        expect(escapeString("café")).toBe("café");
        expect(escapeString("日本語")).toBe("日本語");
        expect(escapeString("Ελληνικά")).toBe("Ελληνικά");
        // Non-BMP emoji should also pass through
        expect(escapeString("😀")).toBe("😀");
        expect(escapeString("hello 🎉 world")).toBe("hello 🎉 world");
        // But line separators must be escaped
        expect(escapeString("\u2028")).toBe("\\u2028");
        expect(escapeString("\u2029")).toBe("\\u2029");
    });
});
