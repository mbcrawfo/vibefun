import { describe, expect, it } from "vitest";

import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - Real World", () => {
    it("should compile real-world.vf", () => {
        const { code } = compileFixture("real-world.vf");
        expect(code).toMatchSnapshot();
    });
});
