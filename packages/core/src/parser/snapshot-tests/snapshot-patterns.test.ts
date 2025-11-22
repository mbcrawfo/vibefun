import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Patterns", () => {
    it("should parse patterns.vf", () => {
        const ast = parseFixture("patterns.vf");
        expect(ast).toMatchSnapshot();
    });
});
