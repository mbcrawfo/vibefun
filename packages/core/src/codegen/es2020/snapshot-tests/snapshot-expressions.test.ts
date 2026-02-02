import { describe, expect, it } from "vitest";

import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - Expressions", () => {
    it("should compile expressions.vf", () => {
        const { code } = compileFixture("expressions.vf");
        expect(code).toMatchSnapshot();
    });
});
