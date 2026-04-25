/**
 * Unit tests for the let-binding invariant helpers.
 *
 * Each helper encapsulates a soundness invariant that PR #73 had to patch
 * across five paths. Tests here exercise every branch of every helper —
 * the matrix in `tests/e2e/let-binding-matrix.test.ts` covers the
 * user-observable side; these unit tests pin internal contract.
 */

import type { CoreExpr, CoreVarPattern } from "../../types/core-ast.js";
import type { Type, TypeEnv } from "../../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../../diagnostics/index.js";
import { createTestEnv, testLoc } from "../typechecker-test-helpers.js";
import { appType, constType, freshTypeVar, primitiveTypes, refType, resetTypeVarCounter } from "../types.js";
import { applySubst, composeSubst, emptySubst, singleSubst } from "../unify.js";
import {
    computeBindingScheme,
    enforceMutableRefBinding,
    propagateSubstAcrossDeclarations,
} from "./let-binding-helpers.js";

const intLit: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
const lambdaIdentity: CoreExpr = {
    kind: "CoreLambda",
    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
    body: { kind: "CoreVar", name: "x", loc: testLoc },
    loc: testLoc,
};
const varPattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
const wildcardPattern = { kind: "CoreWildcardPattern" as const, loc: testLoc };
const tuplePattern = {
    kind: "CoreTuplePattern" as const,
    patterns: [
        { kind: "CoreVarPattern" as const, name: "a", loc: testLoc },
        { kind: "CoreVarPattern" as const, name: "b", loc: testLoc },
    ],
    loc: testLoc,
};

describe("enforceMutableRefBinding", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("returns subst unchanged for non-mutable bindings", () => {
        const subst = singleSubst(99, primitiveTypes.Int);
        const result = enforceMutableRefBinding({
            binding: { mutable: false, value: { loc: testLoc } },
            inferredType: primitiveTypes.Int,
            subst,
            level: 0,
            types: new Map(),
        });
        expect(result).toBe(subst);
    });

    it("accepts a mutable binding whose RHS is Ref<T>", () => {
        const refOfInt = refType(primitiveTypes.Int);
        const result = enforceMutableRefBinding({
            binding: { mutable: true, value: { loc: testLoc } },
            inferredType: refOfInt,
            subst: emptySubst(),
            level: 0,
            types: new Map(),
        });
        // The unification with Ref<fresh> should succeed and bind the fresh
        // var to Int. The returned substitution is valid — applying it to
        // the inferred type must yield Ref<Int>.
        expect(applySubst(result, refOfInt).type).toBe("App");
    });

    it("throws VF4018 at the RHS location when RHS is not Ref<T>", () => {
        const customLoc = { file: "rhs.vf", line: 3, column: 7, offset: 42 };
        try {
            enforceMutableRefBinding({
                binding: { mutable: true, value: { loc: customLoc } },
                inferredType: primitiveTypes.Int,
                subst: emptySubst(),
                level: 0,
                types: new Map(),
            });
            expect.fail("Expected VF4018 to be thrown");
        } catch (err) {
            expect(err).toBeInstanceOf(VibefunDiagnostic);
            if (err instanceof VibefunDiagnostic) {
                expect(err.code).toBe("VF4018");
                expect(err.location).toEqual(customLoc);
            }
        }
    });

    it("threads the input substitution into the inferred type before unifying", () => {
        // inferredType is a type variable; subst already maps it to Ref<Int>.
        // The helper must unify Ref<Int> against Ref<fresh>, not the raw var.
        const tvar: Type = { type: "Var", id: 1, level: 0 };
        const subst = singleSubst(1, refType(primitiveTypes.Int));
        const result = enforceMutableRefBinding({
            binding: { mutable: true, value: { loc: testLoc } },
            inferredType: tvar,
            subst,
            level: 1,
            types: new Map(),
        });
        // Resulting subst still maps id 1 to Ref<Int>; no error.
        expect(applySubst(result, tvar).type).toBe("App");
    });
});

describe("computeBindingScheme", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("returns a non-generalised scheme when the binding is mutable", () => {
        const tvar = freshTypeVar(1);
        const refOfTvar = refType(tvar);
        const scheme = computeBindingScheme({
            binding: { mutable: true, value: lambdaIdentity, pattern: varPattern },
            inferredType: refOfTvar,
            subst: emptySubst(),
            level: 1,
            env: createTestEnv(),
        });
        expect(scheme.vars).toHaveLength(0);
    });

    it("returns a non-generalised scheme when the pattern is not a variable", () => {
        const tvar = freshTypeVar(1);
        const scheme = computeBindingScheme({
            binding: { mutable: false, value: intLit, pattern: tuplePattern },
            inferredType: tvar,
            subst: emptySubst(),
            level: 1,
            env: createTestEnv(),
        });
        expect(scheme.vars).toHaveLength(0);
    });

    it("returns a non-generalised scheme for wildcard patterns", () => {
        const tvar = freshTypeVar(1);
        const scheme = computeBindingScheme({
            binding: { mutable: false, value: intLit, pattern: wildcardPattern },
            inferredType: tvar,
            subst: emptySubst(),
            level: 1,
            env: createTestEnv(),
        });
        expect(scheme.vars).toHaveLength(0);
    });

    it("generalises a non-mutable simple-variable binding when the value is a syntactic value", () => {
        // `let id = x => x` should produce ∀a. a -> a.
        const fresh = freshTypeVar(1);
        const lambdaType: Type = {
            type: "Fun",
            params: [fresh],
            return: fresh,
        };
        const scheme = computeBindingScheme({
            binding: { mutable: false, value: lambdaIdentity, pattern: varPattern },
            inferredType: lambdaType,
            subst: emptySubst(),
            level: 1,
            env: createTestEnv(),
        });
        expect(scheme.vars.length).toBeGreaterThan(0);
    });

    it("does not generalise when the value is not a syntactic value", () => {
        // Application is not a syntactic value — value restriction kicks in.
        const fresh = freshTypeVar(1);
        const refCall: CoreExpr = {
            kind: "CoreApp",
            func: { kind: "CoreVar", name: "ref", loc: testLoc },
            args: [intLit],
            loc: testLoc,
        };
        const scheme = computeBindingScheme({
            binding: { mutable: false, value: refCall, pattern: varPattern },
            inferredType: refType(fresh),
            subst: emptySubst(),
            level: 1,
            env: createTestEnv(),
        });
        expect(scheme.vars).toHaveLength(0);
    });

    it("applies the input substitution to the inferred type before generalising", () => {
        // inferredType has a tvar that the subst rewrites to Int.
        // The resulting scheme must contain Int, not the tvar.
        const tvar: Type = { type: "Var", id: 1, level: 1 };
        const subst = singleSubst(1, primitiveTypes.Int);
        const scheme = computeBindingScheme({
            binding: { mutable: false, value: intLit, pattern: varPattern },
            inferredType: tvar,
            subst,
            level: 1,
            env: createTestEnv(),
        });
        // Int has no free vars, so nothing to generalise.
        expect(scheme.type).toEqual(primitiveTypes.Int);
        expect(scheme.vars).toHaveLength(0);
    });
});

describe("propagateSubstAcrossDeclarations", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("returns a fresh env when the substitution is empty", () => {
        const env: TypeEnv = createTestEnv();
        const declarationTypes = new Map<string, Type>();
        const result = propagateSubstAcrossDeclarations({
            subst: emptySubst(),
            declarationTypes,
            env,
        });
        expect(result.values).not.toBe(env.values);
        expect(result.types).toBe(env.types);
    });

    it("folds the substitution into existing declarationTypes entries", () => {
        const tvar: Type = { type: "Var", id: 1, level: 0 };
        const declarationTypes = new Map<string, Type>([["x", tvar]]);
        const subst = singleSubst(1, primitiveTypes.Int);
        propagateSubstAcrossDeclarations({
            subst,
            declarationTypes,
            env: createTestEnv(),
        });
        expect(declarationTypes.get("x")).toEqual(primitiveTypes.Int);
    });

    it("folds the substitution into Value scheme bodies in env.values", () => {
        const tvar: Type = { type: "Var", id: 1, level: 0 };
        const env: TypeEnv = createTestEnv();
        env.values.set("y", {
            kind: "Value",
            scheme: { vars: [], type: tvar },
            loc: testLoc,
        });
        const subst = singleSubst(1, primitiveTypes.Int);
        const result = propagateSubstAcrossDeclarations({
            subst,
            declarationTypes: new Map(),
            env,
        });
        const yBinding = result.values.get("y");
        expect(yBinding?.kind).toBe("Value");
        if (yBinding?.kind === "Value") {
            expect(yBinding.scheme.type).toEqual(primitiveTypes.Int);
        }
    });

    it("leaves quantified variables in a scheme alone", () => {
        // A scheme `∀a. a -> a` whose `a` happens to share an id with a
        // substitution entry must NOT have its bound `a` rewritten.
        const boundId = 1;
        const boundVar: Type = { type: "Var", id: boundId, level: 0 };
        const env: TypeEnv = createTestEnv();
        env.values.set("id", {
            kind: "Value",
            scheme: {
                vars: [boundId],
                type: { type: "Fun", params: [boundVar], return: boundVar },
            },
            loc: testLoc,
        });
        const subst = singleSubst(boundId, primitiveTypes.Int);
        const result = propagateSubstAcrossDeclarations({
            subst,
            declarationTypes: new Map(),
            env,
        });
        const binding = result.values.get("id");
        expect(binding?.kind).toBe("Value");
        if (binding?.kind === "Value") {
            // Bound var preserved — scheme is still polymorphic.
            expect(binding.scheme.vars).toEqual([boundId]);
            if (binding.scheme.type.type === "Fun") {
                expect(binding.scheme.type.params[0]).toEqual(boundVar);
            }
        }
    });

    it("composes correctly across multiple invocations", () => {
        // A two-step substitution propagation: first narrows `a` to
        // `Option<b>`, then narrows `b` to `Int`. The final declaration
        // entry must reflect both narrowings.
        const a: Type = { type: "Var", id: 1, level: 0 };
        const b: Type = { type: "Var", id: 2, level: 0 };
        const declarationTypes = new Map<string, Type>([["x", a]]);
        const env: TypeEnv = createTestEnv();

        const subst1 = singleSubst(1, appType(constType("Option"), [b]));
        const resultEnv = propagateSubstAcrossDeclarations({
            subst: subst1,
            declarationTypes,
            env,
        });

        const subst2 = singleSubst(2, primitiveTypes.Int);
        propagateSubstAcrossDeclarations({
            subst: composeSubst(subst2, subst1),
            declarationTypes,
            env: resultEnv,
        });

        const final = declarationTypes.get("x");
        expect(final?.type).toBe("App");
        if (final?.type === "App" && final.args[0]) {
            expect(final.args[0]).toEqual(primitiveTypes.Int);
        }
    });
});
