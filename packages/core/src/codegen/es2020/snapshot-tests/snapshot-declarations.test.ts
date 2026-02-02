import { describe, expect, it } from "vitest";

import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - Declarations", () => {
    it("should compile declarations.vf", () => {
        const { code } = compileFixture("declarations.vf");
        expect(code).toMatchSnapshot();
    });
});
