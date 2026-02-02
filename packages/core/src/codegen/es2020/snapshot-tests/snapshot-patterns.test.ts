import { describe, expect, it } from "vitest";

import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - Patterns", () => {
    it("should compile patterns.vf", () => {
        const { code } = compileFixture("patterns.vf");
        expect(code).toMatchSnapshot();
    });
});
