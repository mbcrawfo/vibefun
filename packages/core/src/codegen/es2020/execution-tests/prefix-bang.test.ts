/**
 * Execution tests for prefix `!` disambiguation.
 *
 * Verifies that the typechecker rewrites prefix `!` from `LogicalNot` to
 * `Deref` when the operand resolves to `Ref<T>` — the rewritten op carries
 * through codegen to the expected runtime behavior.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("prefix ! disambiguation", () => {
    it("dereferences a Ref<Int> at runtime", () => {
        const result = compileAndGetExport(
            `let r = ref(7);
            let result = !r;`,
            "result",
        );
        expect(result).toBe(7);
    });

    it("keeps logical NOT semantics for Bool operands", () => {
        const result = compileAndGetExport(
            `let b = true;
            let result = !b;`,
            "result",
        );
        expect(result).toBe(false);
    });

    it("dereferences a Ref<String>", () => {
        const result = compileAndGetExport(
            `let r = ref("hi");
            let result = !r;`,
            "result",
        );
        expect(result).toBe("hi");
    });

    it("supports double prefix ! on nested Ref<Ref<Int>>", () => {
        const result = compileAndGetExport(
            `let inner = ref(9);
            let outer = ref(inner);
            let result = !(!outer);`,
            "result",
        );
        expect(result).toBe(9);
    });

    it("dereferences through a type alias wrapping Ref<T>", () => {
        // Regression test for CodeRabbit review: expansion must happen before
        // the LogicalNot → Deref decision so aliases like `type Cell<T> = Ref<T>`
        // still let prefix `!` be Deref.
        const result = compileAndGetExport(
            `type Cell<T> = Ref<T>;
            let c: Cell<Int> = ref(5);
            let result = !c;`,
            "result",
        );
        expect(result).toBe(5);
    });
});
