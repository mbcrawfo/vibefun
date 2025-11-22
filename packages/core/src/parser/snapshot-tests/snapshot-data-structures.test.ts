import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Data Structures", () => {
    it("should parse data-structures.vf", () => {
        const ast = parseFixture("data-structures.vf");
        expect(ast).toMatchSnapshot();
    });
});
