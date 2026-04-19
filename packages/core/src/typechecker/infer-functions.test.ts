/**
 * Tests for type inference - function-related invariants
 */

import type { CoreExpr, CoreLambda } from "../types/core-ast.js";
import type { InferenceContext } from "./infer/index.js";

import { beforeEach, describe, expect, it } from "vitest";

import { emptyEnv } from "../types/environment.js";
import { inferExpr } from "./infer/index.js";
import { resetTypeVarCounter } from "./types.js";
import { emptySubst } from "./unify.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

describe("inferLambda invariants", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("throws an internal error when a lambda param is not var/wildcard", () => {
        // The desugarer lifts destructuring lambda params into a synthesized
        // match over a fresh scrutinee, so a CoreLambda here should never
        // carry a record/tuple/variant pattern. This guard catches desugarer
        // bugs early.
        const lambda: CoreLambda = {
            kind: "CoreLambda",
            param: {
                kind: "CoreRecordPattern",
                fields: [],
                loc: testLoc,
            },
            body: { kind: "CoreIntLit", value: 0, loc: testLoc },
            loc: testLoc,
        };

        const ctx: InferenceContext = { env: emptyEnv(), subst: emptySubst(), level: 0, inUnsafe: false };

        expect(() => inferExpr(ctx, lambda as CoreExpr)).toThrow(
            /CoreLambda param must be CoreVarPattern or CoreWildcardPattern/,
        );
    });
});
