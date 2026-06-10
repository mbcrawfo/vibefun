/**
 * Tests for variable reference emission.
 */

import type { ValueBinding } from "../../../types/environment.js";

import { describe, expect, it } from "vitest";

import { constType } from "../../../typechecker/types.js";
import { createTestContext } from "../test-helpers.js";
import { emitVar } from "./variables.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

function externalBinding(jsName: string): ValueBinding {
    return {
        kind: "External",
        scheme: { vars: [], type: constType("Int") },
        jsName,
        loc: testLoc,
    };
}

describe("emitVar", () => {
    it("emits a regular variable unchanged", () => {
        const ctx = createTestContext();
        expect(emitVar("counter", ctx)).toBe("counter");
    });

    it("escapes reserved words for regular variables", () => {
        const ctx = createTestContext();
        expect(emitVar("default", ctx)).toBe("default$");
    });

    it("inlines the jsName for an external binding", () => {
        const ctx = createTestContext();
        ctx.env.values.set("floor", externalBinding("Math.floor"));
        expect(emitVar("floor", ctx)).toBe("Math.floor");
    });

    it("references the curried wrapper for a multi-param external", () => {
        // [BUG: VF-FC-0009] multi-param externals are emitted as curried
        // wrapper consts; the variable reference must use the vibefun name,
        // not inline the raw n-ary jsName.
        const ctx = createTestContext();
        ctx.env.values.set("add2", externalBinding("((a, b) => a + b)"));
        ctx.shared.curriedExternals.add("add2");
        expect(emitVar("add2", ctx)).toBe("add2");
    });

    it("escapes the wrapper name for a reserved-word curried external", () => {
        const ctx = createTestContext();
        ctx.env.values.set("default", externalBinding("someFn"));
        ctx.shared.curriedExternals.add("default");
        expect(emitVar("default", ctx)).toBe("default$");
    });
});
