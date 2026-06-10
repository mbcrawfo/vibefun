/**
 * Tests for desugaring the list indexing operator.
 *
 * [BUG: VF-FC-0012] `xs[i]` lowers to `__std__.List.get(xs)(i)` — the same
 * compiler-hidden qualified reference list-spread concat uses, so codegen
 * auto-injects the `__std__` import.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { desugarModule } from "./index.js";

function desugarSource(source: string): ReturnType<typeof desugarModule> {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return desugarModule(parser.parse());
}

describe("desugar Index", () => {
    it("lowers xs[i] to __std__.List.get(xs)(i)", () => {
        const core = desugarSource(`let xs = [10];
let y = xs[0];`);
        const stmt = core.declarations[1];
        expect(stmt?.kind).toBe("CoreLetDecl");
        if (stmt?.kind !== "CoreLetDecl") return;

        // Outer app: (...)(0)
        const outer = stmt.value;
        expect(outer.kind).toBe("CoreApp");
        if (outer.kind !== "CoreApp") return;
        expect(outer.args[0]?.kind).toBe("CoreIntLit");

        // Inner app: __std__.List.get(xs)
        const inner = outer.func;
        expect(inner.kind).toBe("CoreApp");
        if (inner.kind !== "CoreApp") return;
        expect(inner.args[0]?.kind).toBe("CoreVar");

        // Callee: __std__.List.get
        const getRef = inner.func;
        expect(getRef.kind).toBe("CoreRecordAccess");
        if (getRef.kind !== "CoreRecordAccess") return;
        expect(getRef.field).toBe("get");
        const listRef = getRef.record;
        expect(listRef.kind).toBe("CoreRecordAccess");
        if (listRef.kind !== "CoreRecordAccess") return;
        expect(listRef.field).toBe("List");
        expect(listRef.record.kind).toBe("CoreVar");
        if (listRef.record.kind !== "CoreVar") return;
        expect(listRef.record.name).toBe("__std__");
    });

    it("desugars the target and index expressions", () => {
        const core = desugarSource(`let y = xs[i + 1];`);
        const stmt = core.declarations[0];
        if (stmt?.kind !== "CoreLetDecl") return;
        const outer = stmt.value;
        if (outer.kind !== "CoreApp") return;
        // i + 1 lowers to CoreBinOp
        expect(outer.args[0]?.kind).toBe("CoreBinOp");
    });
});
