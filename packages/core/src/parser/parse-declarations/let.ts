/**
 * Let Declaration Parsing
 *
 * Parses `let` declarations (including `let rec ... and ...` mutually
 * recursive groups) and the shared mutable-binding validation helper.
 */

import type { Declaration, Expr, Location, Pattern, TypeExpr } from "../../types/index.js";
import type { ParserBase } from "../parser-base.js";

import { throwDiagnostic } from "../../diagnostics/index.js";
import { parseExpression, parsePattern, parseTypeExpr } from "./shared-state.js";

/**
 * Validate the surface-level shape of a `let [mut] pattern = value` binding.
 *
 * Two complementary constraints (per spec docs/spec/07-mutable-references.md):
 *   - `let x = ref(...)` (no `mut`): rejected — ref values must be marked
 *     with the `mut` keyword so mutation is visible at the declaration site.
 *   - `let mut <pattern> = <value>`: pattern must be a `VarPattern` (mutable
 *     bindings cannot destructure), and the value must be a `ref(...)` call.
 *     The "value must produce a Ref<T>" check is enforced syntactically here
 *     and refined by the typechecker for cases the parser can't see (e.g.
 *     ref aliasing through a variable).
 *
 * @param parser - The parser instance
 * @param value - The value expression being assigned
 * @param pattern - The pattern being bound
 * @param mutable - Whether this is a mutable binding
 * @throws {VibefunDiagnostic} If validation fails
 */
export function validateMutableBinding(parser: ParserBase, value: Expr, pattern: Pattern, mutable: boolean): void {
    const isRefCall = value.kind === "App" && value.func.kind === "Var" && value.func.name === "ref";

    if (!mutable) {
        // Immutable bindings to ref(...) are a compile error: the spec
        // requires `mut` whenever a binding holds a Ref so mutation is
        // explicit at the declaration site.
        if (isRefCall && pattern.kind === "VarPattern") {
            throw parser.error("VF2008", value.loc, {
                name: pattern.name,
                hint: refArgHint(value),
            });
        }
        return;
    }

    // Mutable bindings must use VarPattern (not destructuring)
    if (pattern.kind !== "VarPattern") {
        throw parser.error("VF2004", pattern.loc);
    }

    if (!isRefCall) {
        throw parser.error("VF2003", value.loc, {
            name: pattern.name,
            hint: literalHint(value),
        });
    }
}

/**
 * Build a hint string from the argument of a `ref(...)` call, falling back
 * to a generic placeholder if the argument isn't a simple literal.
 */
function refArgHint(refCall: Expr): string {
    if (refCall.kind !== "App" || refCall.args.length === 0) {
        return "value";
    }
    const arg = refCall.args[0];
    if (arg === undefined) {
        return "value";
    }
    return literalHint(arg);
}

/**
 * Best-effort hint string for a value expression — used in error suggestions
 * for both the "missing ref()" and "missing mut" diagnostics.
 */
function literalHint(value: Expr): string {
    if (value.kind === "IntLit" || value.kind === "FloatLit") {
        return String(value.value);
    } else if (value.kind === "StringLit") {
        return `"${value.value}"`;
    } else if (value.kind === "BoolLit") {
        return String(value.value);
    }
    return "value";
}

/**
 * Parse let declaration
 * Syntax: let [mut] [rec] pattern [: type] = expr [and pattern = expr]*
 */
export function parseLetDecl(parser: ParserBase, exported: boolean): Declaration {
    const startLoc = parser.peek().loc;
    parser.advance(); // consume 'let'

    // Check for modifiers
    let mutable = false;
    let recursive = false;

    while (parser.check("KEYWORD")) {
        const mod = parser.peek().value as string;
        if (mod === "mut" && !mutable) {
            mutable = true;
            parser.advance();
        } else if (mod === "rec" && !recursive) {
            recursive = true;
            parser.advance();
        } else {
            break;
        }
    }

    // Parse first binding
    const firstPattern = parsePattern(parser);

    // Optional type annotation
    let typeAnnotation: TypeExpr | undefined;
    if (parser.match("COLON")) {
        typeAnnotation = parseTypeExpr(parser);
    }

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after let pattern");

    // Parse value expression
    let firstValue = parseExpression(parser);

    // Validate mutable bindings use ref() syntax (before wrapping)
    validateMutableBinding(parser, firstValue, firstPattern, mutable);

    // Wrap value with type annotation if present
    if (typeAnnotation) {
        firstValue = {
            kind: "TypeAnnotation",
            expr: firstValue,
            typeExpr: typeAnnotation,
            loc: firstValue.loc,
        };
    }

    // Check for 'and' keyword for mutually recursive bindings
    const nextToken = parser.peek();
    if (parser.check("KEYWORD") && nextToken.type === "KEYWORD" && nextToken.keyword === "and") {
        // Must be recursive to use 'and'
        if (!recursive) {
            throwDiagnostic("VF2005", parser.peek().loc, {});
        }

        // Collect all bindings in the mutual recursion group
        const bindings: Array<{
            pattern: Pattern;
            value: Expr;
            mutable: boolean;
            loc: Location;
        }> = [
            {
                pattern: firstPattern,
                value: firstValue,
                mutable,
                loc: firstPattern.loc,
            },
        ];

        // Parse additional bindings with 'and'
        while (parser.check("KEYWORD")) {
            const token = parser.peek();
            if (token.type !== "KEYWORD" || token.keyword !== "and") {
                break;
            }
            parser.advance(); // consume 'and'

            // Check for mut modifier in this binding
            let bindingMutable = false;
            const mutToken = parser.peek();
            if (parser.check("KEYWORD") && mutToken.type === "KEYWORD" && mutToken.keyword === "mut") {
                bindingMutable = true;
                parser.advance();
            }

            const bindingPattern = parsePattern(parser);

            // Optional type annotation
            let andTypeAnnotation: TypeExpr | undefined;
            if (parser.match("COLON")) {
                andTypeAnnotation = parseTypeExpr(parser);
            }

            parser.expect("OP_EQUALS", "Expected '=' after pattern in 'and' binding");

            let bindingValue = parseExpression(parser);

            // Validate mutable bindings use ref() syntax (before wrapping)
            validateMutableBinding(parser, bindingValue, bindingPattern, bindingMutable);

            // Wrap value with type annotation if present
            if (andTypeAnnotation) {
                bindingValue = {
                    kind: "TypeAnnotation",
                    expr: bindingValue,
                    typeExpr: andTypeAnnotation,
                    loc: bindingValue.loc,
                };
            }

            bindings.push({
                pattern: bindingPattern,
                value: bindingValue,
                mutable: bindingMutable,
                loc: bindingPattern.loc,
            });
        }

        return {
            kind: "LetRecGroup",
            bindings,
            exported,
            loc: startLoc,
        };
    }

    // Single binding (not mutually recursive)
    return {
        kind: "LetDecl",
        pattern: firstPattern,
        value: firstValue,
        mutable,
        recursive,
        exported,
        loc: startLoc,
    };
}
