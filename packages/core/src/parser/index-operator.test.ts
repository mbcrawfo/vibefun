/**
 * Tests for the list indexing postfix operator `xs[i]`.
 *
 * [BUG: VF-FC-0012] `[]` is a precedence-16 postfix operator (spec
 * 13-appendix) parsed in the same postfix family as call and field access.
 */

import { describe, expect, it } from "vitest";

import { parseModule } from "./parser-test-helpers.js";

describe("list indexing operator", () => {
    it("parses `xs[0]` into an Index node", () => {
        const module = parseModule(`let xs = [10, 20, 30];
let y = xs[0];`);
        const stmt = module.declarations[1];
        expect(stmt?.kind).toBe("LetDecl");
        if (stmt?.kind !== "LetDecl") return;
        expect(stmt.value.kind).toBe("Index");
        if (stmt.value.kind !== "Index") return;
        expect(stmt.value.target.kind).toBe("Var");
        expect(stmt.value.index.kind).toBe("IntLit");
    });

    it("accepts an arbitrary index expression", () => {
        const module = parseModule(`let y = xs[i + 1];`);
        const stmt = module.declarations[0];
        if (stmt?.kind !== "LetDecl") return;
        expect(stmt.value.kind).toBe("Index");
        if (stmt.value.kind !== "Index") return;
        expect(stmt.value.index.kind).toBe("BinOp");
    });

    it("chains left-associatively: xs[0][1]", () => {
        const module = parseModule(`let y = xs[0][1];`);
        const stmt = module.declarations[0];
        if (stmt?.kind !== "LetDecl") return;
        expect(stmt.value.kind).toBe("Index");
        if (stmt.value.kind !== "Index") return;
        expect(stmt.value.target.kind).toBe("Index");
    });

    it("composes with calls and field access: f(x).items[0]", () => {
        const module = parseModule(`let y = f(x).items[0];`);
        const stmt = module.declarations[0];
        if (stmt?.kind !== "LetDecl") return;
        expect(stmt.value.kind).toBe("Index");
        if (stmt.value.kind !== "Index") return;
        expect(stmt.value.target.kind).toBe("RecordAccess");
    });

    it("rejects a missing closing bracket", () => {
        expect(() => parseModule(`let y = xs[0;`)).toThrow();
    });

    it("list literals in primary position still parse", () => {
        const module = parseModule(`let xs = [1, 2, 3];`);
        const stmt = module.declarations[0];
        if (stmt?.kind !== "LetDecl") return;
        expect(stmt.value.kind).toBe("List");
    });
});
