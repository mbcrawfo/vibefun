/**
 * Optimizer / codegen helper arbitraries for fast-check PR 6 property tests.
 *
 * Built on top of the Tier-A `coreExprArb` exported from `core-ast-arb.ts`.
 * These narrower arbitraries exist so PR 6 property tests can name their
 * inputs declaratively:
 *
 * - `optimizableExprArb` — alias for `coreExprArb` with PR 6's default
 *   depth budget. Optimizer pass property tests (idempotence, determinism,
 *   no-throw) take this so the intent is clear at the call site.
 * - `coreExprWithUnsafeArb` — wraps any generated `CoreExpr` in a
 *   `CoreUnsafe` so `CoreUnsafe`-preservation properties have a guaranteed
 *   unsafe subtree to assert against.
 */
import type { CoreExpr } from "../core-ast.js";

import * as fc from "fast-check";

import { coreExprArb, type CoreExprArbOptions } from "./core-ast-arb.js";
import { SYNTHETIC_LOCATION } from "./source-arb.js";

const LOC = SYNTHETIC_LOCATION;

/**
 * Generate a Tier-A `CoreExpr` suitable for optimizer property tests.
 *
 * Defaults to depth 3 — large enough to exercise nested rewrites in
 * passes like beta-reduction and constant folding, but bounded so each
 * sample generates in <1 ms.
 */
export const optimizableExprArb = (options: CoreExprArbOptions = {}): fc.Arbitrary<CoreExpr> =>
    coreExprArb({ depth: 3, ...options });

/**
 * Generate a `CoreExpr` that is guaranteed to contain a `CoreUnsafe`
 * subtree at the root. Use for properties asserting that optimizer passes
 * leave unsafe blocks verbatim.
 */
export const coreExprWithUnsafeArb = (options: CoreExprArbOptions = {}): fc.Arbitrary<CoreExpr> =>
    coreExprArb({ depth: 2, ...options }).map(
        (inner): CoreExpr => ({ kind: "CoreUnsafe", expr: inner, loc: LOC }),
    );
