/**
 * Desugarer - transforms Surface AST to Core AST
 *
 * This module eliminates all syntactic sugar from the Surface AST, producing
 * a simplified Core AST that's easier for the type checker and code generator
 * to process.
 *
 * Transformations performed:
 * - Multi-parameter lambdas → Single-parameter curried lambdas
 * - Pipe operator → Function application
 * - If-then-else → Match on boolean
 * - Block expressions → Nested let bindings
 * - List literals → Cons/Nil variants
 * - List cons operator → Cons variant
 * - Record updates → Explicit field copying
 * - Function composition → Lambda wrapping
 * - Or-patterns → Multiple match cases
 * - External blocks → Multiple external declarations
 */

import type {
    Expr,
    Pattern,
    Declaration,
    Module,
    Location,
    BinaryOp,
} from "../types/ast.js";
import type {
    CoreExpr,
    CorePattern,
    CoreDeclaration,
    CoreModule,
    CoreImportDecl,
    CoreImportItem,
} from "../types/core-ast.js";

/**
 * Error thrown during desugaring
 */
export class DesugarError extends Error {
    constructor(
        message: string,
        public loc: Location,
        public hint?: string,
    ) {
        super(message);
        this.name = "DesugarError";
    }

    /**
     * Format the error with location information
     */
    format(): string {
        const { file, line, column } = this.loc;
        const parts = [`Error: ${this.message}`, `  at ${file}:${line}:${column}`];

        if (this.hint) {
            parts.push(`  Hint: ${this.hint}`);
        }

        return parts.join("\n");
    }
}

/**
 * Fresh variable generator for desugaring transformations
 */
export class FreshVarGen {
    private counter = 0;

    /**
     * Generate a fresh variable name with given prefix
     *
     * @param prefix - Prefix for the variable name (default: "tmp")
     * @returns A fresh variable name like "$tmp0", "$composed1", etc.
     *
     * @example
     * const gen = new FreshVarGen();
     * gen.fresh("composed"); // => "$composed0"
     * gen.fresh("composed"); // => "$composed1"
     */
    fresh(prefix: string = "tmp"): string {
        return `$${prefix}${this.counter++}`;
    }

    /**
     * Reset the counter (useful for testing)
     */
    reset(): void {
        this.counter = 0;
    }
}

/**
 * Desugar a block expression into nested let bindings
 *
 * @param exprs - List of expressions in the block
 * @param loc - Location of the block expression
 * @param gen - Fresh variable generator
 * @returns Desugared core expression
 *
 * @example
 * // Input: { let x = 10; let y = 20; x + y }
 * // Output: let x = 10 in (let y = 20 in (x + y))
 */
function desugarBlock(exprs: Expr[], loc: Location, gen: FreshVarGen): CoreExpr {
    // Empty block is an error
    if (exprs.length === 0) {
        throw new DesugarError(
            "Empty block expression",
            loc,
            "Block must contain at least one expression",
        );
    }

    // Single expression - just desugar it
    if (exprs.length === 1) {
        const singleExpr = exprs[0];
        if (!singleExpr) {
            throw new DesugarError("Block has undefined expression", loc);
        }
        return desugar(singleExpr, gen);
    }

    // Multiple expressions - build nested let bindings
    // All expressions except the last should be Let bindings
    const lastExpr = exprs[exprs.length - 1];
    if (!lastExpr) {
        throw new DesugarError("Block has undefined last expression", loc);
    }

    // Process expressions right-to-left to build nested structure
    let result = desugar(lastExpr, gen);

    // Work backwards through all but the last expression
    for (let i = exprs.length - 2; i >= 0; i--) {
        const expr = exprs[i];
        if (!expr) {
            throw new DesugarError(`Block has undefined expression at index ${i}`, loc);
        }

        // Each expression should be a Let binding
        if (expr.kind !== "Let") {
            throw new DesugarError(
                "Non-let expression in block (except final expression)",
                expr.loc,
                "All expressions in a block except the last must be let bindings",
            );
        }

        // Wrap the result in a let binding
        result = {
            kind: "CoreLet",
            pattern: desugarPattern(expr.pattern, gen),
            value: desugar(expr.value, gen),
            body: result,
            mutable: expr.mutable,
            recursive: expr.recursive,
            loc: expr.loc,
        };
    }

    return result;
}

/**
 * Curry a multi-parameter lambda into nested single-parameter lambdas
 *
 * @param params - List of parameters
 * @param body - Lambda body
 * @param loc - Location of the lambda
 * @param gen - Fresh variable generator
 * @returns Desugared core lambda
 *
 * @example
 * // Input: (x, y, z) => x + y + z
 * // Output: (x) => (y) => (z) => x + y + z
 */
function curryLambda(
    params: Pattern[],
    body: Expr,
    loc: Location,
    gen: FreshVarGen,
): CoreExpr {
    // Zero parameters shouldn't happen (parser should catch this)
    if (params.length === 0) {
        throw new DesugarError(
            "Lambda with zero parameters",
            loc,
            "Lambdas must have at least one parameter",
        );
    }

    // Single parameter - just desugar
    if (params.length === 1) {
        const param = params[0];
        if (!param) {
            throw new DesugarError("Lambda has undefined parameter", loc);
        }
        return {
            kind: "CoreLambda",
            param: desugarPattern(param, gen),
            body: desugar(body, gen),
            loc,
        };
    }

    // Multiple parameters - curry
    // Build nested lambdas from left to right
    const firstParam = params[0];
    if (!firstParam) {
        throw new DesugarError("Lambda has undefined first parameter", loc);
    }

    // The body of the first lambda is another lambda with remaining parameters
    const innerLambda = curryLambda(params.slice(1), body, loc, gen);

    return {
        kind: "CoreLambda",
        param: desugarPattern(firstParam, gen),
        body: innerLambda,
        loc,
    };
}

/**
 * Desugar a surface expression to a core expression
 *
 * @param expr - Surface expression to desugar
 * @param gen - Fresh variable generator (optional, created if not provided)
 * @returns Desugared core expression
 * @throws {DesugarError} If desugaring fails
 *
 * @example
 * const surfaceExpr = { kind: "IntLit", value: 42, loc };
 * const coreExpr = desugar(surfaceExpr);
 * // => { kind: "CoreIntLit", value: 42, loc }
 */
export function desugar(expr: Expr, gen: FreshVarGen = new FreshVarGen()): CoreExpr {
    switch (expr.kind) {
        // Literals - direct translation
        case "IntLit":
            return {
                kind: "CoreIntLit",
                value: expr.value,
                loc: expr.loc,
            };

        case "FloatLit":
            return {
                kind: "CoreFloatLit",
                value: expr.value,
                loc: expr.loc,
            };

        case "StringLit":
            return {
                kind: "CoreStringLit",
                value: expr.value,
                loc: expr.loc,
            };

        case "BoolLit":
            return {
                kind: "CoreBoolLit",
                value: expr.value,
                loc: expr.loc,
            };

        case "UnitLit":
            return {
                kind: "CoreUnitLit",
                loc: expr.loc,
            };

        // Variables - direct translation
        case "Var":
            return {
                kind: "CoreVar",
                name: expr.name,
                loc: expr.loc,
            };

        // Let bindings - desugar value and body
        case "Let":
            return {
                kind: "CoreLet",
                pattern: desugarPattern(expr.pattern, gen),
                value: desugar(expr.value, gen),
                body: desugar(expr.body, gen),
                mutable: expr.mutable,
                recursive: expr.recursive,
                loc: expr.loc,
            };

        // Lambdas - curry multi-parameter lambdas
        case "Lambda":
            return curryLambda(expr.params, expr.body, expr.loc, gen);

        // Function application - desugar function and arguments
        case "App":
            return {
                kind: "CoreApp",
                func: desugar(expr.func, gen),
                args: expr.args.map((arg) => desugar(arg, gen)),
                loc: expr.loc,
            };

        // If-then-else - will desugar to match
        case "If":
            // TODO: Implement if-then-else desugaring
            throw new DesugarError(
                "If-then-else desugaring not yet implemented",
                expr.loc,
                "This will be implemented in Phase 11",
            );

        // Match - desugar expression and cases
        case "Match":
            return {
                kind: "CoreMatch",
                expr: desugar(expr.expr, gen),
                cases: expr.cases.map((matchCase) => {
                    const coreCase: any = {
                        pattern: desugarPattern(matchCase.pattern, gen),
                        body: desugar(matchCase.body, gen),
                        loc: matchCase.loc,
                    };
                    if (matchCase.guard) {
                        coreCase.guard = desugar(matchCase.guard, gen);
                    }
                    return coreCase;
                }),
                loc: expr.loc,
            };

        // Records - desugar field values
        case "Record":
            return {
                kind: "CoreRecord",
                fields: expr.fields.map((field) => ({
                    name: field.name,
                    value: desugar(field.value, gen),
                    loc: field.loc,
                })),
                loc: expr.loc,
            };

        // Record access - desugar record expression
        case "RecordAccess":
            return {
                kind: "CoreRecordAccess",
                record: desugar(expr.record, gen),
                field: expr.field,
                loc: expr.loc,
            };

        // Record update - will implement later
        case "RecordUpdate":
            // TODO: Implement record update desugaring
            throw new DesugarError(
                "Record update desugaring not yet implemented",
                expr.loc,
                "This will be implemented in Phase 10",
            );

        // List literals - will desugar to Cons/Nil
        case "List":
            // TODO: Implement list literal desugaring
            throw new DesugarError(
                "List literal desugaring not yet implemented",
                expr.loc,
                "This will be implemented in Phase 7",
            );

        // List cons operator - will desugar to Cons variant
        case "ListCons":
            // TODO: Implement list cons desugaring
            throw new DesugarError(
                "List cons desugaring not yet implemented",
                expr.loc,
                "This will be implemented in Phase 7",
            );

        // Binary operations
        case "BinOp":
            return desugarBinOp(expr.op, expr.left, expr.right, expr.loc, gen);

        // Unary operations - desugar operand
        case "UnaryOp":
            return {
                kind: "CoreUnaryOp",
                op: expr.op,
                expr: desugar(expr.expr, gen),
                loc: expr.loc,
            };

        // Pipe operator - will desugar to function application
        case "Pipe":
            // TODO: Implement pipe desugaring
            throw new DesugarError(
                "Pipe operator desugaring not yet implemented",
                expr.loc,
                "This will be implemented in Phase 5",
            );

        // Block expressions - desugar to nested lets
        case "Block":
            return desugarBlock(expr.exprs, expr.loc, gen);

        // Type annotation - preserve, desugar inner expression
        case "TypeAnnotation":
            return {
                kind: "CoreTypeAnnotation",
                expr: desugar(expr.expr, gen),
                typeExpr: desugarTypeExpr(expr.typeExpr),
                loc: expr.loc,
            };

        // Unsafe block - preserve boundary, desugar contents
        case "Unsafe":
            return {
                kind: "CoreUnsafe",
                expr: desugar(expr.expr, gen),
                loc: expr.loc,
            };

        default:
            // Should never reach here if all cases are covered
            throw new DesugarError(
                `Unknown expression kind: ${(expr as any).kind}`,
                (expr as any).loc,
                "This may indicate a parser bug or missing desugaring implementation",
            );
    }
}

/**
 * Desugar a binary operation
 */
function desugarBinOp(
    op: BinaryOp,
    left: Expr,
    right: Expr,
    loc: Location,
    gen: FreshVarGen,
): CoreExpr {
    // Handle composition operators specially
    if (op === "ForwardCompose" || op === "BackwardCompose") {
        // TODO: Implement composition desugaring
        throw new DesugarError(
            "Function composition desugaring not yet implemented",
            loc,
            "This will be implemented in Phase 6",
        );
    }

    // Cons operator is not a binary op in Core AST - it's a variant
    if (op === "Cons") {
        // TODO: Implement cons desugaring
        throw new DesugarError(
            "Cons operator desugaring not yet implemented",
            loc,
            "This will be implemented in Phase 7",
        );
    }

    // All other binary operators are preserved
    return {
        kind: "CoreBinOp",
        op: op as any, // Type assertion safe - we excluded composition and cons
        left: desugar(left, gen),
        right: desugar(right, gen),
        loc,
    };
}

/**
 * Desugar a pattern
 *
 * @param pattern - Surface pattern to desugar
 * @param gen - Fresh variable generator
 * @returns Desugared core pattern
 */
export function desugarPattern(pattern: Pattern, gen: FreshVarGen): CorePattern {
    switch (pattern.kind) {
        case "VarPattern":
            return {
                kind: "CoreVarPattern",
                name: pattern.name,
                loc: pattern.loc,
            };

        case "WildcardPattern":
            return {
                kind: "CoreWildcardPattern",
                loc: pattern.loc,
            };

        case "LiteralPattern":
            return {
                kind: "CoreLiteralPattern",
                literal: pattern.literal,
                loc: pattern.loc,
            };

        case "ConstructorPattern":
            return {
                kind: "CoreVariantPattern",
                constructor: pattern.constructor,
                args: pattern.args.map((arg) => desugarPattern(arg, gen)),
                loc: pattern.loc,
            };

        case "RecordPattern":
            return {
                kind: "CoreRecordPattern",
                fields: pattern.fields.map((field) => ({
                    name: field.name,
                    pattern: desugarPattern(field.pattern, gen),
                    loc: field.loc,
                })),
                loc: pattern.loc,
            };

        case "ListPattern":
            // TODO: Implement list pattern desugaring
            throw new DesugarError(
                "List pattern desugaring not yet implemented",
                pattern.loc,
                "This will be implemented in Phase 9",
            );

        case "OrPattern":
            // TODO: Implement or-pattern expansion
            throw new DesugarError(
                "Or-pattern desugaring not yet implemented",
                pattern.loc,
                "This will be implemented in Phase 12",
            );

        default:
            throw new DesugarError(
                `Unknown pattern kind: ${(pattern as any).kind}`,
                (pattern as any).loc,
                "This may indicate a parser bug",
            );
    }
}

/**
 * Desugar a type expression (pass through - no desugaring needed)
 */
function desugarTypeExpr(typeExpr: any): any {
    // Type expressions don't need desugaring - they're the same in Core AST
    // Just change the kind names to Core* variants
    const coreTypeExpr = { ...typeExpr };
    if (coreTypeExpr.kind) {
        coreTypeExpr.kind = `Core${coreTypeExpr.kind}`;
    }
    return coreTypeExpr;
}

/**
 * Desugar a declaration
 *
 * @param decl - Surface declaration to desugar
 * @param gen - Fresh variable generator
 * @returns Desugared core declaration(s)
 */
export function desugarDecl(
    decl: Declaration,
    gen: FreshVarGen,
): CoreDeclaration | CoreDeclaration[] {
    switch (decl.kind) {
        case "LetDecl":
            return {
                kind: "CoreLetDecl",
                pattern: desugarPattern(decl.pattern, gen),
                value: desugar(decl.value, gen),
                mutable: decl.mutable,
                recursive: decl.recursive,
                exported: decl.exported,
                loc: decl.loc,
            };

        case "TypeDecl":
            // Type declarations pass through (no desugaring needed)
            return {
                kind: "CoreTypeDecl",
                name: decl.name,
                params: decl.params,
                definition: desugarTypeDefinition(decl.definition),
                exported: decl.exported,
                loc: decl.loc,
            };

        case "ExternalDecl": {
            // External declarations pass through
            const coreDecl: any = {
                kind: "CoreExternalDecl",
                name: decl.name,
                typeExpr: desugarTypeExpr(decl.typeExpr),
                jsName: decl.jsName,
                exported: decl.exported,
                loc: decl.loc,
            };
            if (decl.from) {
                coreDecl.from = decl.from;
            }
            return coreDecl;
        }

        case "ExternalTypeDecl":
            return {
                kind: "CoreExternalTypeDecl",
                name: decl.name,
                typeExpr: desugarTypeExpr(decl.typeExpr),
                exported: decl.exported,
                loc: decl.loc,
            };

        case "ExternalBlock":
            // TODO: Implement external block expansion
            throw new DesugarError(
                "External block desugaring not yet implemented",
                decl.loc,
                "This will be implemented in Phase 13",
            );

        case "ImportDecl":
            // Import declarations pass through
            return {
                kind: "CoreImportDecl",
                items: decl.items.map((item): CoreImportItem => {
                    const coreItem: any = {
                        name: item.name,
                        isType: item.isType,
                    };
                    if (item.alias) {
                        coreItem.alias = item.alias;
                    }
                    return coreItem;
                }),
                from: decl.from,
                loc: decl.loc,
            };

        default:
            throw new DesugarError(
                `Unknown declaration kind: ${(decl as any).kind}`,
                (decl as any).loc,
                "This may indicate a parser bug",
            );
    }
}

/**
 * Desugar a type definition (pass through - no desugaring needed)
 */
function desugarTypeDefinition(def: any): any {
    const coreDef = { ...def };
    if (coreDef.kind) {
        coreDef.kind = `Core${coreDef.kind}`;
    }
    return coreDef;
}

/**
 * Desugar a module
 *
 * @param module - Surface module to desugar
 * @returns Desugared core module
 */
export function desugarModule(module: Module): CoreModule {
    const gen = new FreshVarGen();

    // Extract imports (they're in the declarations array)
    const imports: CoreImportDecl[] = [];
    const declarations: CoreDeclaration[] = [];

    for (const decl of [...module.imports, ...module.declarations]) {
        const desugared = desugarDecl(decl, gen);

        if (Array.isArray(desugared)) {
            // External blocks can expand to multiple declarations
            declarations.push(...desugared);
        } else if (desugared.kind === "CoreImportDecl") {
            imports.push(desugared);
        } else {
            declarations.push(desugared);
        }
    }

    return {
        imports,
        declarations,
        loc: module.loc,
    };
}
