import { describe, expect, it } from "vitest";

import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Modules", () => {
    it("should parse modules.vf", () => {
        const ast = parseFixture("modules.vf");
        expect(ast).toMatchSnapshot();
    });
});
