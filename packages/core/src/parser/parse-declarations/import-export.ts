/**
 * Import and Re-Export Declaration Parsing
 *
 * Parses `import ... from "..."` and `export ... from "..."` declarations
 * (including namespace, type-only, and selective forms).
 */

import type { Declaration, ImportItem } from "../../types/index.js";
import type { ParserBase } from "../parser-base.js";

/**
 * Parse import declaration
 * Syntax: import { name, type T, name as alias } from "module"
 *         import * as Name from "module"
 *         import type * as Name from "module"
 */
export function parseImportDecl(parser: ParserBase): Declaration {
    const startLoc = parser.peek().loc;
    parser.advance(); // consume 'import'

    const items: ImportItem[] = [];

    // Check for 'import type' before * or {
    let importIsType = false;
    if (parser.check("KEYWORD") && parser.peek().value === "type") {
        importIsType = true;
        parser.advance(); // consume 'type'
    }

    // import * as Name or import type * as Name
    if (parser.match("OP_STAR")) {
        // Skip newlines after *
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check for 'as' keyword (could be KEYWORD or IDENTIFIER depending on lexer)
        const asToken = parser.peek();
        if (
            !(
                (asToken.type === "KEYWORD" && asToken.value === "as") ||
                (asToken.type === "IDENTIFIER" && asToken.value === "as")
            )
        ) {
            throw parser.error("VF2404", asToken.loc);
        }
        parser.advance(); // consume 'as'

        // Skip newlines after 'as'
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const aliasToken = parser.expect("IDENTIFIER", "Expected alias name");
        const alias = aliasToken.value as string;

        items.push({
            name: "*",
            alias,
            isType: importIsType,
        });
    }
    // import { ... } or import type { ... }
    else if (parser.match("LBRACE")) {
        // Skip newlines after opening brace
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        do {
            // Check for per-item type import (only if not already import type)
            let isType = importIsType;
            if (!importIsType && parser.check("KEYWORD") && parser.peek().value === "type") {
                isType = true;
                parser.advance();
            }

            const nameToken = parser.expect("IDENTIFIER", "Expected import name");
            const name = nameToken.value as string;

            // Optional: as alias
            let alias: string | undefined;
            if (parser.check("KEYWORD") && parser.peek().value === "as") {
                parser.advance(); // consume 'as'
                const aliasToken = parser.expect("IDENTIFIER", "Expected alias name");
                alias = aliasToken.value as string;
            }

            items.push({ name, ...(alias !== undefined && { alias }), isType });

            // Skip newlines after item
            while (parser.check("NEWLINE")) {
                parser.advance();
            }
        } while (
            parser.match("COMMA") &&
            (() => {
                // Skip newlines after comma
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }
                return true;
            })()
        );

        parser.expect("RBRACE", "Expected '}' after import items");
    } else {
        throw parser.error("VF2400", parser.peek().loc);
    }

    // Skip newlines before 'from'
    while (parser.check("NEWLINE")) {
        parser.advance();
    }

    // Expect from
    parser.expect("KEYWORD", "Expected 'from' after import items");
    if (parser.peek(-1).value !== "from") {
        throw parser.error("VF2402", parser.peek(-1).loc);
    }

    // Parse module path
    const fromToken = parser.expect("STRING_LITERAL", "Expected module path");
    const from = fromToken.value as string;

    return {
        kind: "ImportDecl",
        items,
        from,
        loc: startLoc,
    };
}

/**
 * Parse re-export declaration
 * Syntax: export { name, type T, name as alias } from "module"
 *         export * from "module"
 */
export function parseReExportDecl(parser: ParserBase): Declaration {
    const startLoc = parser.peek().loc;

    let items: ImportItem[] | null;

    // export *
    if (parser.match("OP_STAR")) {
        // Namespace re-export (items = null)
        items = null;
    }
    // export { ... }
    else if (parser.match("LBRACE")) {
        items = [];

        // Allow empty re-export: export {} from "./mod"
        if (!parser.check("RBRACE")) {
            do {
                // Check for type re-export
                let isType = false;
                if (parser.check("KEYWORD") && parser.peek().value === "type") {
                    isType = true;
                    parser.advance();
                }

                const nameToken = parser.expect("IDENTIFIER", "Expected export name");
                const name = nameToken.value as string;

                // Optional: as alias
                let alias: string | undefined;
                if (parser.check("KEYWORD") && parser.peek().value === "as") {
                    parser.advance(); // consume 'as'
                    const aliasToken = parser.expect("IDENTIFIER", "Expected alias name");
                    alias = aliasToken.value as string;
                }

                items.push({ name, ...(alias !== undefined && { alias }), isType });
            } while (parser.match("COMMA"));
        }

        parser.expect("RBRACE", "Expected '}' after export items");
    } else {
        throw parser.error("VF2401", parser.peek().loc);
    }

    // Expect from
    parser.expect("KEYWORD", "Expected 'from' after export items");
    if (parser.peek(-1).value !== "from") {
        throw parser.error("VF2402", parser.peek(-1).loc);
    }

    // Parse module path
    const fromToken = parser.expect("STRING_LITERAL", "Expected module path");
    const from = fromToken.value as string;

    return {
        kind: "ReExportDecl",
        items,
        from,
        loc: startLoc,
    };
}
