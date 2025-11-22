import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Functions", () => {
    it("should parse functions.vf", () => {
        const ast = parseFixture("functions.vf");
        expect(ast).toMatchSnapshot();
    });
});
