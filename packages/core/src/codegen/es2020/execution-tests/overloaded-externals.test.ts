/**
 * Execution tests for overloaded external declarations.
 *
 * [BUG: VF-FC-0008] Calls to overloaded externals resolve by arity at
 * typecheck time, and codegen emits the whole application spine as ONE
 * n-ary call to the shared jsName (all overloads share it per VF4801).
 */

import { describe, expect, it } from "vitest";

import { compileAndRun, compileToJs } from "./execution-test-helpers.js";

const PICK = `external pick: (Int) -> Int = "((a, b) => b === undefined ? a + 1 : a + b)";
external pick: (Int, Int) -> Int = "((a, b) => b === undefined ? a + 1 : a + b)";`;

describe("overloaded externals", () => {
    it("a 1-arg call hits the 1-ary overload", () => {
        const result = compileAndRun(
            `${PICK}
let r = unsafe { pick(10) };`,
            "r",
        );
        expect(result).toBe(11);
    });

    it("a 2-arg call hits the 2-ary overload", () => {
        const result = compileAndRun(
            `${PICK}
let r = unsafe { pick(10, 5) };`,
            "r",
        );
        expect(result).toBe(15);
    });

    it("emits the spine as one n-ary call and a single alias const", () => {
        const js = compileToJs(`${PICK}
let r = unsafe { pick(10, 5) };`);
        // n-ary call to the shared jsName, not a curried chain
        expect(js).toContain("((a, b) => b === undefined ? a + 1 : a + b)(10, 5)");
        expect(js).not.toContain(")(10)(5)");
        // the alias const appears exactly once despite two declarations
        const aliasCount = js.split("const pick =").length - 1;
        expect(aliasCount).toBe(1);
    });
});
