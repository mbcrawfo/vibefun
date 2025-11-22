/**
 * Tests for Recursive Type Definitions (Phase 6.2)
 *
 * Spec reference: docs/spec/03-type-system/recursive-types.md
 *
 * Recursive types allow a type to reference itself:
 * - Simple recursion: type List<T> = Nil | Cons(T, List<T>)
 * - Mutually recursive: type A = ... B ... and B = ... A ...
 * - Recursive records: type Node = { value: Int, next: Option<Node> }
 *
 * Requirements:
 * - Recursion must be guarded by constructor (variant or record)
 * - Direct self-reference without constructor is infinite type (error)
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

describe("Recursive Types", () => {
    describe("simple recursive types", () => {
        it("should parse recursive list type", () => {
            const source = "type List<t> = Nil | Cons(t, List<t>);";
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");

            if (decl?.kind === "TypeDecl") {
                expect(decl.name).toBe("List");
                expect(decl.params).toEqual(["t"]);
                expect(decl.definition.kind).toBe("VariantTypeDef");

                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);

                    // Nil constructor
                    expect(decl.definition.constructors[0]?.name).toBe("Nil");
                    expect(decl.definition.constructors[0]?.args).toHaveLength(0);

                    // Cons constructor with recursive reference
                    expect(decl.definition.constructors[1]?.name).toBe("Cons");
                    expect(decl.definition.constructors[1]?.args).toHaveLength(2);

                    // First arg: t (type variable)
                    const firstArg = decl.definition.constructors[1]?.args[0];
                    expect(firstArg?.kind).toBe("TypeVar");
                    if (firstArg?.kind === "TypeVar") {
                        expect(firstArg.name).toBe("t");
                    }

                    // Second arg: List<t> (recursive type application)
                    const secondArg = decl.definition.constructors[1]?.args[1];
                    expect(secondArg?.kind).toBe("TypeApp");
                    if (secondArg?.kind === "TypeApp") {
                        expect(secondArg.constructor.kind).toBe("TypeConst");
                        if (secondArg.constructor.kind === "TypeConst") {
                            expect(secondArg.constructor.name).toBe("List");
                        }
                        expect(secondArg.args).toHaveLength(1);
                        expect(secondArg.args[0]?.kind).toBe("TypeVar");
                    }
                }
            }
        });

        it("should parse recursive tree type", () => {
            const source = "type Tree<t> = Leaf(t) | Node(Tree<t>, Tree<t>);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(2);

                // Leaf constructor
                expect(decl.definition.constructors[0]?.name).toBe("Leaf");

                // Node constructor with two recursive references
                const nodeConstructor = decl.definition.constructors[1];
                expect(nodeConstructor?.name).toBe("Node");
                expect(nodeConstructor?.args).toHaveLength(2);

                // Both args should be Tree<t>
                const leftTree = nodeConstructor?.args[0];
                const rightTree = nodeConstructor?.args[1];

                expect(leftTree?.kind).toBe("TypeApp");
                expect(rightTree?.kind).toBe("TypeApp");

                if (leftTree?.kind === "TypeApp" && leftTree.constructor.kind === "TypeConst") {
                    expect(leftTree.constructor.name).toBe("Tree");
                }

                if (rightTree?.kind === "TypeApp" && rightTree.constructor.kind === "TypeConst") {
                    expect(rightTree.constructor.name).toBe("Tree");
                }
            }
        });

        it("should parse recursive expression type", () => {
            const source = "type Expr = Lit(Int) | Add(Expr, Expr) | Mul(Expr, Expr);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);

                // Lit(Int) - base case
                expect(decl.definition.constructors[0]?.name).toBe("Lit");

                // Add(Expr, Expr) - recursive
                const addCons = decl.definition.constructors[1];
                expect(addCons?.name).toBe("Add");
                expect(addCons?.args).toHaveLength(2);

                // Both args should be TypeConst "Expr"
                expect(addCons?.args[0]?.kind).toBe("TypeConst");
                if (addCons?.args[0]?.kind === "TypeConst") {
                    expect(addCons.args[0].name).toBe("Expr");
                }

                expect(addCons?.args[1]?.kind).toBe("TypeConst");
                if (addCons?.args[1]?.kind === "TypeConst") {
                    expect(addCons.args[1].name).toBe("Expr");
                }
            }
        });
    });

    describe("recursive record types", () => {
        it("should parse recursive record with Option", () => {
            const source = "type Node = { value: Int, next: Option<Node> };";
            const module = parseSource(source);

            const decl = module.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");

            if (decl?.kind === "TypeDecl") {
                expect(decl.name).toBe("Node");
                expect(decl.definition.kind).toBe("RecordTypeDef");

                if (decl.definition.kind === "RecordTypeDef") {
                    expect(decl.definition.fields).toHaveLength(2);

                    // value: Int
                    expect(decl.definition.fields[0]?.name).toBe("value");
                    expect(decl.definition.fields[0]?.typeExpr.kind).toBe("TypeConst");

                    // next: Option<Node>
                    expect(decl.definition.fields[1]?.name).toBe("next");
                    const nextType = decl.definition.fields[1]?.typeExpr;
                    expect(nextType?.kind).toBe("TypeApp");

                    if (nextType?.kind === "TypeApp") {
                        expect(nextType.constructor.kind).toBe("TypeConst");
                        if (nextType.constructor.kind === "TypeConst") {
                            expect(nextType.constructor.name).toBe("Option");
                        }

                        expect(nextType.args).toHaveLength(1);
                        expect(nextType.args[0]?.kind).toBe("TypeConst");
                        if (nextType.args[0]?.kind === "TypeConst") {
                            expect(nextType.args[0].name).toBe("Node");
                        }
                    }
                }
            }
        });

        it("should parse recursive record with List", () => {
            const source = "type Directory = { name: String, children: List<Directory> };";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "TypeDecl" && decl.definition.kind === "RecordTypeDef") {
                expect(decl.definition.fields).toHaveLength(2);

                const childrenField = decl.definition.fields[1];
                expect(childrenField?.name).toBe("children");

                const childrenType = childrenField?.typeExpr;
                expect(childrenType?.kind).toBe("TypeApp");

                if (childrenType?.kind === "TypeApp" && childrenType.constructor.kind === "TypeConst") {
                    expect(childrenType.constructor.name).toBe("List");
                    expect(childrenType.args[0]?.kind).toBe("TypeConst");
                    if (childrenType.args[0]?.kind === "TypeConst") {
                        expect(childrenType.args[0].name).toBe("Directory");
                    }
                }
            }
        });
    });

    describe("deeply nested recursion", () => {
        it("should parse deeply nested recursive type", () => {
            const source =
                "type Json = JNull | JBool(Bool) | JNumber(Float) | JString(String) | JArray(List<Json>) | JObject(List<(String, Json)>);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(6);

                // JArray(List<Json>)
                const jArrayCons = decl.definition.constructors[4];
                expect(jArrayCons?.name).toBe("JArray");
                expect(jArrayCons?.args).toHaveLength(1);

                const jArrayArg = jArrayCons?.args[0];
                expect(jArrayArg?.kind).toBe("TypeApp");
                if (jArrayArg?.kind === "TypeApp") {
                    // List<Json>
                    expect(jArrayArg.constructor.kind).toBe("TypeConst");
                    if (jArrayArg.constructor.kind === "TypeConst") {
                        expect(jArrayArg.constructor.name).toBe("List");
                    }

                    expect(jArrayArg.args[0]?.kind).toBe("TypeConst");
                    if (jArrayArg.args[0]?.kind === "TypeConst") {
                        expect(jArrayArg.args[0].name).toBe("Json");
                    }
                }

                // JObject(List<(String, Json)>)
                const jObjectCons = decl.definition.constructors[5];
                expect(jObjectCons?.name).toBe("JObject");

                const jObjectArg = jObjectCons?.args[0];
                expect(jObjectArg?.kind).toBe("TypeApp");
                if (jObjectArg?.kind === "TypeApp") {
                    // List<...>
                    expect(jObjectArg.constructor.kind).toBe("TypeConst");

                    // Arg is tuple (String, Json)
                    const tupleType = jObjectArg.args[0];
                    expect(tupleType?.kind).toBe("TupleType");
                    if (tupleType?.kind === "TupleType") {
                        expect(tupleType.elements).toHaveLength(2);
                        expect(tupleType.elements[0]?.kind).toBe("TypeConst");
                        if (tupleType.elements[0]?.kind === "TypeConst") {
                            expect(tupleType.elements[0].name).toBe("String");
                        }

                        expect(tupleType.elements[1]?.kind).toBe("TypeConst");
                        if (tupleType.elements[1]?.kind === "TypeConst") {
                            expect(tupleType.elements[1].name).toBe("Json");
                        }
                    }
                }
            }
        });
    });

    describe("multiple type declarations", () => {
        it("should parse multiple recursive types in sequence", () => {
            const source = `
                type List<t> = Nil | Cons(t, List<t>);
                type Tree<t> = Leaf(t) | Node(Tree<t>, Tree<t>);
                type Expr = Lit(Int) | Add(Expr, Expr);
            `;
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(3);

            // List
            const listDecl = module.declarations[0];
            expect(listDecl?.kind).toBe("TypeDecl");
            if (listDecl?.kind === "TypeDecl") {
                expect(listDecl.name).toBe("List");
            }

            // Tree
            const treeDecl = module.declarations[1];
            expect(treeDecl?.kind).toBe("TypeDecl");
            if (treeDecl?.kind === "TypeDecl") {
                expect(treeDecl.name).toBe("Tree");
            }

            // Expr
            const exprDecl = module.declarations[2];
            expect(exprDecl?.kind).toBe("TypeDecl");
            if (exprDecl?.kind === "TypeDecl") {
                expect(exprDecl.name).toBe("Expr");
            }
        });
    });

    describe("complex recursive patterns", () => {
        it("should parse type with nested recursive references", () => {
            const source = "type RoseTree<t> = Node(t, List<RoseTree<t>>);";
            const module = parseSource(source);

            const decl = module.declarations[0];
            if (decl?.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                const nodeCons = decl.definition.constructors[0];
                expect(nodeCons?.name).toBe("Node");
                expect(nodeCons?.args).toHaveLength(2);

                // Second arg: List<RoseTree<t>>
                const listArg = nodeCons?.args[1];
                expect(listArg?.kind).toBe("TypeApp");
                if (listArg?.kind === "TypeApp") {
                    // List
                    expect(listArg.constructor.kind).toBe("TypeConst");

                    // Arg: RoseTree<t>
                    const roseTreeArg = listArg.args[0];
                    expect(roseTreeArg?.kind).toBe("TypeApp");
                    if (roseTreeArg?.kind === "TypeApp" && roseTreeArg.constructor.kind === "TypeConst") {
                        expect(roseTreeArg.constructor.name).toBe("RoseTree");
                    }
                }
            }
        });
    });

    describe("mutually recursive types (with and keyword)", () => {
        it("should parse mutually recursive expression and pattern types", () => {
            const source = `
                type Expr = Lit(Int) | Var(String) | Lambda(Pattern, Expr) | App(Expr, Expr)
                and Pattern = PWildcard | PVar(String) | PCons(Pattern, Pattern) | PExpr(Expr);
            `;
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(2);

            // First type: Expr
            const exprDecl = module.declarations[0];
            expect(exprDecl?.kind).toBe("TypeDecl");
            if (exprDecl?.kind === "TypeDecl") {
                expect(exprDecl.name).toBe("Expr");
                expect(exprDecl.definition.kind).toBe("VariantTypeDef");

                if (exprDecl.definition.kind === "VariantTypeDef") {
                    // Lambda constructor should reference Pattern
                    const lambdaCons = exprDecl.definition.constructors[2];
                    expect(lambdaCons?.name).toBe("Lambda");
                    expect(lambdaCons?.args).toHaveLength(2);

                    const patternArg = lambdaCons?.args[0];
                    expect(patternArg?.kind).toBe("TypeConst");
                    if (patternArg?.kind === "TypeConst") {
                        expect(patternArg.name).toBe("Pattern");
                    }
                }
            }

            // Second type: Pattern
            const patternDecl = module.declarations[1];
            expect(patternDecl?.kind).toBe("TypeDecl");
            if (patternDecl?.kind === "TypeDecl") {
                expect(patternDecl.name).toBe("Pattern");
                expect(patternDecl.definition.kind).toBe("VariantTypeDef");

                if (patternDecl.definition.kind === "VariantTypeDef") {
                    // PExpr constructor should reference Expr
                    const pExprCons = patternDecl.definition.constructors[3];
                    expect(pExprCons?.name).toBe("PExpr");
                    expect(pExprCons?.args).toHaveLength(1);

                    const exprArg = pExprCons?.args[0];
                    expect(exprArg?.kind).toBe("TypeConst");
                    if (exprArg?.kind === "TypeConst") {
                        expect(exprArg.name).toBe("Expr");
                    }
                }
            }
        });

        it("should parse multiple mutually recursive types", () => {
            const source = `
                type A = ConsA(B)
                and B = ConsB(C)
                and C = ConsC(A);
            `;
            const module = parseSource(source);

            expect(module.declarations).toHaveLength(3);

            // A references B
            const aDecl = module.declarations[0];
            expect(aDecl?.kind).toBe("TypeDecl");
            if (aDecl?.kind === "TypeDecl") {
                expect(aDecl.name).toBe("A");
            }

            // B references C
            const bDecl = module.declarations[1];
            expect(bDecl?.kind).toBe("TypeDecl");
            if (bDecl?.kind === "TypeDecl") {
                expect(bDecl.name).toBe("B");
            }

            // C references A
            const cDecl = module.declarations[2];
            expect(cDecl?.kind).toBe("TypeDecl");
            if (cDecl?.kind === "TypeDecl") {
                expect(cDecl.name).toBe("C");
            }
        });
    });
});
