/**
 * Tests for pattern type checking
 */

import type { Module } from "../types/ast.js";
import type {
    CoreLiteralPattern,
    CorePattern,
    CoreRecordPattern,
    CoreRecordPatternField,
    CoreTuplePattern,
    CoreVariantPattern,
    CoreVarPattern,
    CoreWildcardPattern,
} from "../types/core-ast.js";
import type { Type } from "../types/environment.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { listType, optionType } from "./builtins.js";
import { buildEnvironment } from "./environment.js";
import { checkPattern } from "./patterns.js";
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

        // Spec ref: docs/spec/03-type-system/tuples.md:53-67 — nested tuples
        // are destructurable at arbitrary levels. The audit (03a F-15) flagged
        // that 3+-level nesting lacks dedicated regression coverage.
        it("should bind every leaf of a 3-level nested tuple `((a, b), (c, (d, e)))`", () => {
            const pattern: CoreTuplePattern = {
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
                            {
                                kind: "CoreTuplePattern",
                                elements: [
                                    { kind: "CoreVarPattern", name: "d", loc: testLoc },
                                    { kind: "CoreVarPattern", name: "e", loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const innerDE: Type = { type: "Tuple", elements: [primitiveTypes.Int, primitiveTypes.Bool] };
            const innerCInner: Type = { type: "Tuple", elements: [primitiveTypes.String, innerDE] };
            const innerAB: Type = { type: "Tuple", elements: [primitiveTypes.Int, primitiveTypes.String] };
            const expected: Type = { type: "Tuple", elements: [innerAB, innerCInner] };

            const result = checkPattern(env, pattern, expected, emptySubst(), 0);

            expect(result.bindings.size).toBe(5);
            expect(result.bindings.get("a")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("b")).toEqual(primitiveTypes.String);
            expect(result.bindings.get("c")).toEqual(primitiveTypes.String);
            expect(result.bindings.get("d")).toEqual(primitiveTypes.Int);
            expect(result.bindings.get("e")).toEqual(primitiveTypes.Bool);
        });

        // Property: a balanced binary tuple of any depth ≤ 5 destructures
        // into exactly the right number of leaf bindings, each carrying the
        // primitive type at that leaf's position. This pins the recursive
        // pattern-checker contract without enumerating every shape.
        type LeafKind = "Int" | "String" | "Bool";
        const leafKindArb = fc.constantFrom<LeafKind>("Int", "String", "Bool");
        const primitiveFor = (k: LeafKind): Type =>
            k === "Int" ? primitiveTypes.Int : k === "String" ? primitiveTypes.String : primitiveTypes.Bool;

        type ShapedNode =
            | { tag: "leaf"; kind: LeafKind; varName: string }
            | { tag: "node"; left: ShapedNode; right: ShapedNode };

        function nameForIndex(i: number): string {
            // Names like a, b, …, z, a1, b1, … so depth-5 (≤ 32 leaves) fits
            // within the alphabet without colliding with binders elsewhere.
            const letter = String.fromCharCode("a".charCodeAt(0) + (i % 26));
            const suffix = Math.floor(i / 26);
            return suffix === 0 ? letter : `${letter}${suffix}`;
        }

        function shapedTreeArb(depth: number): fc.Arbitrary<ShapedNode> {
            if (depth === 0) return leafKindArb.map((kind) => ({ tag: "leaf" as const, kind, varName: "" }));
            return fc.oneof(
                leafKindArb.map((kind) => ({ tag: "leaf" as const, kind, varName: "" })),
                fc
                    .tuple(shapedTreeArb(depth - 1), shapedTreeArb(depth - 1))
                    .map(([left, right]) => ({ tag: "node" as const, left, right })),
            );
        }

        function assignNames(node: ShapedNode, counter: { i: number }): void {
            if (node.tag === "leaf") {
                node.varName = nameForIndex(counter.i++);
                return;
            }
            assignNames(node.left, counter);
            assignNames(node.right, counter);
        }

        function buildPattern(node: ShapedNode): CorePattern {
            if (node.tag === "leaf") {
                return { kind: "CoreVarPattern", name: node.varName, loc: testLoc };
            }
            return {
                kind: "CoreTuplePattern",
                elements: [buildPattern(node.left), buildPattern(node.right)],
                loc: testLoc,
            };
        }

        function buildType(node: ShapedNode): Type {
            if (node.tag === "leaf") return primitiveFor(node.kind);
            return { type: "Tuple", elements: [buildType(node.left), buildType(node.right)] };
        }

        function collectLeaves(node: ShapedNode, out: Array<{ name: string; kind: LeafKind }>): void {
            if (node.tag === "leaf") {
                out.push({ name: node.varName, kind: node.kind });
                return;
            }
            collectLeaves(node.left, out);
            collectLeaves(node.right, out);
        }

        it("property: nested tuple patterns up to depth 5 bind every leaf to its primitive type", () => {
            // Force a node at the root so every run exercises tuple
            // destructuring rather than skipping degenerate leaf-only
            // shapes (a bare leaf is just a variable bound against a
            // primitive — not the spec we're pinning here). Combining
            // two depth-4 subtrees gives an overall depth ≤ 5.
            const nonLeafTreeArb: fc.Arbitrary<ShapedNode> = fc
                .tuple(shapedTreeArb(4), shapedTreeArb(4))
                .map(([left, right]) => ({ tag: "node" as const, left, right }));
            fc.assert(
                fc.property(nonLeafTreeArb, (rawTree) => {
                    const tree: ShapedNode = JSON.parse(JSON.stringify(rawTree));
                    assignNames(tree, { i: 0 });
                    const pattern = buildPattern(tree);
                    const expected = buildType(tree);
                    const leaves: Array<{ name: string; kind: LeafKind }> = [];
                    collectLeaves(tree, leaves);

                    const result = checkPattern(env, pattern, expected, emptySubst(), 0);

                    expect(result.bindings.size).toBe(leaves.length);
                    for (const { name, kind } of leaves) {
                        expect(result.bindings.get(name)).toEqual(primitiveFor(kind));
                    }
                }),
            );
        });
    });
});
