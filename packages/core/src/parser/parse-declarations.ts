/**
 * Declaration Parsing Module
 *
 * All declaration parsing logic for top-level module declarations.
 */

import type {
    Declaration,
    Expr,
    ExternalBlockItem,
    ImportItem,
    Location,
    Pattern,
    RecordTypeField,
    TypeDefinition,
    TypeExpr,
    VariantConstructor,
} from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

import { ParserError } from "../utils/index.js";

// Forward declarations for circular dependencies
let parseExpression: (parser: ParserBase) => Expr;
let parsePattern: (parser: ParserBase) => Pattern;
let parseTypeExpr: (parser: ParserBase) => TypeExpr;
let parseFunctionType: (parser: ParserBase) => TypeExpr;

/**
 * Set the expression parsing function (called during initialization)
 */
export function setParseExpression(fn: (parser: ParserBase) => Expr): void {
    parseExpression = fn;
}

/**
 * Set the pattern parsing function (called during initialization)
 */
export function setParsePattern(fn: (parser: ParserBase) => Pattern): void {
    parsePattern = fn;
}

/**
 * Set the type expression parsing function (called during initialization)
 */
export function setParseTypeExpr(fn: (parser: ParserBase) => TypeExpr): void {
    parseTypeExpr = fn;
}

/**
 * Set the function type parsing function (called during initialization)
 * This is needed for type definitions which need to parse function types directly
 */
export function setParseFunctionType(fn: (parser: ParserBase) => TypeExpr): void {
    parseFunctionType = fn;
}

/**
 * Parse type parameters: <T, U, V>
 * Returns array of type parameter names, or empty array if no type parameters
 */
function parseTypeParameters(parser: ParserBase): string[] {
    const params: string[] = [];

    if (!parser.match("OP_LT")) {
        return params;
    }

    // Parse comma-separated list of identifiers
    do {
        const paramToken = parser.expect("IDENTIFIER", "Expected type parameter");
        params.push(paramToken.value as string);

        // Skip newlines after parameter
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check if there's a comma
        if (!parser.match("COMMA")) {
            break;
        }

        // Skip newlines after comma
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check for trailing comma
        if (parser.check("OP_GT") || parser.check("OP_GT_GT")) {
            break; // Trailing comma allowed
        }
    } while (true); // eslint-disable-line no-constant-condition

    // Handle >> as two > tokens for nested generics
    // Access tokens via type assertion
    const p = parser as unknown as {
        tokens: Array<{ type: string; value: unknown; loc: unknown }>;
        current: number;
    };
    if (parser.check("OP_GT_GT")) {
        const token = parser.advance();
        p.tokens.splice(p.current, 0, {
            type: "OP_GT",
            value: ">",
            loc: token.loc,
        });
    } else {
        parser.expect("OP_GT", "Expected '>' after type parameters");
    }

    return params;
}

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

    if (!parser.check("KEYWORD")) {
        throw parser.error("Expected declaration keyword", parser.peek().loc);
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
            throw parser.error(`Unexpected keyword in declaration: ${keyword}`, parser.peek().loc);
    }
}

/**
 * Parse let declaration
 * Syntax: let [mut] [rec] pattern [: type] = expr [and pattern = expr]*
 */
function parseLetDecl(parser: ParserBase, exported: boolean): Declaration {
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
    if (parser.match("COLON")) {
        // Skip type annotation for now (will be used by type checker)
        parseTypeExpr(parser);
    }

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after let pattern");

    // Parse value expression
    const firstValue = parseExpression(parser);

    // Check for 'and' keyword for mutually recursive bindings
    const nextToken = parser.peek();
    if (parser.check("KEYWORD") && nextToken.type === "KEYWORD" && nextToken.keyword === "and") {
        // Must be recursive to use 'and'
        if (!recursive) {
            throw new ParserError(
                "The 'and' keyword can only be used with 'let rec' for mutually recursive functions",
                parser.peek().loc,
                "Add 'rec' before the first binding: 'let rec f = ... and g = ...'",
            );
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
            if (parser.match("COLON")) {
                parseTypeExpr(parser);
            }

            parser.expect("OP_EQUALS", "Expected '=' after pattern in 'and' binding");

            const bindingValue = parseExpression(parser);

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

/**
 * Parse type declaration body (without consuming 'type' keyword)
 * Syntax: Name<T, U> = definition
 * Used internally by parseTypeDecl and for 'and' keyword chaining
 */
export function parseTypeDeclBody(parser: ParserBase, exported: boolean, startLoc: Location): Declaration {
    // Parse type name
    const nameToken = parser.expect("IDENTIFIER", "Expected type name");
    const name = nameToken.value as string;

    // Parse type parameters: <T, U, V> or <T, U, V,>
    const params: string[] = [];
    if (parser.match("OP_LT")) {
        do {
            const paramToken = parser.expect("IDENTIFIER", "Expected type parameter");
            params.push(paramToken.value as string);

            // Check for comma
            if (!parser.match("COMMA")) {
                break;
            }

            // Check for trailing comma before >
            if (parser.check("OP_GT") || parser.check("OP_GT_GT")) {
                break; // Trailing comma allowed
            }
        } while (true); // eslint-disable-line no-constant-condition

        // Handle >> as two > tokens for nested generics
        // Access tokens via type assertion
        const p = parser as unknown as {
            tokens: Array<{ type: string; value: unknown; loc: unknown }>;
            current: number;
        };
        if (parser.check("OP_GT_GT")) {
            const token = parser.advance();
            p.tokens.splice(p.current, 0, {
                type: "OP_GT",
                value: ">",
                loc: token.loc,
            });
        } else {
            parser.expect("OP_GT", "Expected '>' after type parameters");
        }
    }

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after type name");

    // Parse type definition
    const definition = parseTypeDefinition(parser);

    return {
        kind: "TypeDecl",
        name,
        params,
        definition,
        exported,
        loc: startLoc,
    };
}

/**
 * Parse type declaration
 * Syntax: type Name<T, U> = definition
 */
function parseTypeDecl(parser: ParserBase, exported: boolean): Declaration {
    const startLoc = parser.peek().loc;
    parser.advance(); // consume 'type'

    return parseTypeDeclBody(parser, exported, startLoc);
}

/**
 * Parse type definition (alias, record, or variant)
 */
function parseTypeDefinition(parser: ParserBase): TypeDefinition {
    const startLoc = parser.peek().loc;

    // Record type: { ... }
    if (parser.check("LBRACE")) {
        parser.advance(); // consume {

        const fields: RecordTypeField[] = [];

        if (!parser.check("RBRACE")) {
            do {
                const fieldNameToken = parser.expect("IDENTIFIER", "Expected field name");
                const fieldName = fieldNameToken.value as string;

                parser.expect("COLON", "Expected ':' after field name");

                const typeExpr = parseTypeExpr(parser);

                fields.push({
                    name: fieldName,
                    typeExpr,
                    loc: fieldNameToken.loc,
                });
            } while (parser.match("COMMA"));
        }

        parser.expect("RBRACE", "Expected '}' after record type fields");

        return {
            kind: "RecordTypeDef",
            fields,
            loc: startLoc,
        };
    }

    // Skip newlines after = sign
    while (parser.match("NEWLINE"));

    // Check for optional leading pipe (for multiline variant syntax)
    // type Result<t, e> =
    //     | Ok(t)
    //     | Err(e)
    if (parser.check("PIPE")) {
        parser.advance(); // consume leading |
        // Skip newlines after pipe
        while (parser.match("NEWLINE"));
    }

    // Variant or alias - parse first constructor/type
    const firstType = parseFunctionType(parser);

    // Skip newlines after first type (for multi-line variant types)
    while (parser.match("NEWLINE"));

    // Check if this is a variant type (has | separator)
    if (parser.check("PIPE")) {
        // Variant type: Constructor1(T) | Constructor2(U) | ...
        const constructors: VariantConstructor[] = [];

        // Process first constructor
        if (firstType.kind === "TypeApp" && firstType.constructor.kind === "TypeConst") {
            // Constructor with args: Some(T)
            constructors.push({
                name: (firstType.constructor as Extract<TypeExpr, { kind: "TypeConst" }>).name,
                args: firstType.args,
                loc: firstType.loc,
            });
        } else if (firstType.kind === "TypeConst") {
            // Nullary constructor: None
            constructors.push({
                name: firstType.name,
                args: [],
                loc: firstType.loc,
            });
        } else {
            throw parser.error("Expected constructor in variant type", firstType.loc);
        }

        // Parse remaining constructors
        while (true) {
            // Skip optional newlines before next pipe
            while (parser.match("NEWLINE"));

            // Check for next variant separator
            if (!parser.match("PIPE")) {
                break;
            }

            // Skip optional newlines after pipe
            while (parser.match("NEWLINE"));

            const constrType = parseFunctionType(parser);

            if (constrType.kind === "TypeApp" && constrType.constructor.kind === "TypeConst") {
                constructors.push({
                    name: (constrType.constructor as Extract<TypeExpr, { kind: "TypeConst" }>).name,
                    args: constrType.args,
                    loc: constrType.loc,
                });
            } else if (constrType.kind === "TypeConst") {
                constructors.push({
                    name: constrType.name,
                    args: [],
                    loc: constrType.loc,
                });
            } else {
                throw parser.error("Expected constructor in variant type", constrType.loc);
            }
        }

        return {
            kind: "VariantTypeDef",
            constructors,
            loc: startLoc,
        };
    }

    // Type alias: type Alias = OtherType
    return {
        kind: "AliasType",
        typeExpr: firstType,
        loc: startLoc,
    };
}

/**
 * Parse external declaration or block
 * Syntax: external name: type = "jsName" [from "module"]
 *         external { ... }
 *         external from "module" { ... }
 */
function parseExternalDeclOrBlock(parser: ParserBase, exported: boolean): Declaration {
    const startLoc = parser.peek().loc;
    parser.advance(); // consume 'external'

    // Check for block syntax
    if (parser.check("LBRACE")) {
        parser.advance(); // consume '{'
        return parseExternalBlock(parser, exported, startLoc, undefined);
    }

    // Check for "from" clause before block
    if (parser.check("KEYWORD") && parser.peek().value === "from") {
        parser.advance(); // consume 'from'
        const moduleToken = parser.expect("STRING_LITERAL", "Expected module name after 'from'");
        const from = moduleToken.value as string;

        // Must be followed by block
        parser.expect("LBRACE", "Expected '{' after 'from \"module\"'");
        return parseExternalBlock(parser, exported, startLoc, from);
    }

    // Single external declaration
    return parseExternalDecl(parser, exported, startLoc);
}

/**
 * Parse single external declaration
 * Syntax: name: type = "jsName" [from "module"]
 * Note: 'external' keyword already consumed by caller
 */
function parseExternalDecl(parser: ParserBase, exported: boolean, startLoc: Location): Declaration {
    // Parse name
    const nameToken = parser.expect("IDENTIFIER", "Expected external name");
    const name = nameToken.value as string;

    // Expect :
    parser.expect("COLON", "Expected ':' after external name");

    // Parse optional type parameters: <T, U, V>
    const typeParams = parseTypeParameters(parser);

    // Parse type
    const typeExpr = parseTypeExpr(parser);

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after external type");

    // Parse JS name (string literal)
    const jsNameToken = parser.expect("STRING_LITERAL", "Expected string literal for JS name");
    const jsName = jsNameToken.value as string;

    // Optional: from "module"
    let from: string | undefined;
    if (parser.check("KEYWORD") && parser.peek().value === "from") {
        parser.advance(); // consume 'from'
        const moduleToken = parser.expect("STRING_LITERAL", "Expected module name");
        from = moduleToken.value as string;
    }

    return {
        kind: "ExternalDecl",
        name,
        ...(typeParams.length > 0 && { typeParams }),
        typeExpr,
        jsName,
        ...(from !== undefined && { from }),
        exported,
        loc: startLoc,
    };
}

/**
 * Parse external block
 * Syntax: item1, item2, ...
 * Note: '{' already consumed by caller, this parses items until '}'
 */
function parseExternalBlock(
    parser: ParserBase,
    exported: boolean,
    startLoc: Location,
    from: string | undefined,
): Declaration {
    // '{' already consumed by caller, parse items until '}'

    const items: ExternalBlockItem[] = [];

    // Skip leading newlines
    while (parser.match("NEWLINE"));

    // Parse items until we hit }
    while (!parser.check("RBRACE") && !parser.isAtEnd()) {
        // Skip newlines between items
        while (parser.match("NEWLINE"));

        if (parser.check("RBRACE")) break;

        // Parse item (value or type)
        const item = parseExternalBlockItem(parser);
        items.push(item);

        // Skip newlines after item
        while (parser.match("NEWLINE"));

        // Require semicolon after item (unless at closing brace)
        if (!parser.check("RBRACE")) {
            if (!parser.check("SEMICOLON")) {
                throw parser.error(
                    "Expected ';' after external declaration",
                    parser.peek().loc,
                    "External declarations in a block must end with semicolons",
                );
            }
            parser.advance(); // Consume the semicolon
        }

        // Skip newlines after semicolon
        while (parser.match("NEWLINE"));
    }

    parser.expect("RBRACE", "Expected '}' after external block");

    return {
        kind: "ExternalBlock",
        items,
        ...(from !== undefined && { from }),
        exported,
        loc: startLoc,
    };
}

/**
 * Parse external block item (value or type)
 * Syntax: name: type = "jsName"
 *         type Name = TypeExpr
 */
function parseExternalBlockItem(parser: ParserBase): ExternalBlockItem {
    const startLoc = parser.peek().loc;

    // Check for "type" keyword (external type)
    if (parser.check("KEYWORD") && parser.peek().value === "type") {
        parser.advance(); // consume 'type'

        // Parse type name
        const nameToken = parser.expect("IDENTIFIER", "Expected type name");
        const name = nameToken.value as string;

        // Expect =
        parser.expect("OP_EQUALS", "Expected '=' after type name");

        // Parse type expression
        const typeExpr = parseTypeExpr(parser);

        return {
            kind: "ExternalType",
            name,
            typeExpr,
            loc: startLoc,
        };
    }

    // External value: name: type = "jsName"
    const nameToken = parser.expect("IDENTIFIER", "Expected name");
    const name = nameToken.value as string;

    // Expect :
    parser.expect("COLON", "Expected ':' after name");

    // Parse optional type parameters: <T, U, V>
    const typeParams = parseTypeParameters(parser);

    // Parse type
    const typeExpr = parseTypeExpr(parser);

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after type");

    // Parse JS name (string literal)
    const jsNameToken = parser.expect("STRING_LITERAL", "Expected string literal for JS name");
    const jsName = jsNameToken.value as string;

    return {
        kind: "ExternalValue",
        name,
        ...(typeParams.length > 0 && { typeParams }),
        typeExpr,
        jsName,
        loc: startLoc,
    };
}

/**
 * Parse import declaration
 * Syntax: import { name, type T, name as alias } from "module"
 *         import * as Name from "module"
 *         import type * as Name from "module"
 */
function parseImportDecl(parser: ParserBase): Declaration {
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
            throw parser.error("Expected 'as' after '*'", asToken.loc);
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
        throw parser.error("Expected '{' or '*' after 'import'", parser.peek().loc);
    }

    // Skip newlines before 'from'
    while (parser.check("NEWLINE")) {
        parser.advance();
    }

    // Expect from
    parser.expect("KEYWORD", "Expected 'from' after import items");
    if (parser.peek(-1).value !== "from") {
        throw parser.error("Expected 'from' keyword", parser.peek(-1).loc);
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
function parseReExportDecl(parser: ParserBase): Declaration {
    const startLoc = parser.peek().loc;

    let items: ImportItem[] | null = null;

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
        throw parser.error("Expected '{' or '*' after 'export'", parser.peek().loc);
    }

    // Expect from
    parser.expect("KEYWORD", "Expected 'from' after export items");
    if (parser.peek(-1).value !== "from") {
        throw parser.error("Expected 'from' keyword", parser.peek(-1).loc);
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
