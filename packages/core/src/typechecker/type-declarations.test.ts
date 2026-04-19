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

function typeCheckSource(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const module = parser.parse();
    const core = desugarModule(module);
    return typeCheck(core);
}

describe("registerTypeDeclarations — variant types", () => {
    it("registers a non-generic variant type and its nullary constructors", () => {
        const { env } = typeCheckSource(`type Color = Red | Green | Blue;`);

        const typeBinding = env.types.get("Color");
        expect(typeBinding?.kind).toBe("Variant");

        for (const ctor of ["Red", "Green", "Blue"]) {
            const binding = env.values.get(ctor);
            expect(binding?.kind).toBe("Value");
            // Nullary constructors are values of the variant type, not Fun
            expect(binding?.kind === "Value" && binding.scheme.type.type === "Const").toBe(true);
        }
    });

    it("registers a generic variant with argful constructors", () => {
        const { env } = typeCheckSource(`type Tree<T> = Leaf | Node(T, Tree<T>, Tree<T>);`);

        const typeBinding = env.types.get("Tree");
        expect(typeBinding?.kind).toBe("Variant");
        expect(typeBinding?.kind === "Variant" && typeBinding.params).toEqual(["T"]);

        const leaf = env.values.get("Leaf");
        // Nullary — should be an App type (Tree<T>)
        expect(leaf?.kind === "Value" && leaf.scheme.type.type === "App").toBe(true);

        const node = env.values.get("Node");
        expect(node?.kind === "Value" && node.scheme.type.type === "Fun").toBe(true);
        if (node?.kind === "Value" && node.scheme.type.type === "Fun") {
            expect(node.scheme.type.params).toHaveLength(3);
        }
    });

    it("lets a user redefine Option/Result without shadow conflicts", () => {
        // Prior regression: redefining builtin variants produced conflicts
        // after spec-validation section 11 removed test-fixture duplicates.
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
        expect(() => typeCheckSource(`type Bad = Bad;`)).toThrow(VibefunDiagnostic);
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
