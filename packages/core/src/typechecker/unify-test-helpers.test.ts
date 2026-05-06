/**
 * Tests for the unifyEquivalent test-only soundness oracle.
 */

import type { Type } from "../types/environment.js";

import { describe, expect, it } from "vitest";

import { appType, constType, funType, primitiveTypes, recordType, tupleType, unionType, variantType } from "./types.js";
import { unifyEquivalent } from "./unify-test-helpers.js";

const Int = primitiveTypes.Int;
const Bool = primitiveTypes.Bool;
const String_ = primitiveTypes.String;

const v0: Type = { type: "Var", id: 0, level: 0 };
const v1: Type = { type: "Var", id: 1, level: 0 };

describe("unifyEquivalent", () => {
    describe("reflexivity per shape", () => {
        const cases: [string, Type][] = [
            ["Var", v0],
            ["Const", Int],
            ["Fun", funType([Int, Bool], String_)],
            ["App", appType(constType("List"), [Int])],
            ["Record", recordType(new Map([["x", Int]]))],
            [
                "Variant",
                variantType(
                    new Map([
                        ["Some", [Int]],
                        ["None", []],
                    ]),
                ),
            ],
            ["Union", unionType([Int, Bool])],
            ["Tuple", tupleType([Int, Bool])],
            ["Ref", { type: "Ref", inner: Int }],
            ["Module", { type: "Module", path: "@v/std", exports: new Map() }],
            ["Never", { type: "Never" }],
            ["StringLit", { type: "StringLit", value: "pending" }],
        ];

        it.each(cases)("returns true for identical %s", (_, t) => {
            expect(unifyEquivalent(t, t)).toBe(true);
        });
    });

    describe("record width subtyping", () => {
        it("accepts narrower-then-wider", () => {
            const narrower = recordType(new Map([["x", Int]]));
            const wider = recordType(
                new Map([
                    ["x", Int],
                    ["y", String_],
                ]),
            );
            expect(unifyEquivalent(narrower, wider)).toBe(true);
        });

        it("rejects wider-then-narrower (wrong direction)", () => {
            const wider = recordType(
                new Map([
                    ["x", Int],
                    ["y", String_],
                ]),
            );
            const narrower = recordType(new Map([["x", Int]]));
            expect(unifyEquivalent(wider, narrower)).toBe(false);
        });

        it("rejects when shared field types differ", () => {
            const a = recordType(new Map([["x", Int]]));
            const b = recordType(
                new Map([
                    ["x", Bool],
                    ["y", String_],
                ]),
            );
            expect(unifyEquivalent(a, b)).toBe(false);
        });

        it("propagates width subtyping through tuples", () => {
            const a = tupleType([Int, recordType(new Map([["x", Int]]))]);
            const b = tupleType([
                Int,
                recordType(
                    new Map([
                        ["x", Int],
                        ["y", Bool],
                    ]),
                ),
            ]);
            expect(unifyEquivalent(a, b)).toBe(true);
        });

        it("propagates width subtyping through Apps (oracle is permissive — pair with the unifier)", () => {
            // The oracle alone does not enforce App-argument invariance.
            // unify itself rejects this case via ctx.exact, so the property
            // it gates is vacuously satisfied. This test pins the
            // documented permissiveness — see unify-test-helpers.ts.
            const a = appType(constType("List"), [recordType(new Map([["x", Int]]))]);
            const b = appType(constType("List"), [
                recordType(
                    new Map([
                        ["x", Int],
                        ["y", Bool],
                    ]),
                ),
            ]);
            expect(unifyEquivalent(a, b)).toBe(true);
        });
    });

    describe("primitives", () => {
        it("returns true for same Const name", () => {
            expect(unifyEquivalent(Int, Int)).toBe(true);
        });

        it("returns false for different Const names", () => {
            expect(unifyEquivalent(Int, Bool)).toBe(false);
        });

        it("returns false for different StringLit values", () => {
            const a: Type = { type: "StringLit", value: "ok" };
            const b: Type = { type: "StringLit", value: "err" };
            expect(unifyEquivalent(a, b)).toBe(false);
        });
    });

    describe("rejects across-tag mismatches", () => {
        it("returns false for Var vs Const", () => {
            expect(unifyEquivalent(v0, Int)).toBe(false);
        });

        it("returns false for Tuple vs Record", () => {
            expect(unifyEquivalent(tupleType([Int]), recordType(new Map([["x", Int]])))).toBe(false);
        });
    });

    describe("vars", () => {
        it("returns false for different ids", () => {
            expect(unifyEquivalent(v0, v1)).toBe(false);
        });
    });

    describe("variants", () => {
        it("returns false when constructor names differ", () => {
            const a = variantType(new Map([["Some", [Int]]]));
            const b = variantType(new Map([["Other", [Int]]]));
            expect(unifyEquivalent(a, b)).toBe(false);
        });

        it("returns false when constructor arities differ", () => {
            const a = variantType(new Map([["Pair", [Int]]]));
            const b = variantType(new Map([["Pair", [Int, Bool]]]));
            expect(unifyEquivalent(a, b)).toBe(false);
        });
    });

    describe("functions and apps", () => {
        it("returns false when fun arities differ", () => {
            expect(unifyEquivalent(funType([Int], Int), funType([Int, Bool], Int))).toBe(false);
        });

        it("returns false when app constructors differ", () => {
            const a = appType(constType("List"), [Int]);
            const b = appType(constType("Option"), [Int]);
            expect(unifyEquivalent(a, b)).toBe(false);
        });
    });

    describe("tuples and unions", () => {
        it("returns false when tuple lengths differ", () => {
            expect(unifyEquivalent(tupleType([Int]), tupleType([Int, Bool]))).toBe(false);
        });

        it("returns false when tuple element types differ", () => {
            expect(unifyEquivalent(tupleType([Int, Bool]), tupleType([Int, String_]))).toBe(false);
        });

        it("returns false when union lengths differ", () => {
            expect(unifyEquivalent(unionType([Int]), unionType([Int, Bool]))).toBe(false);
        });

        it("returns false when union element types differ", () => {
            expect(unifyEquivalent(unionType([Int, Bool]), unionType([Int, String_]))).toBe(false);
        });
    });
});
