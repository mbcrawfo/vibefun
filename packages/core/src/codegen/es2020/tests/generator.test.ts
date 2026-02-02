/**
 * Tests for the ES2020 generator integration
 */

import type { TypedModule } from "../../../typechecker/typechecker.js";
import type { CoreDeclaration, CoreImportDecl, CoreModule } from "../../../types/core-ast.js";
import type { Type } from "../../../types/environment.js";

import { describe, expect, it } from "vitest";

import { emptyEnv } from "../../../types/environment.js";
import { generate } from "../generator.js";
import {
    binOp,
    externalDecl,
    importDecl,
    importItem,
    intLit,
    lambda,
    letDecl,
    letRecGroup,
    record,
    tuplePat,
    variantTypeDecl,
    varPat,
    varRef,
} from "./test-helpers.js";

/**
 * Helper to create a TypedModule for testing
 */
function createTypedModule(
    declarations: CoreDeclaration[],
    imports: CoreImportDecl[] = [],
    declarationTypes: Map<string, Type> = new Map(),
): TypedModule {
    const module: CoreModule = {
        imports,
        declarations,
        loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
    };

    return {
        module,
        env: emptyEnv(),
        declarationTypes,
    };
}

describe("ES2020 Generator", () => {
    describe("generate()", () => {
        it("should generate header comment with filename", () => {
            const typedModule = createTypedModule([]);
            const { code } = generate(typedModule, { filename: "example.vf" });

            expect(code).toContain("// Vibefun compiled output");
            expect(code).toContain("// Source: example.vf");
            expect(code).toContain("// Target: ES2020");
        });

        it("should use 'unknown' as default filename", () => {
            const typedModule = createTypedModule([]);
            const { code } = generate(typedModule);

            expect(code).toContain("// Source: unknown");
        });

        it("should generate empty export for empty module", () => {
            const typedModule = createTypedModule([]);
            const { code } = generate(typedModule);

            expect(code).toContain("export {};");
        });
    });

    describe("declaration emission", () => {
        it("should emit let declaration", () => {
            const decl = letDecl(varPat("x"), intLit(42));
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("const x = 42;");
        });

        it("should emit exported declarations in export statement", () => {
            const decl = letDecl(varPat("add"), lambda(varPat("x"), varRef("x")), { exported: true });
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("const add = (x) => x;");
            expect(code).toContain("export { add };");
        });

        it("should emit multiple exports sorted alphabetically", () => {
            const decl1 = letDecl(varPat("zebra"), intLit(1), { exported: true });
            const decl2 = letDecl(varPat("alpha"), intLit(2), { exported: true });
            const typedModule = createTypedModule([decl1, decl2]);
            const { code } = generate(typedModule);

            expect(code).toContain("export { alpha, zebra };");
        });

        it("should emit variant constructors from type declarations", () => {
            const decl = variantTypeDecl(
                "Option",
                [
                    { name: "None", argCount: 0 },
                    { name: "Some", argCount: 1 },
                ],
                { exported: true },
            );
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain('const None = { $tag: "None" };');
            expect(code).toContain('const Some = ($$0) => ({ $tag: "Some", $0: $$0 });');
            expect(code).toContain("export { None, Some };");
        });

        it("should emit let rec group with forward references", () => {
            const decl = letRecGroup(
                [
                    { pattern: varPat("f"), value: lambda(varPat("x"), varRef("g")) },
                    { pattern: varPat("g"), value: lambda(varPat("x"), varRef("f")) },
                ],
                true,
            );
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("let f, g;");
            expect(code).toContain("f = (x) => g;");
            expect(code).toContain("g = (x) => f;");
        });
    });

    describe("import emission", () => {
        it("should emit vibefun import as ES module import", () => {
            const imp = importDecl("./utils", [importItem("helper")]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { helper } from "./utils.js";');
        });

        it("should emit import with alias", () => {
            const imp = importDecl("./utils", [importItem("helper", { alias: "h" })]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { helper as h } from "./utils.js";');
        });

        it("should filter out type-only imports", () => {
            const imp = importDecl("./types", [
                importItem("SomeType", { isType: true }),
                importItem("someValue"),
            ]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { someValue } from "./types.js";');
            expect(code).not.toContain("SomeType");
        });

        it("should emit nothing for all type-only imports", () => {
            const imp = importDecl("./types", [
                importItem("TypeA", { isType: true }),
                importItem("TypeB", { isType: true }),
            ]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).not.toContain("import {");
            expect(code).not.toContain("./types");
        });

        it("should not add .js to package imports", () => {
            const imp = importDecl("lodash", [importItem("map")]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { map } from "lodash";');
            expect(code).not.toContain("lodash.js");
        });

        it("should not add .js to scoped package imports", () => {
            const imp = importDecl("@vibefun/std", [importItem("List")]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { List } from "@vibefun/std";');
        });

        it("should add .js to relative imports", () => {
            const imp = importDecl("../lib/utils", [importItem("helper")]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { helper } from "../lib/utils.js";');
        });

        it("should deduplicate imports from same module", () => {
            const imp1 = importDecl("./utils", [importItem("a")]) as CoreImportDecl;
            const imp2 = importDecl("./utils", [importItem("b")]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp1, imp2]);
            const { code } = generate(typedModule);

            // Should have single import with both items
            expect(code).toContain('import { a, b } from "./utils.js";');
        });

        it("should merge type+value import to value import", () => {
            const imp1 = importDecl("./module", [importItem("Thing", { isType: true })]) as CoreImportDecl;
            const imp2 = importDecl("./module", [importItem("Thing")]) as CoreImportDecl;
            const typedModule = createTypedModule([], [imp1, imp2]);
            const { code } = generate(typedModule);

            // Should emit as value import (once)
            expect(code).toContain('import { Thing } from "./module.js";');
            // Should not have duplicate
            expect(code.match(/import \{.*Thing/g)?.length).toBe(1);
        });
    });

    describe("external declaration imports", () => {
        it("should generate import from external with from clause", () => {
            const decl = externalDecl("log", "console.log", { from: "node:console" });
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain('import { console } from "node:console";');
        });

        it("should emit binding for external with different jsName", () => {
            const decl = externalDecl("floor", "Math.floor");
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("const floor = Math.floor;");
        });

        it("should not emit binding when vfName equals jsName", () => {
            const decl = externalDecl("console", "console");
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            // Should not have "const console = console;"
            expect(code).not.toContain("const console = console;");
        });
    });

    describe("runtime helpers", () => {
        it("should not emit ref helper when not needed", () => {
            const decl = letDecl(varPat("x"), intLit(42));
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).not.toContain("const ref =");
        });

        it("should emit ref helper when mutable binding is used", () => {
            const decl = letDecl(varPat("x"), intLit(42), { mutable: true });
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("const ref = ($value) => ({ $value });");
        });

        it("should emit $eq helper when structural equality is used on records", () => {
            // Use record literal comparison to trigger $eq
            // Record literals are always detected as composite types
            const decl = letDecl(
                varPat("result"),
                binOp("Equal", record([{ name: "x", value: intLit(1) }]), record([{ name: "x", value: intLit(2) }])),
            );
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("const $eq = (a, b) => {");
            expect(code).toContain("$eq({ x: 1 }, { x: 2 })");
        });

        it("should not emit $eq helper for primitive equality", () => {
            // Int literals are primitive, should use ===
            const decl = letDecl(varPat("result"), binOp("Equal", intLit(1), intLit(2)));
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("1 === 2");
            expect(code).not.toContain("const $eq =");
        });
    });

    describe("export handling", () => {
        it("should collect exports from pattern destructuring", () => {
            const decl = letDecl(tuplePat([varPat("a"), varPat("b")]), varRef("tuple"), { exported: true });
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).toContain("export { a, b };");
        });

        it("should not export non-exported declarations", () => {
            const decl = letDecl(varPat("internal"), intLit(42), { exported: false });
            const typedModule = createTypedModule([decl]);
            const { code } = generate(typedModule);

            expect(code).not.toContain("export { internal");
            expect(code).toContain("export {};");
        });
    });

    describe("code ordering", () => {
        it("should emit in correct order: header, imports, helpers, declarations, exports", () => {
            const imp = importDecl("./utils", [importItem("helper")]) as CoreImportDecl;
            const decl1 = letDecl(varPat("x"), intLit(42), { mutable: true, exported: true });
            const decl2 = letDecl(varPat("y"), intLit(1), { exported: true });
            const typedModule = createTypedModule([decl1, decl2], [imp]);
            const { code } = generate(typedModule);

            const headerIndex = code.indexOf("// Vibefun compiled output");
            const importIndex = code.indexOf("import {");
            const helperIndex = code.indexOf("const ref =");
            const declIndex = code.indexOf("const x =");
            const exportIndex = code.indexOf("export {");

            expect(headerIndex).toBeLessThan(importIndex);
            expect(importIndex).toBeLessThan(helperIndex);
            expect(helperIndex).toBeLessThan(declIndex);
            expect(declIndex).toBeLessThan(exportIndex);
        });
    });
});
