import type { EmitContext } from "./context.js";

import { describe, expect, it } from "vitest";

import { emitDeclaration, extractPatternNames, setEmitExpr, setEmitPattern } from "./emit-declarations.js";
import { emitExpr, setEmitMatchPattern, setEmitPattern as setExprEmitPattern } from "./emit-expressions.js";
import { emitMatchPattern, emitPattern } from "./emit-patterns.js";
import {
    aliasTypeDecl,
    binOp,
    createTestContext,
    externalDecl,
    externalTypeDecl,
    importDecl,
    importItem,
    intLit,
    lambda,
    letDecl,
    letRecGroup,
    recordPat,
    recordTypeDecl,
    tuplePat,
    variantPat,
    variantTypeDecl,
    varPat,
    varRef,
    wildcardPat,
} from "./test-helpers.js";

// Set up dependencies for expression emission
setExprEmitPattern(emitPattern as (pattern: unknown, ctx: EmitContext) => string);
setEmitMatchPattern(
    emitMatchPattern as (
        pattern: unknown,
        scrutinee: string,
        ctx: EmitContext,
    ) => { condition: string | null; bindings: string[] },
);

// Set up dependencies for declaration emission
setEmitExpr(emitExpr as (expr: unknown, ctx: EmitContext) => string);
setEmitPattern(emitPattern as (pattern: unknown, ctx: EmitContext) => string);

describe("Declaration Emission", () => {
    describe("extractPatternNames", () => {
        it("should extract name from variable pattern", () => {
            expect(extractPatternNames(varPat("x"))).toEqual(["x"]);
        });

        it("should return empty array for wildcard pattern", () => {
            expect(extractPatternNames(wildcardPat())).toEqual([]);
        });

        it("should extract names from tuple pattern", () => {
            const pat = tuplePat([varPat("a"), varPat("b"), varPat("c")]);
            expect(extractPatternNames(pat)).toEqual(["a", "b", "c"]);
        });

        it("should extract names from nested tuple pattern", () => {
            const pat = tuplePat([varPat("a"), tuplePat([varPat("b"), varPat("c")])]);
            expect(extractPatternNames(pat)).toEqual(["a", "b", "c"]);
        });

        it("should extract names from record pattern", () => {
            const pat = recordPat([
                { name: "x", pattern: varPat("a") },
                { name: "y", pattern: varPat("b") },
            ]);
            expect(extractPatternNames(pat)).toEqual(["a", "b"]);
        });

        it("should extract names from variant pattern", () => {
            const pat = variantPat("Some", [varPat("x")]);
            expect(extractPatternNames(pat)).toEqual(["x"]);
        });

        it("should handle mixed patterns with wildcards", () => {
            const pat = tuplePat([varPat("a"), wildcardPat(), varPat("b")]);
            expect(extractPatternNames(pat)).toEqual(["a", "b"]);
        });
    });

    describe("CoreLetDecl", () => {
        it("should emit simple let declaration", () => {
            const ctx = createTestContext();
            const decl = letDecl(varPat("x"), intLit(42));
            expect(emitDeclaration(decl, ctx)).toBe("const x = 42;");
        });

        it("should emit let declaration with expression", () => {
            const ctx = createTestContext();
            const decl = letDecl(varPat("sum"), binOp("Add", intLit(1), intLit(2)));
            expect(emitDeclaration(decl, ctx)).toBe("const sum = 1 + 2;");
        });

        it("should emit let declaration with tuple destructuring", () => {
            const ctx = createTestContext();
            const decl = letDecl(tuplePat([varPat("a"), varPat("b")]), varRef("pair"));
            expect(emitDeclaration(decl, ctx)).toBe("const [a, b] = pair;");
        });

        it("should emit mutable let declaration with ref wrapper", () => {
            const ctx = createTestContext();
            const decl = letDecl(varPat("counter"), intLit(0), { mutable: true });
            expect(emitDeclaration(decl, ctx)).toBe("const counter = { $value: 0 };");
            expect(ctx.needsRefHelper).toBe(true);
        });

        it("should emit recursive let declaration with let + assignment", () => {
            const ctx = createTestContext();
            const decl = letDecl(varPat("f"), lambda(varPat("n"), varRef("n")), { recursive: true });
            const result = emitDeclaration(decl, ctx);
            expect(result).toContain("let f;");
            expect(result).toContain("f = (n) => n;");
        });

        it("should collect export for exported declaration", () => {
            const ctx = createTestContext();
            const decl = letDecl(varPat("x"), intLit(42), { exported: true });
            emitDeclaration(decl, ctx);
            expect(ctx.exportedNames.has("x")).toBe(true);
        });

        it("should collect exports for pattern destructuring", () => {
            const ctx = createTestContext();
            const decl = letDecl(tuplePat([varPat("a"), varPat("b")]), varRef("pair"), { exported: true });
            emitDeclaration(decl, ctx);
            expect(ctx.exportedNames.has("a")).toBe(true);
            expect(ctx.exportedNames.has("b")).toBe(true);
        });

        it("should escape reserved words in patterns", () => {
            const ctx = createTestContext();
            const decl = letDecl(varPat("class"), intLit(1), { exported: true });
            expect(emitDeclaration(decl, ctx)).toBe("const class$ = 1;");
            expect(ctx.exportedNames.has("class$")).toBe(true);
        });
    });

    describe("CoreLetRecGroup", () => {
        it("should emit mutually recursive bindings", () => {
            const ctx = createTestContext();
            const decl = letRecGroup([
                { pattern: varPat("isEven"), value: lambda(varPat("n"), varRef("isOdd")) },
                { pattern: varPat("isOdd"), value: lambda(varPat("n"), varRef("isEven")) },
            ]);
            const result = emitDeclaration(decl, ctx);
            expect(result).toContain("let isEven, isOdd;");
            expect(result).toContain("isEven = (n) => isOdd;");
            expect(result).toContain("isOdd = (n) => isEven;");
        });

        it("should collect exports for let rec group", () => {
            const ctx = createTestContext();
            const decl = letRecGroup(
                [
                    { pattern: varPat("f"), value: lambda(varPat("x"), varRef("x")) },
                    { pattern: varPat("g"), value: lambda(varPat("x"), varRef("x")) },
                ],
                true, // exported
            );
            emitDeclaration(decl, ctx);
            expect(ctx.exportedNames.has("f")).toBe(true);
            expect(ctx.exportedNames.has("g")).toBe(true);
        });

        it("should handle mutable bindings in let rec group", () => {
            const ctx = createTestContext();
            const decl = letRecGroup([{ pattern: varPat("counter"), value: intLit(0), mutable: true }]);
            const result = emitDeclaration(decl, ctx);
            expect(result).toContain("{ $value: 0 }");
            expect(ctx.needsRefHelper).toBe(true);
        });
    });

    describe("CoreTypeDecl", () => {
        it("should emit nothing for alias type", () => {
            const ctx = createTestContext();
            const decl = aliasTypeDecl("UserId");
            expect(emitDeclaration(decl, ctx)).toBe("");
        });

        it("should emit nothing for record type", () => {
            const ctx = createTestContext();
            const decl = recordTypeDecl("Point", ["x", "y"]);
            expect(emitDeclaration(decl, ctx)).toBe("");
        });

        it("should emit zero-arg variant constructor as constant", () => {
            const ctx = createTestContext();
            const decl = variantTypeDecl("Option", [{ name: "None", argCount: 0 }]);
            expect(emitDeclaration(decl, ctx)).toBe('const None = { $tag: "None" };');
        });

        it("should emit single-arg variant constructor as function", () => {
            const ctx = createTestContext();
            const decl = variantTypeDecl("Option", [{ name: "Some", argCount: 1 }]);
            expect(emitDeclaration(decl, ctx)).toBe('const Some = ($$0) => ({ $tag: "Some", $0: $$0 });');
        });

        it("should emit multi-arg variant constructor as curried function", () => {
            const ctx = createTestContext();
            const decl = variantTypeDecl("Tree", [{ name: "Node", argCount: 3 }]);
            expect(emitDeclaration(decl, ctx)).toBe(
                'const Node = ($$0) => ($$1) => ($$2) => ({ $tag: "Node", $0: $$0, $1: $$1, $2: $$2 });',
            );
        });

        it("should emit multiple variant constructors", () => {
            const ctx = createTestContext();
            const decl = variantTypeDecl("Option", [
                { name: "None", argCount: 0 },
                { name: "Some", argCount: 1 },
            ]);
            const result = emitDeclaration(decl, ctx);
            expect(result).toContain('const None = { $tag: "None" };');
            expect(result).toContain('const Some = ($$0) => ({ $tag: "Some", $0: $$0 });');
        });

        it("should collect exports for variant constructors", () => {
            const ctx = createTestContext();
            const decl = variantTypeDecl(
                "Option",
                [
                    { name: "None", argCount: 0 },
                    { name: "Some", argCount: 1 },
                ],
                { exported: true },
            );
            emitDeclaration(decl, ctx);
            expect(ctx.exportedNames.has("None")).toBe(true);
            expect(ctx.exportedNames.has("Some")).toBe(true);
        });

        it("should escape reserved words in constructor names", () => {
            const ctx = createTestContext();
            const decl = variantTypeDecl("Keywords", [{ name: "class", argCount: 0 }]);
            expect(emitDeclaration(decl, ctx)).toBe('const class$ = { $tag: "class" };');
        });
    });

    describe("CoreExternalDecl", () => {
        it("should emit binding when vfName differs from jsName", () => {
            const ctx = createTestContext();
            const decl = externalDecl("floor", "Math.floor");
            expect(emitDeclaration(decl, ctx)).toBe("const floor = Math.floor;");
        });

        it("should emit nothing when names match (global)", () => {
            const ctx = createTestContext();
            const decl = externalDecl("console", "console");
            expect(emitDeclaration(decl, ctx)).toBe("");
        });

        it("should collect export for external declaration", () => {
            const ctx = createTestContext();
            const decl = externalDecl("floor", "Math.floor", { exported: true });
            emitDeclaration(decl, ctx);
            expect(ctx.exportedNames.has("floor")).toBe(true);
        });

        it("should handle dotted jsName from module", () => {
            const ctx = createTestContext();
            const decl = externalDecl("readFile", "fs.readFile", { from: "node:fs" });
            expect(emitDeclaration(decl, ctx)).toBe("const readFile = fs.readFile;");
        });

        it("should escape reserved words in vfName", () => {
            const ctx = createTestContext();
            const decl = externalDecl("default", "defaultValue");
            expect(emitDeclaration(decl, ctx)).toBe("const default$ = defaultValue;");
        });
    });

    describe("CoreExternalTypeDecl", () => {
        it("should emit nothing", () => {
            const ctx = createTestContext();
            const decl = externalTypeDecl("Promise");
            expect(emitDeclaration(decl, ctx)).toBe("");
        });
    });

    describe("CoreImportDecl", () => {
        it("should emit simple import", () => {
            const ctx = createTestContext();
            const decl = importDecl("./utils", [importItem("helper")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { helper } from "./utils.js";');
        });

        it("should emit import with alias", () => {
            const ctx = createTestContext();
            const decl = importDecl("./utils", [importItem("helper", { alias: "h" })]);
            expect(emitDeclaration(decl, ctx)).toBe('import { helper as h } from "./utils.js";');
        });

        it("should emit multiple imports", () => {
            const ctx = createTestContext();
            const decl = importDecl("./utils", [importItem("foo"), importItem("bar"), importItem("baz")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { foo, bar, baz } from "./utils.js";');
        });

        it("should filter out type-only imports", () => {
            const ctx = createTestContext();
            const decl = importDecl("./types", [
                importItem("Type", { isType: true }),
                importItem("value", { isType: false }),
            ]);
            expect(emitDeclaration(decl, ctx)).toBe('import { value } from "./types.js";');
        });

        it("should emit nothing when all imports are type-only", () => {
            const ctx = createTestContext();
            const decl = importDecl("./types", [
                importItem("Type1", { isType: true }),
                importItem("Type2", { isType: true }),
            ]);
            expect(emitDeclaration(decl, ctx)).toBe("");
        });

        it("should add .js extension to relative paths", () => {
            const ctx = createTestContext();
            const decl = importDecl("./foo/bar", [importItem("x")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { x } from "./foo/bar.js";');
        });

        it("should add .js extension to parent paths", () => {
            const ctx = createTestContext();
            const decl = importDecl("../utils", [importItem("x")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { x } from "../utils.js";');
        });

        it("should not add .js to package imports", () => {
            const ctx = createTestContext();
            const decl = importDecl("lodash", [importItem("map")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { map } from "lodash";');
        });

        it("should not add .js to scoped package imports", () => {
            const ctx = createTestContext();
            const decl = importDecl("@vibefun/std", [importItem("List")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { List } from "@vibefun/std";');
        });

        it("should not double-add .js extension", () => {
            const ctx = createTestContext();
            const decl = importDecl("./utils.js", [importItem("x")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { x } from "./utils.js";');
        });

        it("should escape reserved words in import names", () => {
            const ctx = createTestContext();
            const decl = importDecl("./utils", [importItem("class")]);
            expect(emitDeclaration(decl, ctx)).toBe('import { class$ } from "./utils.js";');
        });
    });
});
