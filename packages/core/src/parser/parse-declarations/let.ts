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
 * Validate that a mutable binding uses ref() syntax and VarPattern
 *
 * @param parser - The parser instance
 * @param value - The value expression being assigned
 * @param pattern - The pattern being bound
 * @param mutable - Whether this is a mutable binding
 * @throws {VibefunDiagnostic} If mutable binding doesn't use ref() syntax or uses non-VarPattern
 */
export function validateMutableBinding(parser: ParserBase, value: Expr, pattern: Pattern, mutable: boolean): void {
    if (!mutable) {
        return; // Non-mutable bindings don't need validation
    }

    // Mutable bindings must use VarPattern (not destructuring)
    if (pattern.kind !== "VarPattern") {
        throw parser.error("VF2004", pattern.loc);
    }

    // Check if value is a ref() call
    const isRefCall = value.kind === "App" && value.func.kind === "Var" && value.func.name === "ref";

    if (!isRefCall) {
        const patternName = pattern.name;

        // Create a simple hint for the suggestion
        let valueHint = "value";
        if (value.kind === "IntLit" || value.kind === "FloatLit") {
            valueHint = String(value.value);
        } else if (value.kind === "StringLit") {
            valueHint = `"${value.value}"`;
        } else if (value.kind === "BoolLit") {
            valueHint = String(value.value);
        }

        throw parser.error("VF2003", value.loc, {
            name: patternName,
            hint: valueHint,
        });
    }
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
