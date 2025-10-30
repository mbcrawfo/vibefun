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
import type { CoreLiteralPattern, CoreVariantPattern, CoreVarPattern } from "../types/core-ast.js";

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
        expect((result as CoreVariantPattern).constructor).toBe("Nil");
        expect((result as CoreVariantPattern).args).toHaveLength(0);
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");
        expect((result as CoreVariantPattern).args).toHaveLength(2);

        // First arg: x
        const firstArg = (result as CoreVariantPattern).args[0]!;
        expect(firstArg.kind).toBe("CoreVarPattern");
        expect((firstArg as CoreVarPattern).name).toBe("x");

        // Second arg: Nil
        const secondArg = (result as CoreVariantPattern).args[1]!;
        expect(secondArg.kind).toBe("CoreVariantPattern");
        expect((secondArg as CoreVariantPattern).constructor).toBe("Nil");
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");
        expect((result as CoreVariantPattern).args[0]!.kind).toBe("CoreWildcardPattern");
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");
        const firstArg = (result as CoreVariantPattern).args[0]!;
        expect((firstArg as CoreVarPattern).name).toBe("x");

        const tail = (result as CoreVariantPattern).args[1]! as CoreVariantPattern;
        expect(tail.kind).toBe("CoreVariantPattern");
        expect(tail.constructor).toBe("Cons");
        const tailFirstArg = tail.args[0]!;
        expect((tailFirstArg as CoreVarPattern).name).toBe("y");

        const tailTail = tail.args[1]! as CoreVariantPattern;
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
        let current: CoreVariantPattern = result as CoreVariantPattern;
        const names = [];

        while (current.constructor === "Cons") {
            const headArg = current.args[0]!;
            names.push((headArg as CoreVarPattern).name);
            current = current.args[1]! as CoreVariantPattern;
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");
        const firstArg = (result as CoreVariantPattern).args[0]!;
        expect((firstArg as CoreVarPattern).name).toBe("x");
        const secondArg = (result as CoreVariantPattern).args[1]!;
        expect(secondArg.kind).toBe("CoreVarPattern");
        expect((secondArg as CoreVarPattern).name).toBe("rest");
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");
        const firstArg = (result as CoreVariantPattern).args[0]!;
        expect((firstArg as CoreVarPattern).name).toBe("x");

        const tail = (result as CoreVariantPattern).args[1]! as CoreVariantPattern;
        expect(tail.constructor).toBe("Cons");
        const tailFirstArg = tail.args[0]!;
        expect((tailFirstArg as CoreVarPattern).name).toBe("y");
        const tailSecondArg = tail.args[1]!;
        expect(tailSecondArg.kind).toBe("CoreVarPattern");
        expect((tailSecondArg as CoreVarPattern).name).toBe("rest");
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
        expect((result as CoreVarPattern).name).toBe("rest");
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");

        // First element should be a desugared list pattern
        const firstElem = (result as CoreVariantPattern).args[0]! as CoreVariantPattern;
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");

        // First element should be Some(x)
        const firstElem = (result as CoreVariantPattern).args[0]! as CoreVariantPattern;
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
        expect((result as CoreVariantPattern).constructor).toBe("Cons");

        // First element should be literal pattern
        const firstArg = (result as CoreVariantPattern).args[0]!;
        expect(firstArg.kind).toBe("CoreLiteralPattern");
        expect((firstArg as CoreLiteralPattern).literal).toBe(1);
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
        expect((emptyResult as CoreVariantPattern).constructor).toBe("Nil");

        expect(consResult.kind).toBe("CoreVariantPattern");
        expect((consResult as CoreVariantPattern).constructor).toBe("Cons");
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
