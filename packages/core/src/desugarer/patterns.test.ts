/**
 * Tests for list pattern desugaring
 *
 * List patterns are desugared to Cons/Nil variant patterns:
 * [] => Nil
 * [x] => Cons(x, Nil)
 * [x, y] => Cons(x, Cons(y, Nil))
 * [x, ...rest] => Cons(x, rest)
 */

import type { Location, Pattern } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { desugarPattern, FreshVarGen } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("List Pattern - Empty List", () => {
    it("should desugar empty list pattern to Nil", () => {
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Nil");
        expect((result as any).args).toHaveLength(0);
    });
});

describe("List Pattern - Single Element", () => {
    it("should desugar single element pattern", () => {
        // [x]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [{ kind: "VarPattern", name: "x", loc: testLoc }],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Should be: Cons(x, Nil)
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args).toHaveLength(2);

        // First arg: x
        expect((result as any).args[0].kind).toBe("CoreVarPattern");
        expect((result as any).args[0].name).toBe("x");

        // Second arg: Nil
        expect((result as any).args[1].kind).toBe("CoreVariantPattern");
        expect((result as any).args[1].constructor).toBe("Nil");
    });

    it("should desugar single wildcard pattern", () => {
        // [_]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [{ kind: "WildcardPattern", loc: testLoc }],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args[0].kind).toBe("CoreWildcardPattern");
    });
});

describe("List Pattern - Two Elements", () => {
    it("should desugar two-element pattern", () => {
        // [x, y]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Should be: Cons(x, Cons(y, Nil))
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args[0].name).toBe("x");

        const tail = (result as any).args[1];
        expect(tail.kind).toBe("CoreVariantPattern");
        expect(tail.constructor).toBe("Cons");
        expect(tail.args[0].name).toBe("y");

        const tailTail = tail.args[1];
        expect(tailTail.constructor).toBe("Nil");
    });
});

describe("List Pattern - Multiple Elements", () => {
    it("should desugar three-element pattern", () => {
        // [a, b, c]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                { kind: "VarPattern", name: "a", loc: testLoc },
                { kind: "VarPattern", name: "b", loc: testLoc },
                { kind: "VarPattern", name: "c", loc: testLoc },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Walk through the chain
        let current: any = result;
        const names = [];

        while (current.constructor === "Cons") {
            names.push(current.args[0].name);
            current = current.args[1];
        }

        expect(names).toEqual(["a", "b", "c"]);
        expect(current.constructor).toBe("Nil");
    });
});

describe("List Pattern - With Rest", () => {
    it("should desugar pattern with rest", () => {
        // [x, ...rest]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [{ kind: "VarPattern", name: "x", loc: testLoc }],
            rest: { kind: "VarPattern", name: "rest", loc: testLoc },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Should be: Cons(x, rest)
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args[0].name).toBe("x");
        expect((result as any).args[1].kind).toBe("CoreVarPattern");
        expect((result as any).args[1].name).toBe("rest");
    });

    it("should desugar two elements with rest", () => {
        // [x, y, ...rest]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            rest: { kind: "VarPattern", name: "rest", loc: testLoc },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Should be: Cons(x, Cons(y, rest))
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args[0].name).toBe("x");

        const tail = (result as any).args[1];
        expect(tail.constructor).toBe("Cons");
        expect(tail.args[0].name).toBe("y");
        expect(tail.args[1].kind).toBe("CoreVarPattern");
        expect(tail.args[1].name).toBe("rest");
    });

    it("should desugar just rest pattern", () => {
        // [...rest]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [],
            rest: { kind: "VarPattern", name: "rest", loc: testLoc },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Should just be: rest (variable pattern)
        expect(result.kind).toBe("CoreVarPattern");
        expect((result as any).name).toBe("rest");
    });
});

describe("List Pattern - Nested Patterns", () => {
    it("should desugar nested list patterns", () => {
        // [[x, y], z]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                {
                    kind: "ListPattern",
                    elements: [
                        { kind: "VarPattern", name: "x", loc: testLoc },
                        { kind: "VarPattern", name: "y", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                { kind: "VarPattern", name: "z", loc: testLoc },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        // Outer should be Cons
        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");

        // First element should be a desugared list pattern
        const firstElem = (result as any).args[0];
        expect(firstElem.kind).toBe("CoreVariantPattern");
        expect(firstElem.constructor).toBe("Cons");
    });

    it("should desugar constructor patterns in list", () => {
        // [Some(x), None]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                {
                    kind: "ConstructorPattern",
                    constructor: "Some",
                    args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                {
                    kind: "ConstructorPattern",
                    constructor: "None",
                    args: [],
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");

        // First element should be Some(x)
        const firstElem = (result as any).args[0];
        expect(firstElem.kind).toBe("CoreVariantPattern");
        expect(firstElem.constructor).toBe("Some");
    });

    it("should desugar literal patterns in list", () => {
        // [1, 2, 3]
        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [
                { kind: "LiteralPattern", literal: 1, loc: testLoc },
                { kind: "LiteralPattern", literal: 2, loc: testLoc },
                { kind: "LiteralPattern", literal: 3, loc: testLoc },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVariantPattern");
        expect((result as any).constructor).toBe("Cons");

        // First element should be literal pattern
        expect((result as any).args[0].kind).toBe("CoreLiteralPattern");
        expect((result as any).args[0].literal).toBe(1);
    });
});

describe("List Pattern - In Match Expressions", () => {
    it("should work in match cases (conceptually)", () => {
        // Testing that pattern desugaring works for use in match
        // match list { | [] => 0 | [x, ...rest] => x + sum(rest) }

        const emptyPattern: Pattern = {
            kind: "ListPattern",
            elements: [],
            loc: testLoc,
        };

        const consPattern: Pattern = {
            kind: "ListPattern",
            elements: [{ kind: "VarPattern", name: "x", loc: testLoc }],
            rest: { kind: "VarPattern", name: "rest", loc: testLoc },
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const emptyResult = desugarPattern(emptyPattern, gen);
        const consResult = desugarPattern(consPattern, gen);

        expect(emptyResult.kind).toBe("CoreVariantPattern");
        expect((emptyResult as any).constructor).toBe("Nil");

        expect(consResult.kind).toBe("CoreVariantPattern");
        expect((consResult as any).constructor).toBe("Cons");
    });
});

describe("List Pattern - Source Locations", () => {
    it("should preserve source locations", () => {
        const patternLoc: Location = {
            file: "test.vf",
            line: 15,
            column: 8,
            offset: 200,
        };

        const pattern: Pattern = {
            kind: "ListPattern",
            elements: [{ kind: "VarPattern", name: "x", loc: testLoc }],
            loc: patternLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.loc).toBe(patternLoc);
    });
});

describe("Or-Pattern - Error", () => {
    it("should throw error if or-pattern reaches desugarPattern", () => {
        // Or-patterns should be expanded at Match level
        // If one reaches desugarPattern, it's a compiler bug
        const pattern: Pattern = {
            kind: "OrPattern",
            patterns: [
                { kind: "VarPattern", name: "a", loc: testLoc },
                { kind: "VarPattern", name: "b", loc: testLoc },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        expect(() => desugarPattern(pattern, gen)).toThrow("Or-pattern should have been expanded");
    });
});
