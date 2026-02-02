import { describe, expect, it } from "vitest";

import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - Data Structures", () => {
    it("should compile data-structures.vf", () => {
        const { code } = compileFixture("data-structures.vf");
        expect(code).toMatchSnapshot();
    });
});
