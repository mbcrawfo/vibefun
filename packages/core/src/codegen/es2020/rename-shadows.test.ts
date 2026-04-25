/**
 * Tests for the top-level shadow renaming pass.
 *
 * The pass detects same-name `let pattern = …` bindings at module scope
 * and α-renames the later occurrences. Spec reference:
 * docs/spec/04-expressions/functions-composition.md:152-163.
 */

import type { CoreModule } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { renameTopLevelShadows } from "./rename-shadows.js";

const loc = { file: "test.vf", line: 1, column: 1, offset: 0 };

const intLit = (value: number): { kind: "CoreIntLit"; value: number; loc: typeof loc } => ({
    kind: "CoreIntLit",
    value,
    loc,
});

const varRef = (name: string): { kind: "CoreVar"; name: string; loc: typeof loc } => ({
    kind: "CoreVar",
    name,
    loc,
});

function makeModule(declarations: CoreModule["declarations"]): CoreModule {
    return {
        imports: [],
        declarations,
        loc,
    };
}

describe("renameTopLevelShadows", () => {
    it("renames the second of two same-name top-level let bindings", () => {
        const module = makeModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(2),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed, exportAliases } = renameTopLevelShadows(module);

        expect(renamed.declarations).toHaveLength(2);
        const first = renamed.declarations[0];
        const second = renamed.declarations[1];
        if (first?.kind !== "CoreLetDecl" || second?.kind !== "CoreLetDecl") {
            throw new Error("Expected two CoreLetDecls");
        }
        expect(first.pattern.kind === "CoreVarPattern" && first.pattern.name).toBe("x");
        expect(second.pattern.kind === "CoreVarPattern" && second.pattern.name).toBe("x$1");
        expect(exportAliases.size).toBe(0);
    });

    it("rewrites references in subsequent declarations to the renamed binding", () => {
        const module = makeModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(2),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "y", loc },
                value: varRef("x"),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);

        const yDecl = renamed.declarations[2];
        if (yDecl?.kind !== "CoreLetDecl") throw new Error("Expected CoreLetDecl");
        expect(yDecl.value.kind).toBe("CoreVar");
        if (yDecl.value.kind !== "CoreVar") return;
        expect(yDecl.value.name).toBe("x$1");
    });

    it("does NOT rewrite references inside earlier declarations (closures observe the original binding)", () => {
        // let x = 1;
        // let f = (() => x);   // closes over x = 1
        // let x = 2;
        const module = makeModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "f", loc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "_", loc },
                    body: varRef("x"),
                    loc,
                },
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(2),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);

        const fDecl = renamed.declarations[1];
        if (fDecl?.kind !== "CoreLetDecl" || fDecl.value.kind !== "CoreLambda") {
            throw new Error("Expected let f = lambda");
        }
        // f's body should still reference the un-renamed x — closure semantics.
        expect(fDecl.value.body.kind).toBe("CoreVar");
        if (fDecl.value.body.kind !== "CoreVar") return;
        expect(fDecl.value.body.name).toBe("x");
    });

    it("respects local rebindings inside subsequent declarations (lambda params)", () => {
        // let x = 1;
        // let x = 2;
        // let f = ((x) => x);   // x here is the lambda param, not the renamed binding
        const module = makeModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(2),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "f", loc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc },
                    body: varRef("x"),
                    loc,
                },
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);

        const fDecl = renamed.declarations[2];
        if (fDecl?.kind !== "CoreLetDecl" || fDecl.value.kind !== "CoreLambda") {
            throw new Error("Expected let f = lambda");
        }
        // The lambda's `x` param shadows the renamed top-level `x$1`, so the
        // body's `x` reference must remain `x` (the param), not `x$1`.
        expect(fDecl.value.body.kind).toBe("CoreVar");
        if (fDecl.value.body.kind !== "CoreVar") return;
        expect(fDecl.value.body.name).toBe("x");
    });

    it("records export aliases when a shadowed declaration is exported", () => {
        const module = makeModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(2),
                mutable: false,
                recursive: false,
                exported: true,
                loc,
            },
        ]);

        const { exportAliases } = renameTopLevelShadows(module);
        expect(exportAliases.get("x")).toBe("x$1");
    });

    it("leaves modules without shadowing unchanged", () => {
        const module = makeModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "y", loc },
                value: varRef("x"),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed, exportAliases } = renameTopLevelShadows(module);
        expect(exportAliases.size).toBe(0);
        const yDecl = renamed.declarations[1];
        if (yDecl?.kind !== "CoreLetDecl") throw new Error("Expected CoreLetDecl");
        if (yDecl.value.kind !== "CoreVar") return;
        expect(yDecl.value.name).toBe("x");
    });
});
