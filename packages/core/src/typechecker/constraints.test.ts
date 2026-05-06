/**
 * Tests for type constraints and constraint solver
 */

import type { Location } from "../types/ast.js";
import type { Type, TypeScheme } from "../types/environment.js";

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { equalityConstraintArb, typeArb, typeSubstitutionArb } from "../types/test-arbitraries/index.js";
import { applySubstToConstraint, equalityConstraint, instanceConstraint, solveConstraints } from "./constraints.js";
import {
    appType,
    constType,
    freshTypeVar,
    funType,
    primitiveTypes,
    recordType,
    resetTypeVarCounter,
    typeEquals,
    variantType,
} from "./types.js";
import { unifyEquivalent } from "./unify-test-helpers.js";
import { applySubst, emptySubst, singleSubst } from "./unify.js";

// Test location for constraints
const testLoc: Location = { file: "test.vf", line: 1, column: 1, offset: 0 };

describe("equalityConstraint", () => {
    it("should create an equality constraint with two types", () => {
        const constraint = equalityConstraint(primitiveTypes.Int, primitiveTypes.String, testLoc);

        expect(constraint.kind).toBe("Equality");
        expect(constraint.t1).toEqual(primitiveTypes.Int);
        expect(constraint.t2).toEqual(primitiveTypes.String);
        expect(constraint.loc).toEqual(testLoc);
    });

    it("should preserve location information", () => {
        const loc: Location = { file: "other.vf", line: 5, column: 10, offset: 50 };
        const constraint = equalityConstraint(primitiveTypes.Int, primitiveTypes.Int, loc);

        expect(constraint.loc).toEqual(loc);
    });

    it("should work with type variables", () => {
        resetTypeVarCounter();
        const t = freshTypeVar();
        const constraint = equalityConstraint(t, primitiveTypes.Int, testLoc);

        expect(constraint.t1).toEqual(t);
        expect(constraint.t2).toEqual(primitiveTypes.Int);
    });

    it("should work with function types", () => {
        const funcType = funType([primitiveTypes.Int], primitiveTypes.String);
        const constraint = equalityConstraint(funcType, funcType, testLoc);

        expect(constraint.t1).toEqual(funcType);
        expect(constraint.t2).toEqual(funcType);
    });

    it("should work with complex types", () => {
        const listOfInt = appType(constType("List"), [primitiveTypes.Int]);
        const recordT = recordType(new Map([["x", primitiveTypes.Int]]));
        const constraint = equalityConstraint(listOfInt, recordT, testLoc);

        expect(constraint.t1).toEqual(listOfInt);
        expect(constraint.t2).toEqual(recordT);
    });
});

describe("instanceConstraint", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should create an instance constraint", () => {
        const scheme: TypeScheme = {
            vars: [0, 1],
            type: funType([{ type: "Var", id: 0, level: 0 }], { type: "Var", id: 1, level: 0 }),
        };
        const instanceType = funType([primitiveTypes.Int], primitiveTypes.String);

        const constraint = instanceConstraint(scheme, instanceType, testLoc);

        expect(constraint.kind).toBe("Instance");
        expect(constraint.scheme).toEqual(scheme);
        expect(constraint.type).toEqual(instanceType);
        expect(constraint.loc).toEqual(testLoc);
    });

    it("should preserve location information", () => {
        const loc: Location = { file: "module.vf", line: 10, column: 5, offset: 100 };
        const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };

        const constraint = instanceConstraint(scheme, primitiveTypes.Int, loc);

        expect(constraint.loc).toEqual(loc);
    });

    it("should work with monomorphic schemes (no quantified vars)", () => {
        const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };
        const constraint = instanceConstraint(scheme, primitiveTypes.Int, testLoc);

        expect(constraint.scheme.vars).toEqual([]);
        expect(constraint.type).toEqual(primitiveTypes.Int);
    });

    it("should work with polymorphic schemes", () => {
        // forall a. a -> a (identity function type)
        const scheme: TypeScheme = {
            vars: [0],
            type: funType([{ type: "Var", id: 0, level: 0 }], { type: "Var", id: 0, level: 0 }),
        };
        const instanceType = funType([primitiveTypes.Int], primitiveTypes.Int);

        const constraint = instanceConstraint(scheme, instanceType, testLoc);

        expect(constraint.scheme.vars).toEqual([0]);
        expect(constraint.type).toEqual(instanceType);
    });
});

describe("solveConstraints", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should return empty substitution for empty constraint list", () => {
        const subst = solveConstraints([]);
        expect(subst.size).toBe(0);
    });

    it("should solve single equality constraint with identical types", () => {
        const constraint = equalityConstraint(primitiveTypes.Int, primitiveTypes.Int, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(0);
    });

    it("should solve single equality constraint with type variable", () => {
        const t = freshTypeVar();
        const constraint = equalityConstraint(t, primitiveTypes.Int, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should solve equality constraint with type variable on right side", () => {
        const t = freshTypeVar();
        const constraint = equalityConstraint(primitiveTypes.String, t, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(1);
        expect(applySubst(subst, t)).toEqual(primitiveTypes.String);
    });

    it("should solve multiple equality constraints", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();

        const constraints = [
            equalityConstraint(t1, primitiveTypes.Int, testLoc),
            equalityConstraint(t2, primitiveTypes.String, testLoc),
        ];
        const subst = solveConstraints(constraints);

        expect(subst.size).toBe(2);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
        expect(subst.get(1)).toEqual(primitiveTypes.String);
    });

    it("should accumulate substitutions across constraints", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();

        // First constraint: t1 = t2
        // Second constraint: t2 = Int
        // Result: t1 -> Int, t2 -> Int
        const constraints = [equalityConstraint(t1, t2, testLoc), equalityConstraint(t2, primitiveTypes.Int, testLoc)];
        const subst = solveConstraints(constraints);

        expect(applySubst(subst, t1)).toEqual(primitiveTypes.Int);
        expect(applySubst(subst, t2)).toEqual(primitiveTypes.Int);
    });

    it("should solve constraints with function types", () => {
        const t = freshTypeVar();
        const funcType1 = funType([t], primitiveTypes.String);
        const funcType2 = funType([primitiveTypes.Int], primitiveTypes.String);

        const constraint = equalityConstraint(funcType1, funcType2, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should solve constraints with type applications", () => {
        const t = freshTypeVar();
        const list1 = appType(constType("List"), [t]);
        const list2 = appType(constType("List"), [primitiveTypes.Int]);

        const constraint = equalityConstraint(list1, list2, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should solve constraints with record types", () => {
        const t = freshTypeVar();
        const rec1 = recordType(new Map([["x", t]]));
        const rec2 = recordType(new Map([["x", primitiveTypes.Int]]));

        const constraint = equalityConstraint(rec1, rec2, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should solve constraints with variant types", () => {
        const t = freshTypeVar();
        const variant1 = variantType(
            new Map([
                ["Some", [t]],
                ["None", []],
            ]),
        );
        const variant2 = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );

        const constraint = equalityConstraint(variant1, variant2, testLoc);
        const subst = solveConstraints([constraint]);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should throw on unsatisfiable equality constraint", () => {
        const constraint = equalityConstraint(primitiveTypes.Int, primitiveTypes.String, testLoc);

        expect(() => solveConstraints([constraint])).toThrow(VibefunDiagnostic);
    });

    it("should throw when function arities don't match", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int, primitiveTypes.Bool], primitiveTypes.String);
        const constraint = equalityConstraint(f1, f2, testLoc);

        expect(() => solveConstraints([constraint])).toThrow(VibefunDiagnostic);
    });

    it("should handle instance constraints (no-op in current implementation)", () => {
        const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };
        const constraint = instanceConstraint(scheme, primitiveTypes.Int, testLoc);

        // Instance constraints are currently a no-op, should not throw
        const subst = solveConstraints([constraint]);
        expect(subst.size).toBe(0);
    });

    it("should handle mixed equality and instance constraints", () => {
        const t = freshTypeVar();
        const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };

        const constraints = [
            equalityConstraint(t, primitiveTypes.Int, testLoc),
            instanceConstraint(scheme, primitiveTypes.Int, testLoc),
        ];
        const subst = solveConstraints(constraints);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should apply accumulated substitution to later constraints", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();

        // Constraints:
        // 1. t1 = Int
        // 2. t2 = t1 (t1 should already be resolved to Int)
        const constraints = [equalityConstraint(t1, primitiveTypes.Int, testLoc), equalityConstraint(t2, t1, testLoc)];
        const subst = solveConstraints(constraints);

        expect(applySubst(subst, t2)).toEqual(primitiveTypes.Int);
    });
});

describe("applySubstToConstraint", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    describe("equality constraints", () => {
        it("should apply substitution to both types in equality constraint", () => {
            const t = freshTypeVar();
            const constraint = equalityConstraint(t, primitiveTypes.String, testLoc);
            const subst = singleSubst(0, primitiveTypes.Int);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Equality");
            if (result.kind === "Equality") {
                expect(result.t1).toEqual(primitiveTypes.Int);
                expect(result.t2).toEqual(primitiveTypes.String);
            }
        });

        it("should apply substitution to type variable on right side", () => {
            const t = freshTypeVar();
            const constraint = equalityConstraint(primitiveTypes.String, t, testLoc);
            const subst = singleSubst(0, primitiveTypes.Int);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Equality");
            if (result.kind === "Equality") {
                expect(result.t1).toEqual(primitiveTypes.String);
                expect(result.t2).toEqual(primitiveTypes.Int);
            }
        });

        it("should apply substitution to both sides when both have type variables", () => {
            const t1 = freshTypeVar();
            const t2 = freshTypeVar();
            const constraint = equalityConstraint(t1, t2, testLoc);

            const subst = new Map<number, Type>();
            subst.set(0, primitiveTypes.Int);
            subst.set(1, primitiveTypes.String);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Equality");
            if (result.kind === "Equality") {
                expect(result.t1).toEqual(primitiveTypes.Int);
                expect(result.t2).toEqual(primitiveTypes.String);
            }
        });

        it("should preserve location when applying substitution", () => {
            const t = freshTypeVar();
            const loc: Location = { file: "test.vf", line: 42, column: 10, offset: 500 };
            const constraint = equalityConstraint(t, primitiveTypes.String, loc);
            const subst = singleSubst(0, primitiveTypes.Int);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.loc).toEqual(loc);
        });

        it("should handle nested types in substitution", () => {
            const t = freshTypeVar();
            const funcType = funType([t], primitiveTypes.String);
            const constraint = equalityConstraint(funcType, primitiveTypes.Int, testLoc);
            const subst = singleSubst(0, primitiveTypes.Bool);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Equality");
            if (result.kind === "Equality") {
                expect(result.t1).toEqual(funType([primitiveTypes.Bool], primitiveTypes.String));
            }
        });

        it("should leave constant types unchanged", () => {
            const constraint = equalityConstraint(primitiveTypes.Int, primitiveTypes.String, testLoc);
            const subst = singleSubst(0, primitiveTypes.Bool);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Equality");
            if (result.kind === "Equality") {
                expect(result.t1).toEqual(primitiveTypes.Int);
                expect(result.t2).toEqual(primitiveTypes.String);
            }
        });

        it("should handle empty substitution", () => {
            const t = freshTypeVar();
            const constraint = equalityConstraint(t, primitiveTypes.String, testLoc);
            const subst = new Map<number, Type>();

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Equality");
            if (result.kind === "Equality") {
                expect(result.t1).toEqual(t);
                expect(result.t2).toEqual(primitiveTypes.String);
            }
        });
    });

    describe("instance constraints", () => {
        it("should apply substitution only to type field, not scheme", () => {
            const t = freshTypeVar();
            const scheme: TypeScheme = {
                vars: [0],
                type: funType([{ type: "Var", id: 0, level: 0 }], { type: "Var", id: 0, level: 0 }),
            };
            const constraint = instanceConstraint(scheme, t, testLoc);
            const subst = singleSubst(0, primitiveTypes.Int);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Instance");
            if (result.kind === "Instance") {
                // Scheme should be unchanged
                expect(result.scheme).toEqual(scheme);
                // Type should have substitution applied
                expect(result.type).toEqual(primitiveTypes.Int);
            }
        });

        it("should preserve location when applying substitution", () => {
            const t = freshTypeVar();
            const loc: Location = { file: "module.vf", line: 100, column: 1, offset: 1000 };
            const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };
            const constraint = instanceConstraint(scheme, t, loc);
            const subst = singleSubst(0, primitiveTypes.String);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.loc).toEqual(loc);
        });

        it("should handle complex type in instance constraint", () => {
            const t = freshTypeVar();
            const funcType = funType([t], primitiveTypes.String);
            const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };
            const constraint = instanceConstraint(scheme, funcType, testLoc);
            const subst = singleSubst(0, primitiveTypes.Bool);

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Instance");
            if (result.kind === "Instance") {
                expect(result.type).toEqual(funType([primitiveTypes.Bool], primitiveTypes.String));
            }
        });

        it("should handle empty substitution", () => {
            const t = freshTypeVar();
            const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };
            const constraint = instanceConstraint(scheme, t, testLoc);
            const subst = new Map<number, Type>();

            const result = applySubstToConstraint(subst, constraint);

            expect(result.kind).toBe("Instance");
            if (result.kind === "Instance") {
                expect(result.type).toEqual(t);
            }
        });
    });
});

describe("constraint edge cases", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should handle chained type variable constraints", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const t3 = freshTypeVar();

        // t1 = t2, t2 = t3, t3 = Int
        // All should resolve to Int
        const constraints = [
            equalityConstraint(t1, t2, testLoc),
            equalityConstraint(t2, t3, testLoc),
            equalityConstraint(t3, primitiveTypes.Int, testLoc),
        ];
        const subst = solveConstraints(constraints);

        expect(applySubst(subst, t1)).toEqual(primitiveTypes.Int);
        expect(applySubst(subst, t2)).toEqual(primitiveTypes.Int);
        expect(applySubst(subst, t3)).toEqual(primitiveTypes.Int);
    });

    it("should handle self-referential type variable (same variable)", () => {
        const t = freshTypeVar();
        const constraint = equalityConstraint(t, t, testLoc);
        const subst = solveConstraints([constraint]);

        // Should succeed with empty substitution (reflexive)
        expect(subst.size).toBe(0);
    });

    it("should detect occurs check violation", () => {
        const t = freshTypeVar();
        const listOfT = appType(constType("List"), [t]);
        const constraint = equalityConstraint(t, listOfT, testLoc);

        expect(() => solveConstraints([constraint])).toThrow(VibefunDiagnostic);
    });

    it("should handle constraints with complex nested function types", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();

        // (t1 -> t2) -> String = (Int -> Bool) -> String
        const f1 = funType([funType([t1], t2)], primitiveTypes.String);
        const f2 = funType([funType([primitiveTypes.Int], primitiveTypes.Bool)], primitiveTypes.String);

        const constraint = equalityConstraint(f1, f2, testLoc);
        const subst = solveConstraints([constraint]);

        expect(applySubst(subst, t1)).toEqual(primitiveTypes.Int);
        expect(applySubst(subst, t2)).toEqual(primitiveTypes.Bool);
    });
});

describe("Constraint Solver Algebraic Properties", () => {
    it("property: empty constraint set yields the empty substitution", () => {
        const subst = solveConstraints([]);
        expect(subst.size).toBe(0);
    });

    it("property: solveConstraints is deterministic — same input yields same output", () => {
        fc.assert(
            fc.property(fc.array(equalityConstraintArb, { maxLength: 4 }), (constraints) => {
                const a = trySolve(constraints);
                const b = trySolve(constraints);
                expect(a.ok).toBe(b.ok);
                if (a.ok && b.ok) {
                    expect(a.subst.size).toBe(b.subst.size);
                    for (const [id, type] of a.subst) {
                        expect(typeEquals(type, b.subst.get(id) as Type)).toBe(true);
                    }
                }
            }),
        );
    });

    it("property: consistency — applying the solved subst makes every equality constraint hold under unify-equivalence", () => {
        // For any equality constraint set the solver accepts, applying the
        // returned substitution to both sides must satisfy the directional
        // post-condition of `unify` — `σ(t1) <: σ(t2)` under one-sided width
        // subtyping at record positions, structural equality elsewhere. This
        // is the constraint-solver analog of unification soundness; see
        // `unifyRecords` in unify.ts and docs/spec/03-type-system/subtyping.md.
        fc.assert(
            fc.property(fc.array(equalityConstraintArb, { maxLength: 3 }), (constraints) => {
                const r = trySolve(constraints);
                if (!r.ok) {
                    return;
                }
                for (const c of constraints) {
                    const left = applySubst(r.subst, c.t1);
                    const right = applySubst(r.subst, c.t2);
                    expect(unifyEquivalent(left, right)).toBe(true);
                }
            }),
        );
    });

    it("regression: width-subtyped equality constraint satisfies the consistency oracle (fuzz seed -234729922)", () => {
        // Shrunken counterexample from the 2026-05-04 weekly fuzz run. The
        // solver accepts the narrower-then-wider equality, binds the var, and
        // the post-condition holds under one-sided width subtyping even
        // though strict structural equality does not.
        const t1 = recordType(new Map<string, Type>([["x", { type: "Var", id: 0, level: 0 }]]));
        const t2 = recordType(
            new Map<string, Type>([
                [
                    "x",
                    {
                        type: "Tuple",
                        elements: [primitiveTypes.Int, { type: "Var", id: 1, level: 0 }],
                    },
                ],
                ["name", funType([], primitiveTypes.Int)],
            ]),
        );

        const subst = solveConstraints([equalityConstraint(t1, t2, testLoc)]);

        expect(unifyEquivalent(applySubst(subst, t1), applySubst(subst, t2))).toBe(true);
        // Strict structural equality must still detect the field-set
        // difference, pinning the oracle's discriminating behaviour.
        expect(typeEquals(applySubst(subst, t1), applySubst(subst, t2))).toBe(false);
    });

    it("property: applySubstToConstraint with empty subst is the identity (modulo structural equality)", () => {
        fc.assert(
            fc.property(equalityConstraintArb, (c) => {
                const result = applySubstToConstraint(emptySubst(), c);
                expect(result.kind).toBe("Equality");
                if (result.kind === "Equality") {
                    expect(typeEquals(result.t1, c.t1)).toBe(true);
                    expect(typeEquals(result.t2, c.t2)).toBe(true);
                }
            }),
        );
    });

    it("property: applySubstToConstraint is consistent with applySubst on both sides", () => {
        fc.assert(
            fc.property(typeSubstitutionArb(), equalityConstraintArb, (subst, c) => {
                const result = applySubstToConstraint(subst, c);
                expect(result.kind).toBe("Equality");
                if (result.kind === "Equality") {
                    expect(typeEquals(result.t1, applySubst(subst, c.t1))).toBe(true);
                    expect(typeEquals(result.t2, applySubst(subst, c.t2))).toBe(true);
                }
            }),
        );
    });

    it("property: a single equality constraint of t with itself solves with σ that leaves t unchanged", () => {
        fc.assert(
            fc.property(typeArb(), (t) => {
                const subst = solveConstraints([equalityConstraint(t, t, testLoc)]);
                expect(typeEquals(applySubst(subst, t), t)).toBe(true);
            }),
        );
    });
});

function trySolve(
    constraints: ReturnType<typeof equalityConstraint>[],
): { ok: true; subst: ReturnType<typeof solveConstraints> } | { ok: false } {
    try {
        return { ok: true, subst: solveConstraints(constraints) };
    } catch (e) {
        if (e instanceof VibefunDiagnostic) {
            return { ok: false };
        }
        throw e;
    }
}
