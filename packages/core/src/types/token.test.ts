/**
 * Tests for token helper functions
 */

import { describe, expect, it } from "vitest";

import { isBoolLiteral, isKeyword } from "./token.js";

describe("isKeyword", () => {
    it("should return true for valid keywords", () => {
        expect(isKeyword("let")).toBe(true);
        expect(isKeyword("mut")).toBe(true);
        expect(isKeyword("type")).toBe(true);
        expect(isKeyword("if")).toBe(true);
        expect(isKeyword("then")).toBe(true);
        expect(isKeyword("else")).toBe(true);
        expect(isKeyword("match")).toBe(true);
        expect(isKeyword("when")).toBe(true);
        expect(isKeyword("rec")).toBe(true);
        expect(isKeyword("import")).toBe(true);
        expect(isKeyword("export")).toBe(true);
        expect(isKeyword("external")).toBe(true);
        expect(isKeyword("unsafe")).toBe(true);
        expect(isKeyword("from")).toBe(true);
        expect(isKeyword("as")).toBe(true);
    });

    it("should return false for non-keywords", () => {
        expect(isKeyword("foo")).toBe(false);
        expect(isKeyword("bar")).toBe(false);
        expect(isKeyword("myVariable")).toBe(false);
        expect(isKeyword("")).toBe(false);
    });

    it("should return false for boolean literals", () => {
        expect(isKeyword("true")).toBe(false);
        expect(isKeyword("false")).toBe(false);
    });
});

describe("isBoolLiteral", () => {
    it("should return true for boolean literals", () => {
        expect(isBoolLiteral("true")).toBe(true);
        expect(isBoolLiteral("false")).toBe(true);
    });

    it("should return false for non-boolean literals", () => {
        expect(isBoolLiteral("True")).toBe(false);
        expect(isBoolLiteral("False")).toBe(false);
        expect(isBoolLiteral("let")).toBe(false);
        expect(isBoolLiteral("foo")).toBe(false);
        expect(isBoolLiteral("")).toBe(false);
    });
});
