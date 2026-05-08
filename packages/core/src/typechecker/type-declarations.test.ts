/**
 * Unit tests for user-defined type declaration registration.
 *
 * Verifies that the typechecker's first-pass `registerTypeDeclarations`
 * populates `env.types` and (for variants) `env.values` in the shape
 * downstream inference expects.
 */

import { describe, expect, it } from "vitest";

import { desugarModule } from "../desugarer/index.js";
import { VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { typeCheck } from "./typechecker.js";
import { primitiveTypes } from "./types.js";

function typeCheckSource(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const module = parser.parse();
    const core = desugarModule(module);
    return typeCheck(core);
}

function expectDiagnosticCode(source: string, expectedCode: string): void {
    try {
        typeCheckSource(source);
        throw new Error("Expected type checking to throw");
    } catch (error: unknown) {
        expect(error).toBeInstanceOf(VibefunDiagnostic);
        expect((error as VibefunDiagnostic).code).toBe(expectedCode);
    }
}

describe("registerTypeDeclarations — variant types", () => {
    it("registers a non-generic variant type and its nullary constructors", () => {
        const { env } = typeCheckSource(`type Color = Red | Green | Blue;`);

        const typeBinding = env.types.get("Color");
        expect(typeBinding?.kind).toBe("Variant");

        for (const ctor of ["Red", "Green", "Blue"]) {
            const binding = env.values.get(ctor);
            expect(binding?.kind).toBe("Value");
            if (binding?.kind !== "Value") continue;
            // Nullary constructors of a non-generic variant are plain values
            // of the variant type (here `Color`), not zero-arg functions.
            const type = binding.scheme.type;
            expect(type.type).toBe("Const");
            if (type.type === "Const") {
                expect(type.name).toBe("Color");
            }
        }
    });

    it("registers a generic variant with argful constructors", () => {
        const { env } = typeCheckSource(`type Tree<T> = Leaf | Node(T, Tree<T>, Tree<T>);`);

        const typeBinding = env.types.get("Tree");
        expect(typeBinding?.kind).toBe("Variant");
        expect(typeBinding?.kind === "Variant" && typeBinding.params).toEqual(["T"]);

        // Leaf — nullary, should be App(Const("Tree"), [T])
        const leaf = env.values.get("Leaf");
        expect(leaf?.kind).toBe("Value");
        if (leaf?.kind === "Value") {
            const leafType = leaf.scheme.type;
            expect(leafType.type).toBe("App");
            if (leafType.type === "App") {
                expect(leafType.constructor).toEqual({ type: "Const", name: "Tree" });
                expect(leafType.args).toHaveLength(1);
            }
        }

        // Node — curried 3-arg constructor:
        //   (T) -> ((Tree<T>) -> ((Tree<T>) -> Tree<T>))
        // Each layer is a single-param function so the desugared
        // single-arg CoreApps can unify against it.
        const node = env.values.get("Node");
        expect(node?.kind).toBe("Value");
        if (node?.kind === "Value") {
            let cur = node.scheme.type;
            for (let i = 0; i < 3; i++) {
                expect(cur.type).toBe("Fun");
                if (cur.type !== "Fun") return;
                expect(cur.params).toHaveLength(1);
                cur = cur.return;
            }
            expect(cur.type).toBe("App");
            if (cur.type === "App") {
                expect(cur.constructor).toEqual({ type: "Const", name: "Tree" });
            }
        }
    });

    it("lets a user redefine Option/Result without shadow conflicts", () => {
        // Prior regression: redefining builtin variants produced conflicts
        // after the stdlib spec tests removed test-fixture duplicates.
        const { env } = typeCheckSource(`
            type Option<T> = Some(T) | None;
            type Result<T, E> = Ok(T) | Err(E);
        `);
        expect(env.types.get("Option")?.kind).toBe("Variant");
        expect(env.types.get("Result")?.kind).toBe("Variant");
    });
});

describe("registerTypeDeclarations — type aliases", () => {
    it("registers a non-generic alias and permits unification with the aliased type", () => {
        // `type UserId = Int; let id: UserId = 42;` should typecheck cleanly.
        expect(() =>
            typeCheckSource(`
                type UserId = Int;
                let id: UserId = 42;
            `),
        ).not.toThrow();
    });

    it("rejects an unguardedly recursive alias", () => {
        expectDiagnosticCode(`type Bad = Bad;`, "VF4027");
    });

    it("permits recursion guarded by a variant constructor", () => {
        // type List = Cons(Int, List) | Nil;  — legal, constructors guard the recursion.
        expect(() =>
            typeCheckSource(`
                type MyList = Cons2(Int, MyList) | Nil2;
            `),
        ).not.toThrow();
    });
});

describe("registerTypeDeclarations — generic record types", () => {
    it("registers a generic record and expands it in unification", () => {
        expect(() =>
            typeCheckSource(`
                type Box<T> = { value: T };
                let b: Box<Int> = { value: 42 };
            `),
        ).not.toThrow();
    });
});

describe("registerTypeDeclarations — validation coverage", () => {
    it("accepts an alias whose body loops through a function type (guarded)", () => {
        // Function types are lazy, so recursion through a function arg is guarded.
        expect(() => typeCheckSource(`type Callback = (Int) -> Callback;`)).not.toThrow();
    });

    it("rejects unguarded recursion through a tuple", () => {
        // `type Loop = (Int, Loop);` — tuple types do not introduce a guard.
        expectDiagnosticCode(`type Loop = (Int, Loop);`, "VF4027");
    });

    it("rejects mutual unguarded recursion through an alias chain", () => {
        // type A = B; type B = A; — A eventually refers to itself via B.
        expectDiagnosticCode(
            `
                type A = B;
                type B = A;
            `,
            "VF4027",
        );
    });

    it("allows recursion through a type application whose constructor is a record", () => {
        // `type Pair<A, B>` is a generic record — recursion inside a type
        // application is guarded by the record constructor, so this should
        // not throw.
        expect(() =>
            typeCheckSource(`
                type Pair<A, B> = { first: A, second: B };
                type Recursive = { head: Int, tail: Pair<Int, Recursive> };
            `),
        ).not.toThrow();
    });
});

describe("variant constructor partial application (03b F-09)", () => {
    // Spec ref: docs/spec/03-type-system/variant-types.md:32-42 — multi-arg
    // variant constructors are curried functions whose terminal return is
    // the variant type. Partial application yields a function value.
    it("infers `(Float) -> Shape` for `let f = Rectangle(3.14)` where `Rectangle(Float, Float)` is a 2-arg variant", () => {
        const { declarationTypes } = typeCheckSource(`
            type Shape = Rectangle(Float, Float) | Circle(Float);
            let f = Rectangle(3.14);
        `);

        const fType = declarationTypes.get("f");
        expect(fType).toBeDefined();
        if (!fType) return;

        // After partial application, `f` should still be a function awaiting
        // the second `Float` argument and then producing `Shape`.
        expect(fType.type).toBe("Fun");
        if (fType.type !== "Fun") return;
        expect(fType.params).toHaveLength(1);
        expect(fType.params[0]).toEqual(primitiveTypes.Float);
        expect(fType.return.type).toBe("Const");
        if (fType.return.type === "Const") {
            expect(fType.return.name).toBe("Shape");
        }
    });

    it("typechecks `f(2.0)` as `Shape` after partial application of a 2-arg variant constructor", () => {
        // Applying the partially-applied constructor to its remaining
        // argument yields the variant type itself — this is the round-trip
        // that justifies treating partial variant application as a function.
        const { declarationTypes } = typeCheckSource(`
            type Shape = Rectangle(Float, Float) | Circle(Float);
            let f = Rectangle(3.14);
            let r = f(2.0);
        `);

        const rType = declarationTypes.get("r");
        expect(rType).toBeDefined();
        if (!rType) return;
        expect(rType.type).toBe("Const");
        if (rType.type === "Const") {
            expect(rType.name).toBe("Shape");
        }
    });

    it("rejects partial application with a wrong-typed argument", () => {
        // Rectangle's first parameter is Float; passing an Int must fail
        // unification (no implicit Int↔Float coercion per the spec).
        expectDiagnosticCode(
            `
                type Shape = Rectangle(Float, Float) | Circle(Float);
                let f = Rectangle(1);
            `,
            "VF4020",
        );
    });
});
