/**
 * Integration tests for Package D phase 2.4:
 *
 * - Resolution of `import { X } from "@vibefun/std"`.
 * - `inferRecordAccess` dispatch on first-class Module types.
 * - Ambient-binding pre-seeding of the `__std__` root module.
 */

import type { CoreImportDecl, CoreModule } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { buildEnvironment } from "./environment.js";
import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

function moduleWithImport(items: Array<{ name: string; alias?: string; isType?: boolean }>): CoreModule {
    const importDecl: CoreImportDecl = {
        kind: "CoreImportDecl",
        from: "@vibefun/std",
        items: items.map((i) => ({
            name: i.name,
            ...(i.alias !== undefined && { alias: i.alias }),
            isType: i.isType ?? false,
        })),
        loc: testLoc,
    };
    return { imports: [importDecl], declarations: [], loc: testLoc };
}

describe("buildEnvironment pre-seeds __std__", () => {
    it("binds __std__ as a Module whose exports contain every stdlib module", () => {
        const env = buildEnvironment({ imports: [], declarations: [], loc: testLoc });
        const stdBinding = env.values.get("__std__");
        expect(stdBinding).toBeDefined();
        if (stdBinding?.kind !== "Value") throw new Error("expected Value binding");
        const t = stdBinding.scheme.type;
        expect(t.type).toBe("Module");
        if (t.type !== "Module") return;
        for (const name of ["String", "List", "Option", "Result", "Int", "Float", "Math"]) {
            expect(t.exports.has(name)).toBe(true);
        }
    });
});

describe("CoreImportDecl resolution from @vibefun/std", () => {
    it("binds imported module names as Module-typed values", () => {
        const result = typeCheck(moduleWithImport([{ name: "List" }]));
        const listBinding = result.env.values.get("List");
        expect(listBinding).toBeDefined();
        if (listBinding?.kind !== "Value") throw new Error("expected Value binding");
        const t = listBinding.scheme.type;
        expect(t.type).toBe("Module");
        if (t.type !== "Module") return;
        expect(t.path).toBe("@vibefun/std#List");
        expect(t.exports.has("map")).toBe(true);
    });

    it("honors import aliases", () => {
        const result = typeCheck(moduleWithImport([{ name: "List", alias: "L" }]));
        expect(result.env.values.has("L")).toBe(true);
        // Original name should not have been bound under this module — confirm via no new binding
        // beyond the ambient state would also have it from __std__, not from the import.
        const lBinding = result.env.values.get("L");
        if (lBinding?.kind !== "Value") throw new Error("expected Value");
        expect(lBinding.scheme.type.type).toBe("Module");
    });

    it("throws VF5001 on unknown export names", () => {
        try {
            typeCheck(moduleWithImport([{ name: "NotAModule" }]));
            expect.fail("should have thrown VF5001");
        } catch (err) {
            expect(err).toBeInstanceOf(VibefunDiagnostic);
            expect((err as VibefunDiagnostic).code).toBe("VF5001");
            expect((err as VibefunDiagnostic).message).toContain("NotAModule");
        }
    });

    it("re-binds ambient variant constructors to their existing scheme", () => {
        const result = typeCheck(moduleWithImport([{ name: "Some" }, { name: "None" }]));
        const some = result.env.values.get("Some");
        const none = result.env.values.get("None");
        expect(some).toBeDefined();
        expect(none).toBeDefined();
    });

    it("skips type-only imports (no value binding created)", () => {
        // Re-check a known module name as a type-only import and verify no extra
        // value binding is created under a unique alias.
        const result = typeCheck(moduleWithImport([{ name: "List", alias: "ListTypeOnly", isType: true }]));
        expect(result.env.values.has("ListTypeOnly")).toBe(false);
    });

    it("leaves non-@vibefun/std imports untouched (phase 2.9 terrain)", () => {
        const importDecl: CoreImportDecl = {
            kind: "CoreImportDecl",
            from: "./local",
            items: [{ name: "foo", isType: false }],
            loc: testLoc,
        };
        // Should not throw — user-module imports wired in phase 2.9.
        expect(() => typeCheck({ imports: [importDecl], declarations: [], loc: testLoc })).not.toThrow();
    });
});

describe("inferRecordAccess on Module types", () => {
    it("resolves List.map via an imported List module", () => {
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "m", loc: testLoc },
                value: {
                    kind: "CoreRecordAccess",
                    record: { kind: "CoreVar", name: "List", loc: testLoc },
                    field: "map",
                    loc: testLoc,
                },
                mutable: false,
                exported: false,
                loc: testLoc,
            },
        ]);
        module.imports.push({
            kind: "CoreImportDecl",
            from: "@vibefun/std",
            items: [{ name: "List", isType: false }],
            loc: testLoc,
        });

        const result = typeCheck(module);
        const mType = result.declarationTypes.get("m");
        expect(mType).toBeDefined();
        // List.map : forall 'a 'b. List<'a> -> ('a -> 'b) -> List<'b>
        expect(mType!.type).toBe("Fun");
        if (mType!.type !== "Fun") return;
        expect(mType!.params[0]!.type).toBe("App");
    });

    it("resolves nested __std__.List.concat via ambient __std__", () => {
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                value: {
                    kind: "CoreRecordAccess",
                    record: {
                        kind: "CoreRecordAccess",
                        record: { kind: "CoreVar", name: "__std__", loc: testLoc },
                        field: "List",
                        loc: testLoc,
                    },
                    field: "concat",
                    loc: testLoc,
                },
                mutable: false,
                exported: false,
                loc: testLoc,
            },
        ]);
        const result = typeCheck(module);
        const fType = result.declarationTypes.get("f");
        expect(fType).toBeDefined();
        // concat : forall 'a. List<'a> -> List<'a> -> List<'a>
        expect(fType!.type).toBe("Fun");
    });

    it("throws VF5001 when accessing an unknown field on a Module", () => {
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "bad", loc: testLoc },
                value: {
                    kind: "CoreRecordAccess",
                    record: { kind: "CoreVar", name: "List", loc: testLoc },
                    field: "notAFunction",
                    loc: testLoc,
                },
                mutable: false,
                exported: false,
                loc: testLoc,
            },
        ]);
        module.imports.push({
            kind: "CoreImportDecl",
            from: "@vibefun/std",
            items: [{ name: "List", isType: false }],
            loc: testLoc,
        });

        try {
            typeCheck(module);
            expect.fail("should have thrown VF5001");
        } catch (err) {
            expect(err).toBeInstanceOf(VibefunDiagnostic);
            expect((err as VibefunDiagnostic).code).toBe("VF5001");
            expect((err as VibefunDiagnostic).message).toContain("notAFunction");
        }
    });
});
