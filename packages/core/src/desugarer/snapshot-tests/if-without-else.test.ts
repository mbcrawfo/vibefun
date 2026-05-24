/**
 * Desugarer snapshot — if-without-else carries an explicit Unit else branch.
 *
 * Spec: `docs/spec/12-compilation/desugaring.md` §If-Without-Else (audit 12
 * F-13). When the `else` clause is omitted, the parser fills the else branch
 * with a `UnitLit` so the AST always has both branches. The desugarer then
 * lowers `if`/`then`/`else` to a boolean `match`, so the post-desugar Core AST
 * for `if cond then action` is a `CoreMatch` whose `false` arm body is a
 * `CoreUnitLit`.
 *
 * This snapshot pins that contract end-to-end (parser injection + desugar
 * lowering). The `false`-arm `CoreUnitLit` is the load-bearing node — if a
 * future change drops it, the desugared AST would leave the else branch empty,
 * which is a bug (see the chunk-16 plan's behaviour expectations).
 *
 * Locations are stripped so the snapshot stays focused on structure; the
 * `loc`-preservation contract is covered separately in
 * `../conditionals.test.ts`.
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../../lexer/index.js";
import { Parser } from "../../parser/index.js";
import { desugar } from "../index.js";

/** Recursively drop `loc` keys so the snapshot shows only structure. */
function stripLoc(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(stripLoc);
    }
    if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, v] of Object.entries(value)) {
            if (key === "loc") continue;
            out[key] = stripLoc(v);
        }
        return out;
    }
    return value;
}

/** Parse a single expression and desugar it to Core AST. */
function desugarExpr(source: string): CoreExpr {
    const tokens = new Lexer(source, "test.vf").tokenize();
    const expr = new Parser(tokens, "test.vf").parseExpression();
    return desugar(expr);
}

describe("desugarer snapshot — if without else (F-13)", () => {
    it("lowers `if cond then action` to a boolean match whose false arm is CoreUnitLit", () => {
        const core = desugarExpr("if cond then action");

        expect(stripLoc(core)).toMatchInlineSnapshot(`
          {
            "cases": [
              {
                "body": {
                  "kind": "CoreVar",
                  "name": "action",
                },
                "pattern": {
                  "kind": "CoreLiteralPattern",
                  "literal": true,
                },
              },
              {
                "body": {
                  "kind": "CoreUnitLit",
                },
                "pattern": {
                  "kind": "CoreLiteralPattern",
                  "literal": false,
                },
              },
            ],
            "expr": {
              "kind": "CoreVar",
              "name": "cond",
            },
            "kind": "CoreMatch",
          }
        `);
    });
});
