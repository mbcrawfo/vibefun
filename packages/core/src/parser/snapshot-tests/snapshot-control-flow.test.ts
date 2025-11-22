import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Control Flow", () => {
    it("should parse control-flow.vf", () => {
        const ast = parseFixture("control-flow.vf");
        expect(ast).toMatchSnapshot();
    });
});
