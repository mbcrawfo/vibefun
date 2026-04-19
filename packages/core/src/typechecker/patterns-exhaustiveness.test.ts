/**
 * Tests for pattern exhaustiveness and reachability checking
 */

import type { Module } from "../types/ast.js";
import type { CorePattern } from "../types/core-ast.js";
import type { Type } from "../types/environment.js";
import type { CaseForExhaustiveness } from "./patterns.js";

import { describe, expect, it } from "vitest";

import { listType, optionType } from "./builtins.js";
import { buildEnvironment } from "./environment.js";
import { checkExhaustiveness, checkReachability } from "./patterns.js";
import { primitiveTypes } from "./types.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

function toCases(patterns: CorePattern[]): CaseForExhaustiveness[] {
    return patterns.map((pattern) => ({ pattern, guarded: false }));
}

describe("Pattern Checking", () => {
    const emptyModule: Module = {
        imports: [],
        declarations: [],
        loc: testLoc,
    };
    const env = buildEnvironment(emptyModule);

    describe("Exhaustiveness Checking", () => {
        it("should accept wildcard as exhaustive", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreWildcardPattern",
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Int);
            expect(missing).toEqual([]);
        });

        it("should accept variable pattern as exhaustive", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreVarPattern",
                    name: "x",
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Int);
            expect(missing).toEqual([]);
        });

        it("should detect missing Some case", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreVariantPattern",
                    constructor: "None",
                    args: [],
                    loc: testLoc,
                },
            ];

            const optionIntType = optionType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, toCases(patterns), optionIntType);

            expect(missing).toContain("Some");
        });

        it("should detect missing None case", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreVariantPattern",
                    constructor: "Some",
                    args: [
                        {
                            kind: "CoreVarPattern",
                            name: "x",
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
            ];

            const optionIntType = optionType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, toCases(patterns), optionIntType);

            expect(missing).toContain("None");
        });

        it("should accept complete Option match", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreVariantPattern",
                    constructor: "Some",
                    args: [
                        {
                            kind: "CoreVarPattern",
                            name: "x",
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                {
                    kind: "CoreVariantPattern",
                    constructor: "None",
                    args: [],
                    loc: testLoc,
                },
            ];

            const optionIntType = optionType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, toCases(patterns), optionIntType);

            expect(missing).toEqual([]);
        });

        it("should detect missing List cases", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreVariantPattern",
                    constructor: "Nil",
                    args: [],
                    loc: testLoc,
                },
            ];

            const listIntType = listType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, toCases(patterns), listIntType);

            expect(missing).toContain("Cons");
        });

        it("should accept complete List match", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreVariantPattern",
                    constructor: "Cons",
                    args: [
                        {
                            kind: "CoreVarPattern",
                            name: "h",
                            loc: testLoc,
                        },
                        {
                            kind: "CoreVarPattern",
                            name: "t",
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                {
                    kind: "CoreVariantPattern",
                    constructor: "Nil",
                    args: [],
                    loc: testLoc,
                },
            ];

            const listIntType = listType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, toCases(patterns), listIntType);

            expect(missing).toEqual([]);
        });

        it("should require catch-all for literal patterns", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreLiteralPattern",
                    literal: 1,
                    loc: testLoc,
                },
                {
                    kind: "CoreLiteralPattern",
                    literal: 2,
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Int);

            expect(missing.length).toBeGreaterThan(0);
        });

        it("should accept literal patterns with wildcard", () => {
            const patterns: CorePattern[] = [
                {
                    kind: "CoreLiteralPattern",
                    literal: 1,
                    loc: testLoc,
                },
                {
                    kind: "CoreWildcardPattern",
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Int);

            expect(missing).toEqual([]);
        });

        it("should accept true | false as exhaustive for Bool", () => {
            const patterns: CorePattern[] = [
                { kind: "CoreLiteralPattern", literal: true, loc: testLoc },
                { kind: "CoreLiteralPattern", literal: false, loc: testLoc },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Bool);

            expect(missing).toEqual([]);
        });

        it("should detect missing `false` when only `true` is matched on Bool", () => {
            const patterns: CorePattern[] = [{ kind: "CoreLiteralPattern", literal: true, loc: testLoc }];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Bool);

            expect(missing).toEqual(["false"]);
        });

        it("should detect missing `true` when only `false` is matched on Bool", () => {
            const patterns: CorePattern[] = [{ kind: "CoreLiteralPattern", literal: false, loc: testLoc }];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Bool);

            expect(missing).toEqual(["true"]);
        });

        it("should still require a catch-all for non-Bool literal patterns", () => {
            // Regression guard: fix for Bool exhaustiveness must not change
            // the existing "<other values>" fallback for other literal types.
            const patterns: CorePattern[] = [{ kind: "CoreLiteralPattern", literal: 1, loc: testLoc }];

            const missing = checkExhaustiveness(env, toCases(patterns), primitiveTypes.Int);

            expect(missing).toEqual(["<other values>"]);
        });

        it("should flag tuple matches without any catch-all pattern", () => {
            // match pair { | (0, 0) => ... }
            const tupleType: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };
            const patterns: CorePattern[] = [
                {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                    ],
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), tupleType);

            expect(missing).toEqual(["(_, _)"]);
        });

        it("should treat a tuple of all-variable elements as exhaustive", () => {
            // match pair { | (a, b) => ... }
            const tupleType: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };
            const patterns: CorePattern[] = [
                {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "a", loc: testLoc },
                        { kind: "CoreVarPattern", name: "b", loc: testLoc },
                    ],
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), tupleType);

            expect(missing).toEqual([]);
        });

        it("should treat tuple with literal + catch-all arms as exhaustive", () => {
            // match pair { | (0, 0) => ... | _ => ... }
            const tupleType: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };
            const patterns: CorePattern[] = [
                {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                    ],
                    loc: testLoc,
                },
                { kind: "CoreWildcardPattern", loc: testLoc },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), tupleType);

            expect(missing).toEqual([]);
        });

        it("should recognize nested all-catch-all tuple patterns", () => {
            // match nested { | ((_, _), (_, _)) => ... }
            const innerTuple: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };
            const outerTuple: Type = {
                type: "Tuple",
                elements: [innerTuple, innerTuple],
            };
            const wildcard: CorePattern = { kind: "CoreWildcardPattern", loc: testLoc };
            const innerPattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [wildcard, wildcard],
                loc: testLoc,
            };
            const patterns: CorePattern[] = [
                {
                    kind: "CoreTuplePattern",
                    elements: [innerPattern, innerPattern],
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), outerTuple);

            expect(missing).toEqual([]);
        });

        it("should report missing-case shape with correct arity for triples", () => {
            const tripleType: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int, primitiveTypes.Int],
            };
            const patterns: CorePattern[] = [
                {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                        { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                    ],
                    loc: testLoc,
                },
            ];

            const missing = checkExhaustiveness(env, toCases(patterns), tripleType);

            expect(missing).toEqual(["(_, _, _)"]);
        });
    });

    describe("Reachability (VF4405)", () => {
        it("rejects a literal pattern after an unguarded wildcard", () => {
            // match n { | _ => "any" | 0 => "zero" }
            const cases: CaseForExhaustiveness[] = [
                { pattern: { kind: "CoreWildcardPattern", loc: testLoc }, guarded: false },
                { pattern: { kind: "CoreLiteralPattern", literal: 0, loc: testLoc }, guarded: false },
            ];
            expect(() => checkReachability(cases)).toThrow("VF4405");
        });

        it("rejects a wildcard after a wildcard", () => {
            const cases: CaseForExhaustiveness[] = [
                { pattern: { kind: "CoreWildcardPattern", loc: testLoc }, guarded: false },
                { pattern: { kind: "CoreWildcardPattern", loc: testLoc }, guarded: false },
            ];
            expect(() => checkReachability(cases)).toThrow("VF4405");
        });

        it("rejects any arm after an unguarded variable pattern", () => {
            const cases: CaseForExhaustiveness[] = [
                { pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc }, guarded: false },
                { pattern: { kind: "CoreLiteralPattern", literal: 0, loc: testLoc }, guarded: false },
            ];
            expect(() => checkReachability(cases)).toThrow("VF4405");
        });

        it("accepts a literal arm before a trailing wildcard", () => {
            const cases: CaseForExhaustiveness[] = [
                { pattern: { kind: "CoreLiteralPattern", literal: 0, loc: testLoc }, guarded: false },
                { pattern: { kind: "CoreWildcardPattern", loc: testLoc }, guarded: false },
            ];
            expect(() => checkReachability(cases)).not.toThrow();
        });

        it("does not treat a guarded wildcard as a catch-all", () => {
            // match n { | x when x > 0 => ... | 0 => ... }
            const cases: CaseForExhaustiveness[] = [
                { pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc }, guarded: true },
                { pattern: { kind: "CoreLiteralPattern", literal: 0, loc: testLoc }, guarded: false },
            ];
            expect(() => checkReachability(cases)).not.toThrow();
        });

        it("allows a guarded arm to follow an unguarded catch-all? no — it is still unreachable", () => {
            // A guard cannot resurrect a dead arm: the earlier catch-all has
            // already consumed the value.
            const cases: CaseForExhaustiveness[] = [
                { pattern: { kind: "CoreWildcardPattern", loc: testLoc }, guarded: false },
                { pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc }, guarded: true },
            ];
            expect(() => checkReachability(cases)).toThrow("VF4405");
        });
    });

    describe("Guarded patterns and exhaustiveness", () => {
        it("treats a single guarded catch-all as non-exhaustive", () => {
            // match n { | x when x > 0 => ... }
            const cases: CaseForExhaustiveness[] = [
                {
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    guarded: true,
                },
            ];
            const missing = checkExhaustiveness(env, cases, primitiveTypes.Int);
            expect(missing.length).toBeGreaterThan(0);
        });

        it("treats multiple guarded catch-alls as non-exhaustive", () => {
            // match n { | x when x > 0 => ... | x when x < 0 => ... }
            const cases: CaseForExhaustiveness[] = [
                {
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    guarded: true,
                },
                {
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    guarded: true,
                },
            ];
            const missing = checkExhaustiveness(env, cases, primitiveTypes.Int);
            expect(missing.length).toBeGreaterThan(0);
        });

        it("is exhaustive when a trailing unguarded wildcard follows guarded arms", () => {
            // match n { | x when x > 0 => ... | _ => ... }
            const cases: CaseForExhaustiveness[] = [
                {
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    guarded: true,
                },
                {
                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                    guarded: false,
                },
            ];
            const missing = checkExhaustiveness(env, cases, primitiveTypes.Int);
            expect(missing).toEqual([]);
        });

        it("treats guarded variant case without companion unguarded as non-exhaustive", () => {
            // match opt { | Some(x) when x > 0 => ... | None => ... }
            const cases: CaseForExhaustiveness[] = [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    guarded: true,
                },
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "None",
                        args: [],
                        loc: testLoc,
                    },
                    guarded: false,
                },
            ];
            const optionIntType = optionType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, cases, optionIntType);
            expect(missing).toContain("Some");
        });

        it("remains exhaustive when a guarded arm accompanies fully covering unguarded arms", () => {
            // match opt { | Some(x) when x > 0 => ... | Some(x) => ... | None => ... }
            const cases: CaseForExhaustiveness[] = [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    guarded: true,
                },
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    guarded: false,
                },
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "None",
                        args: [],
                        loc: testLoc,
                    },
                    guarded: false,
                },
            ];
            const optionIntType = optionType(primitiveTypes.Int);
            const missing = checkExhaustiveness(env, cases, optionIntType);
            expect(missing).toEqual([]);
        });
    });
});
