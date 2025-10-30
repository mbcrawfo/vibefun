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

import { describe, expect, it } from "vitest";

import { listType, optionType } from "./builtins.js";
import { buildEnvironment } from "./environment.js";
import { checkExhaustiveness, checkPattern } from "./patterns.js";
import { primitiveTypes } from "./types.js";
import { emptySubst } from "./unify.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

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
            }).toThrow("expects record type");
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

            const missing = checkExhaustiveness(env, patterns, primitiveTypes.Int);
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

            const missing = checkExhaustiveness(env, patterns, primitiveTypes.Int);
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
            const missing = checkExhaustiveness(env, patterns, optionIntType);

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
            const missing = checkExhaustiveness(env, patterns, optionIntType);

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
            const missing = checkExhaustiveness(env, patterns, optionIntType);

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
            const missing = checkExhaustiveness(env, patterns, listIntType);

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
            const missing = checkExhaustiveness(env, patterns, listIntType);

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

            const missing = checkExhaustiveness(env, patterns, primitiveTypes.Int);

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

            const missing = checkExhaustiveness(env, patterns, primitiveTypes.Int);

            expect(missing).toEqual([]);
        });
    });
});
