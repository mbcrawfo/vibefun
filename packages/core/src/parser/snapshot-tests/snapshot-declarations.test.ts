import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Declarations", () => {
    it("should parse declarations.vf", () => {
        const ast = parseFixture("declarations.vf");
        expect(ast).toMatchSnapshot();
    });
});
