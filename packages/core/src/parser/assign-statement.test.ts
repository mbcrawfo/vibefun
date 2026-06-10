/**
 * Tests for the mutable-binding reassignment statement: `x = expr;`
 *
 * [BUG: VF-FC-0005] Reassignment is a STATEMENT (parsed only at the top
 * level and as block statements), never an expression. It is distinct from
 * the `:=` ref-content assignment operator.
 */

import { describe, expect, it } from "vitest";

import { parseModule } from "./parser-test-helpers.js";

describe("mutable-binding reassignment statement", () => {
    describe("top level", () => {
        it("parses `x = expr;` into a wildcard let wrapping an Assign", () => {
            const module = parseModule(`let mut x = ref(0);
x = ref(10);`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.pattern.kind).toBe("WildcardPattern");
            expect(stmt.value.kind).toBe("Assign");
            if (stmt.value.kind !== "Assign") return;
            expect(stmt.value.name).toBe("x");
            expect(stmt.value.value.kind).toBe("App");
        });

        it("accepts an arbitrary expression as the reassignment value", () => {
            const module = parseModule(`let mut x = ref(0);
x = if true then ref(1) else ref(2);`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("Assign");
        });

        it("does not hijack equality expressions", () => {
            const module = parseModule(`let b = (1 == 2);
b == false;`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("BinOp");
        });

        it("does not hijack ref-content assignment (:=)", () => {
            const module = parseModule(`let mut x = ref(0);
x := 5;`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("BinOp");
            if (stmt.value.kind !== "BinOp") return;
            expect(stmt.value.op).toBe("RefAssign");
        });
    });

    describe("blocks", () => {
        it("parses a reassignment statement inside a block", () => {
            const module = parseModule(`let mut x = ref(0);
let _ = {
  x = ref(7);
  ();
};`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("Block");
            if (stmt.value.kind !== "Block") return;
            expect(stmt.value.exprs[0]?.kind).toBe("Assign");
        });

        it("parses a reassignment directly after a block-let (let-body position)", () => {
            const module = parseModule(`let mut x = ref(0);
let _ = {
  let mut y = ref(0);
  x = ref(7);
  ();
};`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("Block");
            if (stmt.value.kind !== "Block") return;
            // The block-let captures the assignment as its body expression.
            const letExpr = stmt.value.exprs[0];
            expect(letExpr?.kind).toBe("Let");
            if (letExpr?.kind !== "Let") return;
            expect(letExpr.body.kind).toBe("Assign");
        });

        it("a block starting with a reassignment is a block, not a record", () => {
            const module = parseModule(`let mut x = ref(0);
let _ = {
  x = ref(1);
  x = ref(2);
  ();
};`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("Block");
        });

        it("record construction with COLON fields still parses as a record", () => {
            const module = parseModule(`let r = { x: 1, y: 2 };`);
            const stmt = module.declarations[0];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("Record");
        });

        it("record shorthand still parses as a record", () => {
            const module = parseModule(`let x = 1;
let r = { x };`);
            const stmt = module.declarations[1];
            expect(stmt?.kind).toBe("LetDecl");
            if (stmt?.kind !== "LetDecl") return;
            expect(stmt.value.kind).toBe("Record");
        });
    });

    describe("not an expression", () => {
        it("rejects reassignment in expression position", () => {
            expect(() =>
                parseModule(`let mut x = ref(0);
let y = (x = ref(1));`),
            ).toThrow();
        });
    });
});
