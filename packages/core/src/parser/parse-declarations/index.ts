/**
 * Declaration Parsing Module
 *
 * All declaration parsing logic for top-level module declarations. The
 * dispatcher below reads the declaration keyword (or detects a top-level
 * expression) and delegates to a focused sub-file.
 */

import type { Declaration } from "../../types/index.js";
import type { ParserBase } from "../parser-base.js";

import { parseExternalDeclOrBlock } from "./external.js";
import { parseImportDecl, parseReExportDecl } from "./import-export.js";
import { parseLetDecl } from "./let.js";
import { parseExpression } from "./shared-state.js";
import { parseTypeDecl } from "./type.js";

// Re-export public surface (for parser.ts + parse-expression-complex.ts)
export { validateMutableBinding } from "./let.js";
export { parseTypeDeclBody } from "./type.js";
export { setParseExpression, setParseFunctionType, setParsePattern, setParseTypeExpr } from "./shared-state.js";

/**
 * Parse a top-level declaration
 */
export function parseDeclaration(parser: ParserBase): Declaration {
    // Check for export modifier
    let exported = false;
    if (parser.check("KEYWORD") && parser.peek().value === "export") {
        exported = true;
        parser.advance(); // consume 'export'

        // Skip newlines
        while (parser.match("NEWLINE"));

        // Check for re-export: export { x } from "..." or export * from "..."
        if (parser.check("LBRACE") || parser.check("OP_STAR")) {
            return parseReExportDecl(parser);
        }
    }

    // Skip newlines
    while (parser.match("NEWLINE"));

    // If no keyword follows, this is a top-level expression statement
    // (per spec: 08-modules.md "Top-Level Expression Evaluation"). Parse
    // the expression and synthesize a wildcard-let so downstream passes
    // can treat it uniformly — `let _ = expr;` has well-defined semantics
    // throughout the pipeline.
    if (!parser.check("KEYWORD")) {
        if (exported) {
            // `export <expr>;` is nonsense — bare expressions can't be
            // exported. Fail with the same diagnostic as a missing
            // declaration keyword.
            throw parser.error("VF2000", parser.peek().loc);
        }

        const exprStart = parser.peek().loc;
        const value = parseExpression(parser);

        return {
            kind: "LetDecl",
            pattern: { kind: "WildcardPattern", loc: exprStart },
            value,
            mutable: false,
            recursive: false,
            exported: false,
            loc: value.loc,
        };
    }

    const keyword = parser.peek().value as string;

    switch (keyword) {
        case "let":
            return parseLetDecl(parser, exported);
        case "type":
            return parseTypeDecl(parser, exported);
        case "external":
            return parseExternalDeclOrBlock(parser, exported);
        case "import":
            return parseImportDecl(parser);
        default:
            throw parser.error("VF2001", parser.peek().loc, { keyword });
    }
}
