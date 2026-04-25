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
        if (yDecl.value.kind !== "CoreVar") {
            throw new Error("Expected y declaration value to be CoreVar");
        }
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
        if (fDecl.value.body.kind !== "CoreVar") {
            throw new Error("Expected lambda body to be CoreVar");
        }
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
        if (fDecl.value.body.kind !== "CoreVar") {
            throw new Error("Expected lambda body to be CoreVar");
        }
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
        if (yDecl.value.kind !== "CoreVar") throw new Error("Expected y declaration value to be CoreVar");
        expect(yDecl.value.name).toBe("x");
    });

    it("rewrites references inside a CoreLetRecGroup binding's value", () => {
        // Verifies the let-rec branch of applyRenamesToDecl: when the
        // pre-pass has already established x → x$1, a subsequent
        // mutually recursive group's binding values must be rewritten
        // to use the renamed binding.
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
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc },
                        value: varRef("x"),
                        mutable: false,
                        loc,
                    },
                ],
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        const recGroup = renamed.declarations[2];
        if (recGroup?.kind !== "CoreLetRecGroup") throw new Error("Expected CoreLetRecGroup");
        const fBinding = recGroup.bindings[0];
        if (fBinding === undefined) throw new Error("Expected first let-rec binding to exist");
        if (fBinding.value.kind !== "CoreVar") throw new Error("Expected let-rec binding value to be CoreVar");
        expect(fBinding.value.name).toBe("x$1");
    });

    it("leaves type/external/external-type/import/re-export decls untouched", () => {
        // The non-value declaration kinds — which can't reference
        // top-level value bindings — pass straight through
        // applyRenamesToDecl unchanged. Cover every branch of the
        // switch (`CoreTypeDecl`, `CoreExternalDecl`,
        // `CoreExternalTypeDecl`, `CoreImportDecl`, `CoreReExportDecl`)
        // so the pass-through paths are all exercised.
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
                kind: "CoreTypeDecl",
                name: "Color",
                params: [],
                definition: {
                    kind: "CoreVariantTypeDef",
                    constructors: [{ name: "Red", args: [], loc }],
                    loc,
                },
                exported: false,
                loc,
            },
            {
                kind: "CoreExternalDecl",
                name: "log",
                typeExpr: { kind: "CoreTypeConst", name: "Unit", loc },
                jsName: "console.log",
                exported: false,
                loc,
            },
            {
                kind: "CoreExternalTypeDecl",
                name: "Buffer",
                typeExpr: { kind: "CoreTypeConst", name: "Unit", loc },
                exported: false,
                loc,
            },
            {
                kind: "CoreImportDecl",
                from: "./other",
                items: [],
                loc,
            },
            {
                kind: "CoreReExportDecl",
                from: "./other",
                items: [{ name: "x", isType: false }],
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        // The first two are the rename-pass's primary subject; the
        // remaining five must come through structurally identical to
        // their input — full deep equality catches field-level
        // regressions in any of the pass-through branches, not just
        // a `kind` mismatch.
        expect(renamed.declarations).toHaveLength(7);
        expect(renamed.declarations.slice(2)).toEqual(module.declarations.slice(2));
    });

    it("renames a CoreLetRecGroup binding that shadows a prior top-level name", () => {
        // Regression: previously the let-rec branch only added names to
        // `seen` without renaming, so `let x = 1; let rec x and y = …`
        // emitted `const x = 1; let x, y;` (illegal duplicate const/let).
        // The fix renames the conflicting binding to `x$1` and rewrites
        // mutually recursive references inside the group.
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
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc },
                        value: varRef("y"),
                        mutable: false,
                        loc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc },
                        value: varRef("x"),
                        mutable: false,
                        loc,
                    },
                ],
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        const group = renamed.declarations[1];
        if (group?.kind !== "CoreLetRecGroup") throw new Error("Expected CoreLetRecGroup");
        const xBinding = group.bindings[0];
        const yBinding = group.bindings[1];
        if (xBinding === undefined || yBinding === undefined) throw new Error("Expected two bindings in let-rec group");
        if (xBinding.pattern.kind !== "CoreVarPattern") throw new Error("Expected x binding pattern to be VarPattern");
        if (yBinding.pattern.kind !== "CoreVarPattern") throw new Error("Expected y binding pattern to be VarPattern");
        // The x in the let-rec group is renamed to x$1 because the
        // top-level `let x = 1` already claimed `x`.
        expect(xBinding.pattern.name).toBe("x$1");
        // y stays as-is (no shadow).
        expect(yBinding.pattern.name).toBe("y");
        // Mutual recursion inside the group must use the renamed name
        // (y references x$1, not the outer x = 1).
        if (yBinding.value.kind !== "CoreVar") throw new Error("Expected y's value to be CoreVar");
        expect(yBinding.value.name).toBe("x$1");
    });

    it("records an export alias when a CoreLetRecGroup binding shadows an exported name", () => {
        // Regression: when an exported let-rec binding shadows a prior
        // top-level name and gets α-renamed, `exportAliases` must map
        // the source name to the renamed binding so the codegen emits
        // `export { x$1 as x }` and the public API stays stable.
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
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc },
                        value: intLit(2),
                        mutable: false,
                        loc,
                    },
                ],
                exported: true,
                loc,
            },
        ]);

        const { exportAliases } = renameTopLevelShadows(module);
        expect(exportAliases.get("x")).toBe("x$1");
    });

    it("rewrites a recursive let's self-reference to the renamed binder, not the prior shadow", () => {
        // Regression: when a recursive `let rec x = … x …` shadows a
        // prior top-level `x`, naively pre-applying the active rename
        // map (`x → x$1`) to the body before discovering that the new
        // declaration *also* binds `x` would point the recursive
        // self-reference at the previous shadow `x$1` instead of the
        // new binder `x$2`. The fix masks the bound name from the
        // pre-pass and substitutes the new alias in afterwards.
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
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "_", loc },
                    body: varRef("x"),
                    loc,
                },
                mutable: false,
                recursive: true,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        const third = renamed.declarations[2];
        if (third?.kind !== "CoreLetDecl" || third.pattern.kind !== "CoreVarPattern") {
            throw new Error("Expected third decl to be CoreLetDecl with VarPattern");
        }
        expect(third.pattern.name).toBe("x$2");
        if (third.value.kind !== "CoreLambda") {
            throw new Error("Expected third decl value to be CoreLambda");
        }
        if (third.value.body.kind !== "CoreVar") {
            throw new Error("Expected lambda body to be CoreVar");
        }
        // The recursive self-reference must point at the new binder
        // (`x$2`), not the prior shadow (`x$1`).
        expect(third.value.body.name).toBe("x$2");
    });

    it("rewrites a let-rec group's body refs to the new binder when shadowing a prior renamed binding", () => {
        // Regression: when a `CoreLetRecGroup` binding's name was
        // already shadowed (so `renames` carried `x → x$1`), pre-
        // applying the rename map would rewrite mutual references like
        // `let rec x = … and y = … x …` so that `y`'s `x` pointed at
        // the prior shadow rather than the new recursive `x` binder.
        // The fix masks the group's bound names from the pre-pass.
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
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc },
                        value: varRef("y"),
                        mutable: false,
                        loc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc },
                        value: varRef("x"),
                        mutable: false,
                        loc,
                    },
                ],
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        const group = renamed.declarations[2];
        if (group?.kind !== "CoreLetRecGroup") {
            throw new Error("Expected CoreLetRecGroup");
        }
        const xBinding = group.bindings[0];
        const yBinding = group.bindings[1];
        if (xBinding === undefined || yBinding === undefined) {
            throw new Error("Expected two bindings in let-rec group");
        }
        if (xBinding.pattern.kind !== "CoreVarPattern" || yBinding.pattern.kind !== "CoreVarPattern") {
            throw new Error("Expected VarPattern bindings");
        }
        // The group's `x` is renamed to `x$2` because the `let x = 1; let x = 2;`
        // pair already produced `x` and `x$1`.
        expect(xBinding.pattern.name).toBe("x$2");
        expect(yBinding.pattern.name).toBe("y");
        // y references the *new* recursive `x`, so it must resolve to
        // `x$2`, not the prior shadow `x$1`.
        if (yBinding.value.kind !== "CoreVar") {
            throw new Error("Expected y's value to be CoreVar");
        }
        expect(yBinding.value.name).toBe("x$2");
    });

    it("renames a CoreLetDecl that shadows a prior CoreExternalDecl name", () => {
        // External declarations also reserve a top-level name in the
        // generated module (they emit `const log = …` from the FFI
        // shim). A subsequent `let log = …` would otherwise produce
        // a duplicate-binding `SyntaxError`.
        const module = makeModule([
            {
                kind: "CoreExternalDecl",
                name: "log",
                typeExpr: { kind: "CoreTypeConst", name: "Unit", loc },
                jsName: "console.log",
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "log", loc },
                value: intLit(1),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        const letDecl = renamed.declarations[1];
        if (letDecl?.kind !== "CoreLetDecl" || letDecl.pattern.kind !== "CoreVarPattern") {
            throw new Error("Expected CoreLetDecl with VarPattern");
        }
        expect(letDecl.pattern.name).toBe("log$1");
    });

    it("avoids colliding with an existing user-bound `x$1` when α-renaming", () => {
        // Regression: bumping the per-source counter without consulting
        // `seen` produced `let x = 1; let x$1 = 2; let x = 3;`
        //   →  `const x = 1; const x$1 = 2; const x$1 = 3;` (duplicate).
        // The pass must skip past `x$1` to a fresh slot like `x$2`.
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
                pattern: { kind: "CoreVarPattern", name: "x$1", loc },
                value: intLit(2),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc },
                value: intLit(3),
                mutable: false,
                recursive: false,
                exported: false,
                loc,
            },
        ]);

        const { module: renamed } = renameTopLevelShadows(module);
        const third = renamed.declarations[2];
        if (third?.kind !== "CoreLetDecl" || third.pattern.kind !== "CoreVarPattern") {
            throw new Error("Expected third decl to be CoreLetDecl with VarPattern");
        }
        // Must not collide with the user-bound `x$1` from decl 2.
        expect(third.pattern.name).not.toBe("x$1");
        expect(third.pattern.name).toBe("x$2");
    });
});
