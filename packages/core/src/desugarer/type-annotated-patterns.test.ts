/**
 * Tests for TypeAnnotatedPattern desugaring
 *
 * TypeAnnotatedPattern allows adding type annotations to patterns:
 * (x: Int) => pattern with type annotation
 * The desugarer strips the type annotation and desugars the inner pattern.
 * Type annotations are validated by the type checker separately.
 */

import type { Location, Pattern } from "../types/ast.js";
import type { CoreTuplePattern, CoreVariantPattern, CoreVarPattern } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugarPattern } from "./desugarer.js";
import { FreshVarGen } from "./FreshVarGen.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("TypeAnnotatedPattern - Basic Cases", () => {
    it("should strip type annotation from variable pattern", () => {
        // (x: Int)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "VarPattern",
                name: "x",
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeConst",
                name: "Int",
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVarPattern");
        expect((result as CoreVarPattern).name).toBe("x");
    });

    it("should strip type annotation from wildcard pattern", () => {
        // (_: Int)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "WildcardPattern",
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeConst",
                name: "Int",
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreWildcardPattern");
    });

    it("should strip type annotation from literal pattern", () => {
        // (42: Int)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "LiteralPattern",
                literal: 42,
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeConst",
                name: "Int",
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreLiteralPattern");
    });
});

describe("TypeAnnotatedPattern - Complex Type Annotations", () => {
    it("should handle generic type annotations", () => {
        // (x: List<Int>)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "VarPattern",
                name: "x",
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "List",
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVarPattern");
        expect((result as CoreVarPattern).name).toBe("x");
    });

    it("should handle tuple type annotations", () => {
        // (x: (Int, String))
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "VarPattern",
                name: "x",
                loc: testLoc,
            },
            typeExpr: {
                kind: "TupleType",
                elements: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                    {
                        kind: "TypeConst",
                        name: "String",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVarPattern");
        expect((result as CoreVarPattern).name).toBe("x");
    });
});

describe("TypeAnnotatedPattern - Nested Patterns", () => {
    it("should desugar annotation on variant pattern", () => {
        // (Some(x): Option<Int>)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "VarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "Option",
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as CoreVariantPattern).constructor).toBe("Some");
        expect((result as CoreVariantPattern).args).toHaveLength(1);
    });

    it("should desugar annotation on tuple pattern", () => {
        // ((x, y): (Int, String))
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "VarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    {
                        kind: "VarPattern",
                        name: "y",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "TupleType",
                elements: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                    {
                        kind: "TypeConst",
                        name: "String",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreTuplePattern");
        expect((result as CoreTuplePattern).elements).toHaveLength(2);
    });

    it("should handle deeply nested variant with annotation", () => {
        // (Some(Left(x)): Option<Either<Int, String>>)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "ConstructorPattern",
                        constructor: "Left",
                        args: [
                            {
                                kind: "VarPattern",
                                name: "x",
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "Option",
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "TypeApp",
                        constructor: {
                            kind: "TypeConst",
                            name: "Either",
                            loc: testLoc,
                        },
                        args: [
                            {
                                kind: "TypeConst",
                                name: "Int",
                                loc: testLoc,
                            },
                            {
                                kind: "TypeConst",
                                name: "String",
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as CoreVariantPattern).constructor).toBe("Some");

        const innerArg = (result as CoreVariantPattern).args[0];
        expect(innerArg).toBeDefined();
        expect(innerArg!.kind).toBe("CoreVariantPattern");
        expect((innerArg as CoreVariantPattern).constructor).toBe("Left");
    });
});

describe("TypeAnnotatedPattern - Multiple Annotations", () => {
    it("should handle tuple with multiple annotated elements", () => {
        // ((x: Int), (y: String)) - annotation on each element
        const pattern: Pattern = {
            kind: "TuplePattern",
            elements: [
                {
                    kind: "TypeAnnotatedPattern",
                    pattern: {
                        kind: "VarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    typeExpr: {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                {
                    kind: "TypeAnnotatedPattern",
                    pattern: {
                        kind: "VarPattern",
                        name: "y",
                        loc: testLoc,
                    },
                    typeExpr: {
                        kind: "TypeConst",
                        name: "String",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreTuplePattern");
        const elements = (result as CoreTuplePattern).elements;
        expect(elements).toHaveLength(2);
        expect(elements[0]!.kind).toBe("CoreVarPattern");
        expect(elements[1]!.kind).toBe("CoreVarPattern");
    });
});

describe("TypeAnnotatedPattern - Nested TypeAnnotatedPattern", () => {
    it("should handle double annotation (annotation on annotated pattern)", () => {
        // ((x: Int): Int) - two levels of annotation
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "x",
                    loc: testLoc,
                },
                typeExpr: {
                    kind: "TypeConst",
                    name: "Int",
                    loc: testLoc,
                },
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeConst",
                name: "Int",
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Both annotations should be stripped recursively
        expect(result.kind).toBe("CoreVarPattern");
        expect((result as CoreVarPattern).name).toBe("x");
    });

    it("should handle annotation on variant containing annotated pattern", () => {
        // (Some((x: Int)): Option<Int>) - annotation on outer and inner
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                            loc: testLoc,
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "Option",
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as CoreVariantPattern).constructor).toBe("Some");

        const innerArg = (result as CoreVariantPattern).args[0];
        expect(innerArg).toBeDefined();
        expect(innerArg!.kind).toBe("CoreVarPattern");
        expect((innerArg as CoreVarPattern).name).toBe("x");
    });
});

describe("TypeAnnotatedPattern - List Patterns", () => {
    it("should handle annotation on list pattern", () => {
        // ([x, y]: List<Int>)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "ListPattern",
                elements: [
                    {
                        kind: "VarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    {
                        kind: "VarPattern",
                        name: "y",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "List",
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // List pattern gets desugared to Cons/Nil variants
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as CoreVariantPattern).constructor).toBe("Cons");
    });

    it("should handle annotated elements within list pattern", () => {
        // [(x: Int), (y: Int)]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                {
                    kind: "TypeAnnotatedPattern",
                    pattern: {
                        kind: "VarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    typeExpr: {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                {
                    kind: "TypeAnnotatedPattern",
                    pattern: {
                        kind: "VarPattern",
                        name: "y",
                        loc: testLoc,
                    },
                    typeExpr: {
                        kind: "TypeConst",
                        name: "Int",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // List pattern gets desugared to Cons/Nil
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as CoreVariantPattern).constructor).toBe("Cons");

        // Check that inner annotations were stripped
        const firstArg = (result as CoreVariantPattern).args[0];
        expect(firstArg).toBeDefined();
        expect(firstArg!.kind).toBe("CoreVarPattern");
        expect((firstArg as CoreVarPattern).name).toBe("x");
    });
});

describe("TypeAnnotatedPattern - Record Patterns", () => {
    it("should handle annotation on record pattern", () => {
        // ({x, y}: Person)
        const pattern: Pattern = {
            kind: "TypeAnnotatedPattern",
            pattern: {
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    {
                        name: "y",
                        pattern: {
                            kind: "VarPattern",
                            name: "y",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "TypeConst",
                name: "Person",
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreRecordPattern");
    });

    it("should handle annotated patterns within record fields", () => {
        // {x: (value: Int), y}
        const pattern: Pattern = {
            kind: "RecordPattern",
            fields: [
                {
                    name: "x",
                    pattern: {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "value",
                            loc: testLoc,
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                {
                    name: "y",
                    pattern: {
                        kind: "VarPattern",
                        name: "y",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreRecordPattern");
    });
});
