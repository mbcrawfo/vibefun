/**
 * Tests for desugarListWithConcats - see list-spread.test.ts for integration tests
 */

import { describe, expect, it } from "vitest";

import { desugarListWithConcats } from "./desugarListWithConcats.js";

describe("desugarListWithConcats", () => {
    it("should exist", () => {
        expect(desugarListWithConcats).toBeDefined();
    });
});
