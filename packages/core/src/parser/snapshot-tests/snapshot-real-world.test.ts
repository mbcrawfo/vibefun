import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Real World", () => {
    it("should parse real-world.vf", () => {
        const ast = parseFixture("real-world.vf");
        expect(ast).toMatchSnapshot();
    });
});
