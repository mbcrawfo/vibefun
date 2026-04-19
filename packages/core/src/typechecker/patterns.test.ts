/**
 * Tests for pattern type checking
 */

import type { Module } from "../types/ast.js";
import type {
    CoreLiteralPattern,
    CorePattern,
    CoreRecordPattern,
    CoreRecordPatternField,
    CoreVariantPattern,
    CoreVarPattern,
    CoreWildcardPattern,
} from "../types/core-ast.js";
import type { Type } from "../types/environment.js";
import type { CaseForExhaustiveness } from "./patterns.js";

import { describe, expect, it } from "vitest";

import { listType, optionType } from "./builtins.js";
import { buildEnvironment } from "./environment.js";
import { checkExhaustiveness, checkPattern, checkReachability } from "./patterns.js";
import { primitiveTypes } from "./types.js";
import { emptySubst } from "./unify.js";

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

    describe("Wildcard Patterns", () => {
        it("should match any type without bindings", () => {
            const pattern: CoreWildcardPattern = {
                kind: "CoreWildcardPattern",
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.Int, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.Int);
            expect(result.bindings.size).toBe(0);
        });

        it("should work with complex types", () => {
            const pattern: CoreWildcardPattern = {
                kind: "CoreWildcardPattern",
                loc: testLoc,
            };

            const listStringType = listType(primitiveTypes.String);
            const result = checkPattern(env, pattern, listStringType, emptySubst(), 0);

            expect(result.type).toEqual(listStringType);
            expect(result.bindings.size).toBe(0);
        });
    });

    describe("Variable Patterns", () => {
        it("should bind variable to matched type", () => {
            const pattern: CoreVarPattern = {
                kind: "CoreVarPattern",
                name: "x",
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.Int, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.Int);
            expect(result.bindings.size).toBe(1);
            expect(result.bindings.get("x")).toEqual(primitiveTypes.Int);
        });

        it("should work with complex types", () => {
            const pattern: CoreVarPattern = {
                kind: "CoreVarPattern",
                name: "list",
                loc: testLoc,
            };

            const listIntType = listType(primitiveTypes.Int);
            const result = checkPattern(env, pattern, listIntType, emptySubst(), 0);

            expect(result.type).toEqual(listIntType);
            expect(result.bindings.get("list")).toEqual(listIntType);
        });
    });

    describe("Literal Patterns", () => {
        it("should match integer literals", () => {
            const pattern: CoreLiteralPattern = {
                kind: "CoreLiteralPattern",
                literal: 42,
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.Int, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.Int);
            expect(result.bindings.size).toBe(0);
        });

        it("should match float literals", () => {
            const pattern: CoreLiteralPattern = {
                kind: "CoreLiteralPattern",
                literal: 3.14,
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.Float, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.Float);
        });

        it("should match string literals", () => {
            const pattern: CoreLiteralPattern = {
                kind: "CoreLiteralPattern",
                literal: "hello",
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.String, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.String);
        });

        it("should match boolean literals", () => {
            const pattern: CoreLiteralPattern = {
                kind: "CoreLiteralPattern",
                literal: true,
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.Bool, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.Bool);
        });

        it("should match unit literal", () => {
            const pattern: CoreLiteralPattern = {
                kind: "CoreLiteralPattern",
                literal: null,
                loc: testLoc,
            };

            const result = checkPattern(env, pattern, primitiveTypes.Unit, emptySubst(), 0);

            expect(result.type).toEqual(primitiveTypes.Unit);
        });

        it("should reject type mismatch", () => {
            const pattern: CoreLiteralPattern = {
                kind: "CoreLiteralPattern",
                literal: 42,
                loc: testLoc,
            };

            expect(() => {
                checkPattern(env, pattern, primitiveTypes.String, emptySubst(), 0);
            }).toThrow();
        });
    });

    describe("Variant Patterns", () => {
        it("should match nullary constructor (None)", () => {
            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "None",
                args: [],
                loc: testLoc,
            };

            const optionIntType = optionType(primitiveTypes.Int);
            const result = checkPattern(env, pattern, optionIntType, emptySubst(), 0);

            expect(result.type).toEqual(optionIntType);
            expect(result.bindings.size).toBe(0);
        });

        it("should match Some with binding", () => {
            const argPattern: CoreVarPattern = {
                kind: "CoreVarPattern",
                name: "x",
                loc: testLoc,
            };

            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "Some",
                args: [argPattern],
                loc: testLoc,
            };

            const optionIntType = optionType(primitiveTypes.Int);
            const result = checkPattern(env, pattern, optionIntType, emptySubst(), 0);

            expect(result.type).toEqual(optionIntType);
            expect(result.bindings.size).toBe(1);
            expect(result.bindings.get("x")).toEqual(primitiveTypes.Int);
        });

        it("should match Cons with multiple bindings", () => {
            const headPattern: CoreVarPattern = {
                kind: "CoreVarPattern",
                name: "head",
                loc: testLoc,
            };

            const tailPattern: CoreVarPattern = {
                kind: "CoreVarPattern",
                name: "tail",
                loc: testLoc,
            };

            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "Cons",
                args: [headPattern, tailPattern],
                loc: testLoc,
            };

            const listStringType2 = listType(primitiveTypes.String);
            const result = checkPattern(env, pattern, listStringType2, emptySubst(), 0);

            expect(result.type).toEqual(listStringType2);
            expect(result.bindings.size).toBe(2);
            expect(result.bindings.get("head")).toEqual(primitiveTypes.String);
            expect(result.bindings.get("tail")).toEqual(listStringType2);
        });

        it("should match nested patterns", () => {
            const innerPattern: CoreVariantPattern = {
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
            };

            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "Some",
                args: [innerPattern],
                loc: testLoc,
            };

            const nestedOptionType = optionType(optionType(primitiveTypes.Int));
            const result = checkPattern(env, pattern, nestedOptionType, emptySubst(), 0);

            expect(result.bindings.size).toBe(1);
            expect(result.bindings.get("x")).toEqual(primitiveTypes.Int);
        });

        it("should reject undefined constructor", () => {
            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "UndefinedConstructor",
                args: [],
                loc: testLoc,
            };

            expect(() => {
                checkPattern(env, pattern, primitiveTypes.Int, emptySubst(), 0);
            }).toThrow("Undefined constructor");
        });

        it("should reject wrong argument count", () => {
            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "Some",
                args: [], // Should have 1 argument
                loc: testLoc,
            };

            const optionIntType = optionType(primitiveTypes.Int);
            expect(() => {
                checkPattern(env, pattern, optionIntType, emptySubst(), 0);
            }).toThrow();
        });

        it("should reject duplicate pattern variables", () => {
            const pattern: CoreVariantPattern = {
                kind: "CoreVariantPattern",
                constructor: "Cons",
                args: [
                    {
                        kind: "CoreVarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    {
                        kind: "CoreVarPattern",
                        name: "x", // Duplicate name
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const listIntType = listType(primitiveTypes.Int);
            expect(() => {
                checkPattern(env, pattern, listIntType, emptySubst(), 0);
            }).toThrow("Duplicate pattern variable");
        });
    });

    describe("Record Patterns", () => {
        it("should match record with field bindings", () => {
            const xField: CoreRecordPatternField = {
                name: "x",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "xVal",
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const yField: CoreRecordPatternField = {
                name: "y",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "yVal",
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const pattern: CoreRecordPattern = {
                kind: "CoreRecordPattern",
                fields: [xField, yField],
                loc: testLoc,
            };

            const recordType: Type = {
                type: "Record",
                fields: new Map([
                    ["x", primitiveTypes.Int],
                    ["y", primitiveTypes.String],
                ]),
            };

            const result = checkPattern(env, pattern, recordType, emptySubst(), 0);

            expect(result.type).toEqual(recordType);
            expect(result.bindings.size).toBe(2);
            expect(result.bindings.get("xVal")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("yVal")).toEqual(primitiveTypes.String);
        });

        it("should match nested record patterns", () => {
            const innerPattern: CoreRecordPattern = {
                kind: "CoreRecordPattern",
                fields: [
                    {
                        name: "a",
                        pattern: {
                            kind: "CoreVarPattern",
                            name: "aVal",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const pattern: CoreRecordPattern = {
                kind: "CoreRecordPattern",
                fields: [
                    {
                        name: "inner",
                        pattern: innerPattern,
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const innerRecordType: Type = {
                type: "Record",
                fields: new Map([["a", primitiveTypes.Int]]),
            };

            const recordType: Type = {
                type: "Record",
                fields: new Map([["inner", innerRecordType]]),
            };

            const result = checkPattern(env, pattern, recordType, emptySubst(), 0);

            expect(result.bindings.size).toBe(1);
            expect(result.bindings.get("aVal")).toEqual(primitiveTypes.Int);
        });

        it("should reject missing field", () => {
            const pattern: CoreRecordPattern = {
                kind: "CoreRecordPattern",
                fields: [
                    {
                        name: "missingField",
                        pattern: {
                            kind: "CoreVarPattern",
                            name: "x",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const recordType: Type = {
                type: "Record",
                fields: new Map([["x", primitiveTypes.Int]]),
            };

            expect(() => {
                checkPattern(env, pattern, recordType, emptySubst(), 0);
            }).toThrow("not found");
        });

        it("should reject non-record type", () => {
            const pattern: CoreRecordPattern = {
                kind: "CoreRecordPattern",
                fields: [],
                loc: testLoc,
            };

            expect(() => {
                checkPattern(env, pattern, primitiveTypes.Int, emptySubst(), 0);
            }).toThrow("VF4500");
        });
    });

    describe("Tuple Patterns", () => {
        it("should bind elements when matched against a tuple type", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    { kind: "CoreVarPattern", name: "y", loc: testLoc },
                ],
                loc: testLoc,
            };
            const expected: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.String],
            };

            const result = checkPattern(env, pattern, expected, emptySubst(), 0);

            expect(result.bindings.size).toBe(2);
            expect(result.bindings.get("x")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("y")).toEqual(primitiveTypes.String);
        });

        it("should only bind non-wildcard elements", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    { kind: "CoreWildcardPattern", loc: testLoc },
                    { kind: "CoreVarPattern", name: "z", loc: testLoc },
                ],
                loc: testLoc,
            };
            const expected: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Bool, primitiveTypes.String],
            };

            const result = checkPattern(env, pattern, expected, emptySubst(), 0);

            expect(result.bindings.size).toBe(2);
            expect(result.bindings.get("x")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("z")).toEqual(primitiveTypes.String);
        });

        it("should accept literal element patterns and produce no bindings", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                    { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
                ],
                loc: testLoc,
            };
            const expected: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };

            const result = checkPattern(env, pattern, expected, emptySubst(), 0);

            expect(result.bindings.size).toBe(0);
        });

        it("should recurse into nested tuple patterns", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    {
                        kind: "CoreTuplePattern",
                        elements: [
                            { kind: "CoreVarPattern", name: "a", loc: testLoc },
                            { kind: "CoreVarPattern", name: "b", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    {
                        kind: "CoreTuplePattern",
                        elements: [
                            { kind: "CoreVarPattern", name: "c", loc: testLoc },
                            { kind: "CoreVarPattern", name: "d", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const innerTuple: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };
            const expected: Type = {
                type: "Tuple",
                elements: [innerTuple, innerTuple],
            };

            const result = checkPattern(env, pattern, expected, emptySubst(), 0);

            expect(result.bindings.size).toBe(4);
            expect(result.bindings.get("a")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("b")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("c")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("d")).toEqual(primitiveTypes.Int);
        });

        it("should reject arity mismatch with VF4026", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    { kind: "CoreVarPattern", name: "a", loc: testLoc },
                    { kind: "CoreVarPattern", name: "b", loc: testLoc },
                ],
                loc: testLoc,
            };
            const expected: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int, primitiveTypes.Int],
            };

            expect(() => {
                checkPattern(env, pattern, expected, emptySubst(), 0);
            }).toThrow("VF4026");
        });

        it("should reject non-tuple expected type with a unification diagnostic", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    { kind: "CoreVarPattern", name: "a", loc: testLoc },
                    { kind: "CoreVarPattern", name: "b", loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(() => {
                checkPattern(env, pattern, primitiveTypes.Int, emptySubst(), 0);
            }).toThrow(/VF40\d\d/);
        });

        it("should reject duplicate bindings across elements with VF4402", () => {
            const pattern: CorePattern = {
                kind: "CoreTuplePattern",
                elements: [
                    { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    { kind: "CoreVarPattern", name: "x", loc: testLoc },
                ],
                loc: testLoc,
            };
            const expected: Type = {
                type: "Tuple",
                elements: [primitiveTypes.Int, primitiveTypes.Int],
            };

            expect(() => {
                checkPattern(env, pattern, expected, emptySubst(), 0);
            }).toThrow("VF4402");
        });
    });

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
