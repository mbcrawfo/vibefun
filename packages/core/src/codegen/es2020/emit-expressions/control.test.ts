/**
 * Tests for control-flow emission helpers that can run without the full
 * pattern-emission DI wiring (emitAssign only recurses through emitExpr
 * for its value).
 */

import { describe, expect, it } from "vitest";

import { createTestContext } from "../test-helpers.js";
import { emitAssign } from "./control.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

describe("emitAssign", () => {
    it("emits a plain JS assignment yielding undefined", () => {
        const ctx = createTestContext();
        const code = emitAssign(
            {
                kind: "CoreAssign",
                name: "x",
                value: { kind: "CoreIntLit", value: 42, loc: testLoc },
            },
            ctx,
        );
        expect(code).toBe("(x = 42, undefined)");
    });

    it("escapes reserved words in the target name", () => {
        const ctx = createTestContext();
        const code = emitAssign(
            {
                kind: "CoreAssign",
                name: "default",
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
            },
            ctx,
        );
        expect(code).toBe("(default$ = 1, undefined)");
    });
});
