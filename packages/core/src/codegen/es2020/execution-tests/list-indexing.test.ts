/**
 * Execution tests for the list indexing operator.
 *
 * [BUG: VF-FC-0012] `xs[i] : Option<T>` — in-bounds reads produce
 * Some(element), out-of-bounds (negative or past-the-end) produce None.
 * The vm sandbox cannot resolve module imports, so the desugared
 * `__std__.List.get` call is exercised in the e2e suite; here we check the
 * emitted shape only.
 */

import { describe, expect, it } from "vitest";

import { compileToJs } from "./execution-test-helpers.js";

describe("list indexing", () => {
    it("emits the __std__.List.get call chain", () => {
        const js = compileToJs(`let xs = [10, 20, 30];
let y = xs[1];`);
        expect(js).toContain("__std__.List.get(xs)(1)");
        expect(js).toContain('import { __std__ } from "@vibefun/std"');
    });

    it("emits nothing index-specific when indexing is unused", () => {
        const js = compileToJs(`let xs = [10];`);
        expect(js).not.toContain("List.get");
    });
});
