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
    Declaration,
    Expr,
    ListElement,
    Location,
    Module,
    Pattern,
    RecordTypeField,
    TypeExpr,
    VariantConstructor,
} from "../types/ast.js";
import type {
    CoreDeclaration,
    CoreExpr,
    CoreExternalDecl,
    CoreImportDecl,
    CoreImportItem,
    CoreMatchCase,
    CoreModule,
    CorePattern,
    CoreRecordTypeField,
    CoreTypeExpr,
    CoreVariantConstructor,
} from "../types/core-ast.js";

import { buildConsChain } from "./buildConsChain.js";
import { curryLambda } from "./curryLambda.js";
import { desugarBinOp } from "./desugarBinOp.js";
import { desugarBlock } from "./desugarBlock.js";
import { desugarComposition } from "./desugarComposition.js";
import { DesugarError } from "./DesugarError.js";
import { desugarListLiteral } from "./desugarListLiteral.js";
import { desugarListPattern } from "./desugarListPattern.js";
import { desugarListWithConcats } from "./desugarListWithConcats.js";
import { desugarPipe } from "./desugarPipe.js";
import { desugarRecordTypeField } from "./desugarRecordTypeField.js";
import { desugarTypeDefinition } from "./desugarTypeDefinition.js";
import { desugarTypeExpr } from "./desugarTypeExpr.js";
import { desugarVariantConstructor } from "./desugarVariantConstructor.js";
import { FreshVarGen } from "./FreshVarGen.js";

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
    // Local wrappers that close over desugar and desugarPattern to avoid passing callbacks everywhere
    const buildConsChainLocal = (
        elements: { kind: "Element"; expr: Expr }[],
        loc: Location,
        gen: FreshVarGen,
    ): CoreExpr => buildConsChain(elements, loc, gen, desugar);

    const desugarListWithConcatsLocal = (elements: ListElement[], loc: Location, gen: FreshVarGen): CoreExpr =>
        desugarListWithConcats(elements, loc, gen, desugar, buildConsChainLocal);

    const desugarCompositionLocal = (
        op: "ForwardCompose" | "BackwardCompose",
        left: Expr,
        right: Expr,
        loc: Location,
        gen: FreshVarGen,
    ): CoreExpr => desugarComposition(op, left, right, loc, gen, desugar);

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
            return curryLambda(expr.params, expr.body, expr.loc, gen, desugar, desugarPattern);

        // Function application - desugar function and arguments
        case "App":
            return {
                kind: "CoreApp",
                func: desugar(expr.func, gen),
                args: expr.args.map((arg) => desugar(arg, gen)),
                loc: expr.loc,
            };

        // If-then-else - desugar to match on boolean
        case "If":
            return {
                kind: "CoreMatch",
                expr: desugar(expr.condition, gen),
                cases: [
                    {
                        pattern: {
                            kind: "CoreLiteralPattern",
                            literal: true,
                            loc: expr.loc,
                        },
                        body: desugar(expr.then, gen),
                        loc: expr.loc,
                    },
                    {
                        pattern: {
                            kind: "CoreLiteralPattern",
                            literal: false,
                            loc: expr.loc,
                        },
                        body: desugar(expr.else_, gen),
                        loc: expr.loc,
                    },
                ],
                loc: expr.loc,
            };

        // Match - desugar expression and cases, expanding or-patterns
        case "Match":
            return {
                kind: "CoreMatch",
                expr: desugar(expr.expr, gen),
                cases: expr.cases.flatMap((matchCase) => {
                    // If pattern is OrPattern, expand into multiple cases
                    if (matchCase.pattern.kind === "OrPattern") {
                        return matchCase.pattern.patterns.map((altPattern) => {
                            const coreCase: CoreMatchCase = {
                                pattern: desugarPattern(altPattern, gen),
                                body: desugar(matchCase.body, gen),
                                loc: matchCase.loc,
                            };
                            if (matchCase.guard) {
                                coreCase.guard = desugar(matchCase.guard, gen);
                            }
                            return coreCase;
                        });
                    }

                    // Regular pattern - just desugar normally
                    const coreCase: CoreMatchCase = {
                        pattern: desugarPattern(matchCase.pattern, gen),
                        body: desugar(matchCase.body, gen),
                        loc: matchCase.loc,
                    };
                    if (matchCase.guard) {
                        coreCase.guard = desugar(matchCase.guard, gen);
                    }
                    return [coreCase];
                }),
                loc: expr.loc,
            };

        // Records - desugar field values
        case "Record":
            return {
                kind: "CoreRecord",
                fields: expr.fields.map((field) => {
                    if (field.kind === "Field") {
                        return {
                            kind: "Field",
                            name: field.name,
                            value: desugar(field.value, gen),
                            loc: field.loc,
                        };
                    } else {
                        // Spread in record construction
                        return {
                            kind: "Spread",
                            expr: desugar(field.expr, gen),
                            loc: field.loc,
                        };
                    }
                }),
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

        // Record update - desugar to CoreRecordUpdate
        case "RecordUpdate":
            return {
                kind: "CoreRecordUpdate",
                record: desugar(expr.record, gen),
                updates: expr.updates.map((field) => {
                    if (field.kind === "Field") {
                        return {
                            kind: "Field",
                            name: field.name,
                            value: desugar(field.value, gen),
                            loc: field.loc,
                        };
                    } else {
                        // Spread in record update
                        return {
                            kind: "Spread",
                            expr: desugar(field.expr, gen),
                            loc: field.loc,
                        };
                    }
                }),
                loc: expr.loc,
            };

        // List literals - desugar to Cons/Nil
        case "List":
            return desugarListLiteral(
                expr.elements,
                expr.loc,
                gen,
                desugar,
                buildConsChainLocal,
                desugarListWithConcatsLocal,
            );

        // Binary operations
        case "BinOp":
            return desugarBinOp(expr.op, expr.left, expr.right, expr.loc, gen, desugar, desugarCompositionLocal);

        // Unary operations - desugar operand
        case "UnaryOp":
            return {
                kind: "CoreUnaryOp",
                op: expr.op,
                expr: desugar(expr.expr, gen),
                loc: expr.loc,
            };

        // Pipe operator - desugar to function application
        case "Pipe":
            return desugarPipe(expr.expr, expr.func, expr.loc, gen, desugar);

        // Block expressions - desugar to nested lets
        case "Block":
            return desugarBlock(expr.exprs, expr.loc, gen, desugar, desugarPattern);

        // Type annotation - preserve, desugar inner expression
        case "TypeAnnotation":
            return {
                kind: "CoreTypeAnnotation",
                expr: desugar(expr.expr, gen),
                typeExpr: desugarTypeExprLocal(expr.typeExpr),
                loc: expr.loc,
            };

        // Unsafe block - preserve boundary, desugar contents
        case "Unsafe":
            return {
                kind: "CoreUnsafe",
                expr: desugar(expr.expr, gen),
                loc: expr.loc,
            };

        // Tuple expression - desugar elements
        case "Tuple":
            return {
                kind: "CoreTuple",
                elements: expr.elements.map((e) => desugar(e, gen)),
                loc: expr.loc,
            };

        // While loop - desugar to recursive function (placeholder)
        case "While":
            return {
                kind: "CoreWhile",
                condition: desugar(expr.condition, gen),
                body: desugar(expr.body, gen),
                loc: expr.loc,
            };

        default:
            // Should never reach here if all cases are covered
            throw new DesugarError(
                `Unknown expression kind: ${(expr as Expr).kind}`,
                (expr as Expr).loc,
                "This may indicate a parser bug or missing desugaring implementation",
            );
    }
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
            return desugarListPattern(pattern.elements, pattern.rest, pattern.loc, gen, desugarPattern);

        case "OrPattern":
            // Or-patterns should be expanded at the Match level before reaching here
            throw new DesugarError(
                "Or-pattern should have been expanded at match level",
                pattern.loc,
                "This is an internal compiler error - or-patterns must be expanded before pattern desugaring",
            );

        case "TuplePattern":
            return {
                kind: "CoreTuplePattern",
                elements: pattern.elements.map((p) => desugarPattern(p, gen)),
                loc: pattern.loc,
            };

        default:
            throw new DesugarError(
                `Unknown pattern kind: ${(pattern as Pattern).kind}`,
                (pattern as Pattern).loc,
                "This may indicate a parser bug",
            );
    }
}

// Type desugaring functions are wrappers to handle mutual recursion
function desugarTypeExprLocal(typeExpr: TypeExpr): CoreTypeExpr {
    return desugarTypeExpr(typeExpr, desugarRecordTypeFieldLocal, desugarVariantConstructorLocal);
}

function desugarRecordTypeFieldLocal(field: RecordTypeField): CoreRecordTypeField {
    return desugarRecordTypeField(field, desugarTypeExprLocal);
}

function desugarVariantConstructorLocal(ctor: VariantConstructor): CoreVariantConstructor {
    return desugarVariantConstructor(ctor, desugarTypeExprLocal);
}

/**
 * Desugar a declaration
 *
 * @param decl - Surface declaration to desugar
 * @param gen - Fresh variable generator
 * @returns Desugared core declaration(s)
 */
export function desugarDecl(decl: Declaration, gen: FreshVarGen): CoreDeclaration | CoreDeclaration[] {
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

        case "LetRecGroup":
            // Mutually recursive let declarations
            return {
                kind: "CoreLetRecGroup",
                bindings: decl.bindings.map((binding) => ({
                    pattern: desugarPattern(binding.pattern, gen),
                    value: desugar(binding.value, gen),
                    mutable: binding.mutable,
                    loc: binding.loc,
                })),
                exported: decl.exported,
                loc: decl.loc,
            };

        case "TypeDecl":
            // Type declarations pass through (no desugaring needed)
            return {
                kind: "CoreTypeDecl",
                name: decl.name,
                params: decl.params,
                definition: desugarTypeDefinition(
                    decl.definition,
                    desugarTypeExprLocal,
                    desugarRecordTypeFieldLocal,
                    desugarVariantConstructorLocal,
                ),
                exported: decl.exported,
                loc: decl.loc,
            };

        case "ExternalDecl": {
            // External declarations pass through
            const coreDecl: CoreExternalDecl = {
                kind: "CoreExternalDecl",
                name: decl.name,
                typeExpr: desugarTypeExprLocal(decl.typeExpr),
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
                typeExpr: desugarTypeExprLocal(decl.typeExpr),
                exported: decl.exported,
                loc: decl.loc,
            };

        case "ExternalBlock":
            // Expand external block into individual declarations
            return decl.items.map((item) => {
                if (item.kind === "ExternalValue") {
                    const coreDecl: CoreExternalDecl = {
                        kind: "CoreExternalDecl",
                        name: item.name,
                        typeExpr: desugarTypeExprLocal(item.typeExpr),
                        jsName: item.jsName,
                        exported: decl.exported,
                        loc: item.loc,
                    };
                    if (decl.from) {
                        coreDecl.from = decl.from;
                    }
                    return coreDecl;
                } else {
                    // ExternalType
                    return {
                        kind: "CoreExternalTypeDecl",
                        name: item.name,
                        typeExpr: desugarTypeExprLocal(item.typeExpr),
                        exported: decl.exported,
                        loc: item.loc,
                    };
                }
            });

        case "ImportDecl":
            // Import declarations pass through
            return {
                kind: "CoreImportDecl",
                items: decl.items.map((item): CoreImportItem => {
                    const coreItem: CoreImportItem = {
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
                `Unknown declaration kind: ${(decl as Declaration).kind}`,
                (decl as Declaration).loc,
                "This may indicate a parser bug",
            );
    }
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
