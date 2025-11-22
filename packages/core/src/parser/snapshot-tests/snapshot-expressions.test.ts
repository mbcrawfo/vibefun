import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Expressions", () => {
    it("should parse expressions.vf", () => {
        const ast = parseFixture("expressions.vf");
        expect(ast).toMatchSnapshot();
    });
});
