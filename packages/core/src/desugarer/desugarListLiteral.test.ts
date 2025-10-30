/**
 * Tests for desugarListLiteral - see lists.test.ts for comprehensive integration tests
 */

import { describe, expect, it } from "vitest";

import { desugarListLiteral } from "./desugarListLiteral.js";

describe("desugarListLiteral", () => {
    it("should exist", () => {
        expect(desugarListLiteral).toBeDefined();
    });
});
