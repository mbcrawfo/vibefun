/**
 * Tests for Tuple Type Syntax (Phase 6.1)
 *
 * Spec reference: docs/spec/03-type-system/tuples.md
 *
 * Tuple types are fixed-size, heterogeneous product types:
 * - (Int, Int) - pair of integers
 * - (String, Int, Bool) - triple
 * - () - unit type (0-tuple)
 * - (Int) - NOT a tuple, just Int (single-element parens are grouping)
 *
 * Tuples must be distinguished from function parameter lists:
 * - (Int, String) - tuple type
 * - (Int, String) -> Bool - function type with params
 */

import type { Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { Parser } from "./parser.js";

// Helper to parse source code
function parseSource(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Tuple Types", () => {
    describe("basic tuple types", () => {
        it.skip("should parse pair tuple type", () => {
            const source = "let x: (Int, Int) = (1, 2);";
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            expect(decl?.kind).toBe("LetDecl");

            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(2);
                    expect(typeExpr.elements[0]?.kind).toBe("TypeConst");
                    if (typeExpr.elements[0]?.kind === "TypeConst") {
                        expect(typeExpr.elements[0].name).toBe("Int");
                    }
                    expect(typeExpr.elements[1]?.kind).toBe("TypeConst");
                    if (typeExpr.elements[1]?.kind === "TypeConst") {
                        expect(typeExpr.elements[1].name).toBe("Int");
                    }
                }
            } else {
                throw new Error("Expected TypeAnnotatedPattern");
            }
        });

        it("should parse triple tuple type", () => {
            const source = 'let person: (String, Int, Bool) = ("Bob", 25, false);';
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(3);
                    expect(typeExpr.elements[0]?.kind).toBe("TypeConst");
                    if (typeExpr.elements[0]?.kind === "TypeConst") {
                        expect(typeExpr.elements[0].name).toBe("String");
                    }
                    expect(typeExpr.elements[1]?.kind).toBe("TypeConst");
                    if (typeExpr.elements[1]?.kind === "TypeConst") {
                        expect(typeExpr.elements[1].name).toBe("Int");
                    }
                    expect(typeExpr.elements[2]?.kind).toBe("TypeConst");
                    if (typeExpr.elements[2]?.kind === "TypeConst") {
                        expect(typeExpr.elements[2].name).toBe("Bool");
                    }
                }
            }
        });

        it("should parse unit type as 0-tuple", () => {
            const source = "let nothing: () = ();";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                // Unit type is represented as TypeConst "Unit"
                expect(typeExpr.kind).toBe("TypeConst");
                if (typeExpr.kind === "TypeConst") {
                    expect(typeExpr.name).toBe("Unit");
                }
            }
        });

        it("should parse single-element parens as type grouping, not tuple", () => {
            const source = "let x: (Int) = 42;";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                // (Int) is just Int, not a tuple
                expect(typeExpr.kind).toBe("TypeConst");
                if (typeExpr.kind === "TypeConst") {
                    expect(typeExpr.name).toBe("Int");
                }
            }
        });
    });

    describe("nested tuple types", () => {
        it("should parse nested tuple types", () => {
            const source = "let nested: ((Int, Int), (String, Bool)) = ((1, 2), (a, true));";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(2);

                    // First element: (Int, Int)
                    const first = typeExpr.elements[0];
                    expect(first?.kind).toBe("TupleType");
                    if (first?.kind === "TupleType") {
                        expect(first.elements).toHaveLength(2);
                        expect(first.elements[0]?.kind).toBe("TypeConst");
                        if (first.elements[0]?.kind === "TypeConst") {
                            expect(first.elements[0].name).toBe("Int");
                        }
                    }

                    // Second element: (String, Bool)
                    const second = typeExpr.elements[1];
                    expect(second?.kind).toBe("TupleType");
                    if (second?.kind === "TupleType") {
                        expect(second.elements).toHaveLength(2);
                        expect(second.elements[0]?.kind).toBe("TypeConst");
                        if (second.elements[0]?.kind === "TypeConst") {
                            expect(second.elements[0].name).toBe("String");
                        }
                    }
                }
            }
        });

        it("should parse deeply nested tuple types", () => {
            const source = "let deep: (((Int, Int), Int), Int) = (((1, 2), 3), 4);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(2);

                    // First element: ((Int, Int), Int)
                    const first = typeExpr.elements[0];
                    expect(first?.kind).toBe("TupleType");

                    if (first?.kind === "TupleType") {
                        // First of first: (Int, Int)
                        const nested = first.elements[0];
                        expect(nested?.kind).toBe("TupleType");
                    }
                }
            }
        });
    });

    describe("tuple types in function signatures", () => {
        it("should parse tuple as function parameter type", () => {
            const source = "let swap: ((Int, Int)) -> (Int, Int) = (pair) => { let (a, b) = pair; (b, a); };";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("FunctionType");

                if (typeExpr.kind === "FunctionType") {
                    // Parameter should be tuple type
                    expect(typeExpr.params).toHaveLength(1);
                    const param = typeExpr.params[0];
                    expect(param?.kind).toBe("TupleType");

                    // Return type should be tuple type
                    expect(typeExpr.return_.kind).toBe("TupleType");
                }
            }
        });

        it("should parse tuple as function return type", () => {
            const source = "let minMax: (Int, Int) -> (Int, Int) = (a, b) => if a < b then (a, b) else (b, a);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("FunctionType");

                if (typeExpr.kind === "FunctionType") {
                    // Parameters: (Int, Int) -> these are separate params, not a tuple
                    expect(typeExpr.params).toHaveLength(2);

                    // Return type should be tuple
                    expect(typeExpr.return_.kind).toBe("TupleType");
                    if (typeExpr.return_.kind === "TupleType") {
                        expect(typeExpr.return_.elements).toHaveLength(2);
                    }
                }
            }
        });

        it("should distinguish tuple param from multiple params", () => {
            // (Int, Int) -> Bool has TWO params (Int and Int)
            const source1 = "let add: (Int, Int) -> Int = (a, b) => a + b;";
            const module1 = parseSource(source1);

            const decl1 = module1.declarations[0];
            if (decl1?.kind === "LetDecl" && decl1.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl1.pattern.typeExpr;
                expect(typeExpr.kind).toBe("FunctionType");

                if (typeExpr.kind === "FunctionType") {
                    // Two separate parameters
                    expect(typeExpr.params).toHaveLength(2);
                    expect(typeExpr.params[0]?.kind).toBe("TypeConst");
                    expect(typeExpr.params[1]?.kind).toBe("TypeConst");
                }
            }

            // ((Int, Int)) -> Int has ONE param (a tuple)
            const source2 = "let addTuple: ((Int, Int)) -> Int = (pair) => { let (a, b) = pair; a + b; };";
            const module2 = parseSource(source2);

            const decl2 = module2.declarations[0];
            if (decl2?.kind === "LetDecl" && decl2.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl2.pattern.typeExpr;
                expect(typeExpr.kind).toBe("FunctionType");

                if (typeExpr.kind === "FunctionType") {
                    // One parameter that is a tuple
                    expect(typeExpr.params).toHaveLength(1);
                    expect(typeExpr.params[0]?.kind).toBe("TupleType");
                }
            }
        });
    });

    describe("tuple types with generics", () => {
        it.skip("should parse generic tuple type", () => {
            const source = "type Pair<A, B> = (A, B);";
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");

            if (decl?.kind === "TypeDecl") {
                expect(decl.name).toBe("Pair");
                expect(decl.params).toEqual(["A", "B"]);
                expect(decl.definition.kind).toBe("AliasType");

                if (decl.definition.kind === "AliasType") {
                    const typeExpr = decl.definition.typeExpr;
                    expect(typeExpr.kind).toBe("TupleType");

                    if (typeExpr.kind === "TupleType") {
                        expect(typeExpr.elements).toHaveLength(2);
                        expect(typeExpr.elements[0]?.kind).toBe("TypeVar");
                        if (typeExpr.elements[0]?.kind === "TypeVar") {
                            expect(typeExpr.elements[0].name).toBe("A");
                        }
                        expect(typeExpr.elements[1]?.kind).toBe("TypeVar");
                        if (typeExpr.elements[1]?.kind === "TypeVar") {
                            expect(typeExpr.elements[1].name).toBe("B");
                        }
                    }
                }
            }
        });

        it("should parse tuple with generic type applications", () => {
            const source = 'let pairs: (List<Int>, List<String>) = ([1, 2], ["a", "b"]);';
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(2);

                    // First: List<Int>
                    expect(typeExpr.elements[0]?.kind).toBe("TypeApp");
                    // Second: List<String>
                    expect(typeExpr.elements[1]?.kind).toBe("TypeApp");
                }
            }
        });
    });

    describe("tuple types in type aliases", () => {
        it("should parse named tuple types", () => {
            const source = `
                type Point2D = (Int, Int);
                type Point3D = (Int, Int, Int);
                type RGB = (Int, Int, Int);
            `;
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(3);

            // Point2D
            const point2d = module.declarations[0];
            expect(point2d?.kind).toBe("TypeDecl");
            if (point2d?.kind === "TypeDecl" && point2d.definition.kind === "AliasType") {
                expect(point2d.definition.typeExpr.kind).toBe("TupleType");
                if (point2d.definition.typeExpr.kind === "TupleType") {
                    expect(point2d.definition.typeExpr.elements).toHaveLength(2);
                }
            }

            // Point3D
            const point3d = module.declarations[1];
            if (point3d?.kind === "TypeDecl" && point3d.definition.kind === "AliasType") {
                expect(point3d.definition.typeExpr.kind).toBe("TupleType");
                if (point3d.definition.typeExpr.kind === "TupleType") {
                    expect(point3d.definition.typeExpr.elements).toHaveLength(3);
                }
            }
        });
    });

    describe("tuple types with trailing commas", () => {
        it("should parse tuple type with trailing comma", () => {
            const source = 'let pair: (Int, String,) = (1, "a");';
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(2);
                }
            }
        });
    });

    describe.skip("edge cases", () => {
        it("should handle tuple with complex types", () => {
            const source = "let complex: (Int -> String, { x: Int }, List<Bool>) = (f, rec, list);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(3);
                    // Function type
                    expect(typeExpr.elements[0]?.kind).toBe("FunctionType");
                    // Record type
                    expect(typeExpr.elements[1]?.kind).toBe("RecordType");
                    // List type (TypeApp)
                    expect(typeExpr.elements[2]?.kind).toBe("TypeApp");
                }
            }
        });

        it("should handle multiline tuple types", () => {
            const source = `let multiline: (
                Int,
                String,
                Bool
            ) = (1, "a", true);`;
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "LetDecl" && decl.pattern.kind === "TypeAnnotatedPattern") {
                const typeExpr = decl.pattern.typeExpr;
                expect(typeExpr.kind).toBe("TupleType");

                if (typeExpr.kind === "TupleType") {
                    expect(typeExpr.elements).toHaveLength(3);
                }
            }
        });
    });

    describe("error cases", () => {
        it("should error on empty tuple type (use Unit instead)", () => {
            const source = "type Empty = ();";

            // () should parse as Unit (TypeConst), not as TupleType with 0 elements
            const module = parseSource(source);
            const decl = module.declarations[0];

            if (decl?.kind === "TypeDecl" && decl.definition.kind === "AliasType") {
                // Should be TypeConst "Unit", not TupleType
                expect(decl.definition.typeExpr.kind).toBe("TypeConst");
            }
        });
    });
});
