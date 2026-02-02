import { describe, expect, it } from "vitest";

import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - Functions", () => {
    it("should compile functions.vf", () => {
        const { code } = compileFixture("functions.vf");
        expect(code).toMatchSnapshot();
    });
});
