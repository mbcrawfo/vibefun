/**
 * Tests for desugaring the mutable-binding reassignment statement.
 *
 * [BUG: VF-FC-0005] Surface `Assign` lowers 1:1 to `CoreAssign` with the
 * value desugared; the synthesized top-level wrapper stays a wildcard let.
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

describe("desugar Assign", () => {
    it("lowers a top-level reassignment to CoreAssign inside the wildcard let", () => {
        const core = desugarSource(`let mut x = ref(0);
x = ref(10);`);
        const stmt = core.declarations[1];
        expect(stmt?.kind).toBe("CoreLetDecl");
        if (stmt?.kind !== "CoreLetDecl") return;
        expect(stmt.pattern.kind).toBe("CoreWildcardPattern");
        expect(stmt.value.kind).toBe("CoreAssign");
        if (stmt.value.kind !== "CoreAssign") return;
        expect(stmt.value.name).toBe("x");
        expect(stmt.value.value.kind).toBe("CoreApp");
    });

    it("desugars the reassignment value (sugar inside the RHS is lowered)", () => {
        const core = desugarSource(`let mut x = ref(0);
x = if true then ref(1) else ref(2);`);
        const stmt = core.declarations[1];
        expect(stmt?.kind).toBe("CoreLetDecl");
        if (stmt?.kind !== "CoreLetDecl") return;
        expect(stmt.value.kind).toBe("CoreAssign");
        if (stmt.value.kind !== "CoreAssign") return;
        // `if` desugars to a CoreMatch
        expect(stmt.value.value.kind).toBe("CoreMatch");
    });
});
