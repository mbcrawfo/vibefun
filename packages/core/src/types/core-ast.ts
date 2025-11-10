/**
 * Core AST type definitions for Vibefun
 *
 * This module defines the Core AST - a simplified, desugared version of the
 * Surface AST. All syntactic sugar is eliminated, leaving only the essential
 * language constructs needed for type checking and code generation.
 *
 * Key differences from Surface AST:
 * - Only single-parameter lambdas (curried)
 * - No pipe operator (desugared to function applications)
 * - No if-then-else (desugared to match on boolean)
 * - No block expressions (desugared to nested let bindings)
 * - No list literals or cons operator (desugared to Cons/Nil variants)
 * - No record update syntax (desugared to explicit field copying)
 * - No function composition operators (desugared to lambdas)
 * - No or-patterns (expanded to multiple match cases)
 */

import type { Location } from "./ast.js";

// =============================================================================
// Core Expressions
// =============================================================================

/**
 * Core expression AST nodes - simplified, desugared forms only
 */
export type CoreExpr =
    // Literals
    | CoreIntLit
    | CoreFloatLit
    | CoreStringLit
    | CoreBoolLit
    | CoreUnitLit
    // Variables and Bindings
    | CoreVar
    | CoreLet
    | CoreLetRecExpr
    // Functions - ONLY single parameter
    | CoreLambda
    | CoreApp
    // Control Flow - ONLY match (no if)
    | CoreMatch
    // Data Structures
    | CoreRecord
    | CoreRecordAccess
    | CoreRecordUpdate
    | CoreVariant
    // Operations - NO pipes or composition
    | CoreBinOp
    | CoreUnaryOp
    // Other
    | CoreTypeAnnotation
    | CoreUnsafe
    // Tuples
    | CoreTuple
    // Loops
    | CoreWhile;

/**
 * Integer literal
 */
export type CoreIntLit = {
    kind: "CoreIntLit";
    value: number;
    loc: Location;
};

/**
 * Float literal
 */
export type CoreFloatLit = {
    kind: "CoreFloatLit";
    value: number;
    loc: Location;
};

/**
 * String literal
 */
export type CoreStringLit = {
    kind: "CoreStringLit";
    value: string;
    loc: Location;
};

/**
 * Boolean literal
 */
export type CoreBoolLit = {
    kind: "CoreBoolLit";
    value: boolean;
    loc: Location;
};

/**
 * Unit literal (equivalent to void/undefined)
 */
export type CoreUnitLit = {
    kind: "CoreUnitLit";
    loc: Location;
};

/**
 * Variable reference
 */
export type CoreVar = {
    kind: "CoreVar";
    name: string;
    loc: Location;
};

/**
 * Let binding - single binding only (blocks are desugared to nested lets)
 */
export type CoreLet = {
    kind: "CoreLet";
    pattern: CorePattern;
    value: CoreExpr;
    body: CoreExpr;
    mutable: boolean;
    recursive: boolean;
    loc: Location;
};

/**
 * Mutually recursive let bindings (let rec f = ... and g = ... in body)
 */
export type CoreLetRecExpr = {
    kind: "CoreLetRecExpr";
    bindings: Array<{
        pattern: CorePattern;
        value: CoreExpr;
        mutable: boolean;
        loc: Location;
    }>;
    body: CoreExpr;
    loc: Location;
};

/**
 * Lambda - ONLY single parameter (multi-param lambdas are curried)
 */
export type CoreLambda = {
    kind: "CoreLambda";
    param: CorePattern;
    body: CoreExpr;
    loc: Location;
};

/**
 * Function application
 */
export type CoreApp = {
    kind: "CoreApp";
    func: CoreExpr;
    args: CoreExpr[];
    loc: Location;
};

/**
 * Match expression - the ONLY conditional construct in Core AST
 */
export type CoreMatch = {
    kind: "CoreMatch";
    expr: CoreExpr;
    cases: CoreMatchCase[];
    loc: Location;
};

/**
 * Match case with pattern, optional guard, and body
 */
export type CoreMatchCase = {
    pattern: CorePattern;
    guard?: CoreExpr;
    body: CoreExpr;
    loc: Location;
};

/**
 * Record literal
 */
export type CoreRecord = {
    kind: "CoreRecord";
    fields: CoreRecordField[];
    loc: Location;
};

/**
 * Core record field - can be a named field or a spread
 * Spreads are preserved through desugaring for code generation
 */
export type CoreRecordField =
    | { kind: "Field"; name: string; value: CoreExpr; loc: Location }
    | { kind: "Spread"; expr: CoreExpr; loc: Location };

/**
 * Record field access
 */
export type CoreRecordAccess = {
    kind: "CoreRecordAccess";
    record: CoreExpr;
    field: string;
    loc: Location;
};

/**
 * Record update - creates a new record with updated fields
 * Syntax: { record | field1: value1, field2: value2 }
 *
 * Semantics: Functional update - creates new record copying all fields from base record
 * and overriding specified fields with new values.
 */
export type CoreRecordUpdate = {
    kind: "CoreRecordUpdate";
    record: CoreExpr;
    updates: CoreRecordField[];
    loc: Location;
};

/**
 * Variant constructor application (includes Cons, Nil, Some, None, etc.)
 */
export type CoreVariant = {
    kind: "CoreVariant";
    constructor: string;
    args: CoreExpr[];
    loc: Location;
};

/**
 * Binary operation - excludes Pipe, ForwardCompose, BackwardCompose
 */
export type CoreBinOp = {
    kind: "CoreBinOp";
    op: CoreBinaryOp;
    left: CoreExpr;
    right: CoreExpr;
    loc: Location;
};

/**
 * Binary operators allowed in Core AST
 */
export type CoreBinaryOp =
    // Arithmetic
    | "Add"
    | "Subtract"
    | "Multiply"
    | "Divide"
    | "Modulo"
    // Comparison
    | "Equal"
    | "NotEqual"
    | "LessThan"
    | "LessEqual"
    | "GreaterThan"
    | "GreaterEqual"
    // Logical
    | "LogicalAnd"
    | "LogicalOr"
    // String
    | "Concat"
    // Reference
    | "RefAssign";

/**
 * Unary operation
 */
export type CoreUnaryOp = {
    kind: "CoreUnaryOp";
    op: CoreUnary;
    expr: CoreExpr;
    loc: Location;
};

/**
 * Unary operators
 */
export type CoreUnary = "Negate" | "LogicalNot" | "Deref";

/**
 * Type annotation
 */
export type CoreTypeAnnotation = {
    kind: "CoreTypeAnnotation";
    expr: CoreExpr;
    typeExpr: CoreTypeExpr;
    loc: Location;
};

/**
 * Unsafe block for JavaScript interop
 */
export type CoreUnsafe = {
    kind: "CoreUnsafe";
    expr: CoreExpr;
    loc: Location;
};

/**
 * Tuple expression
 */
export type CoreTuple = {
    kind: "CoreTuple";
    elements: CoreExpr[];
    loc: Location;
};

/**
 * While loop
 */
export type CoreWhile = {
    kind: "CoreWhile";
    condition: CoreExpr;
    body: CoreExpr;
    loc: Location;
};

// =============================================================================
// Core Patterns
// =============================================================================

/**
 * Core pattern AST nodes - no or-patterns (expanded to multiple cases)
 */
export type CorePattern =
    | CoreWildcardPattern
    | CoreVarPattern
    | CoreLiteralPattern
    | CoreVariantPattern
    | CoreRecordPattern
    | CoreTuplePattern;

/**
 * Wildcard pattern (_)
 */
export type CoreWildcardPattern = {
    kind: "CoreWildcardPattern";
    loc: Location;
};

/**
 * Variable pattern (binds to a name)
 */
export type CoreVarPattern = {
    kind: "CoreVarPattern";
    name: string;
    loc: Location;
};

/**
 * Literal pattern (matches exact value)
 */
export type CoreLiteralPattern = {
    kind: "CoreLiteralPattern";
    literal: CoreLiteral;
    loc: Location;
};

/**
 * Literal values for patterns
 */
export type CoreLiteral = number | string | boolean | null;

/**
 * Variant constructor pattern (includes Cons, Nil, Some, None, etc.)
 */
export type CoreVariantPattern = {
    kind: "CoreVariantPattern";
    constructor: string;
    args: CorePattern[];
    loc: Location;
};

/**
 * Record pattern for destructuring
 */
export type CoreRecordPattern = {
    kind: "CoreRecordPattern";
    fields: CoreRecordPatternField[];
    loc: Location;
};

/**
 * Record field in pattern matching
 */
export type CoreRecordPatternField = {
    name: string;
    pattern: CorePattern;
    loc: Location;
};

/**
 * Tuple pattern for destructuring
 */
export type CoreTuplePattern = {
    kind: "CoreTuplePattern";
    elements: CorePattern[];
    loc: Location;
};

// =============================================================================
// Core Type Expressions
// =============================================================================

/**
 * Core type expression AST nodes (same as surface, no desugaring needed)
 */
export type CoreTypeExpr =
    | CoreTypeVar
    | CoreTypeConst
    | CoreTypeApp
    | CoreFunctionType
    | CoreRecordType
    | CoreVariantType
    | CoreUnionType;

/**
 * Type variable
 */
export type CoreTypeVar = {
    kind: "CoreTypeVar";
    name: string;
    loc: Location;
};

/**
 * Type constant
 */
export type CoreTypeConst = {
    kind: "CoreTypeConst";
    name: string;
    loc: Location;
};

/**
 * Type application
 */
export type CoreTypeApp = {
    kind: "CoreTypeApp";
    constructor: CoreTypeExpr;
    args: CoreTypeExpr[];
    loc: Location;
};

/**
 * Function type
 */
export type CoreFunctionType = {
    kind: "CoreFunctionType";
    params: CoreTypeExpr[];
    return_: CoreTypeExpr;
    loc: Location;
};

/**
 * Record type
 */
export type CoreRecordType = {
    kind: "CoreRecordType";
    fields: CoreRecordTypeField[];
    loc: Location;
};

/**
 * Record field in type definition
 */
export type CoreRecordTypeField = {
    name: string;
    typeExpr: CoreTypeExpr;
    loc: Location;
};

/**
 * Variant type
 */
export type CoreVariantType = {
    kind: "CoreVariantType";
    constructors: CoreVariantConstructor[];
    loc: Location;
};

/**
 * Variant constructor in type definition
 */
export type CoreVariantConstructor = {
    name: string;
    args: CoreTypeExpr[];
    loc: Location;
};

/**
 * Union type
 */
export type CoreUnionType = {
    kind: "CoreUnionType";
    types: CoreTypeExpr[];
    loc: Location;
};

// =============================================================================
// Core Declarations
// =============================================================================

/**
 * Core declaration AST nodes
 */
export type CoreDeclaration =
    | CoreLetDecl
    | CoreLetRecGroup
    | CoreTypeDecl
    | CoreExternalDecl
    | CoreExternalTypeDecl
    | CoreImportDecl;

/**
 * Let declaration at module level
 */
export type CoreLetDecl = {
    kind: "CoreLetDecl";
    pattern: CorePattern;
    value: CoreExpr;
    mutable: boolean;
    recursive: boolean;
    exported: boolean;
    loc: Location;
};

/**
 * Mutually recursive let declarations (let rec f = ... and g = ...)
 */
export type CoreLetRecGroup = {
    kind: "CoreLetRecGroup";
    bindings: Array<{
        pattern: CorePattern;
        value: CoreExpr;
        mutable: boolean;
        loc: Location;
    }>;
    exported: boolean;
    loc: Location;
};

/**
 * Type declaration
 */
export type CoreTypeDecl = {
    kind: "CoreTypeDecl";
    name: string;
    params: string[];
    definition: CoreTypeDefinition;
    exported: boolean;
    loc: Location;
};

/**
 * Type definition body
 */
export type CoreTypeDefinition = CoreAliasType | CoreRecordTypeDef | CoreVariantTypeDef;

/**
 * Type alias
 */
export type CoreAliasType = {
    kind: "CoreAliasType";
    typeExpr: CoreTypeExpr;
    loc: Location;
};

/**
 * Record type definition
 */
export type CoreRecordTypeDef = {
    kind: "CoreRecordTypeDef";
    fields: CoreRecordTypeField[];
    loc: Location;
};

/**
 * Variant type definition
 */
export type CoreVariantTypeDef = {
    kind: "CoreVariantTypeDef";
    constructors: CoreVariantConstructor[];
    loc: Location;
};

/**
 * External value declaration (desugared from external blocks)
 */
export type CoreExternalDecl = {
    kind: "CoreExternalDecl";
    name: string;
    typeExpr: CoreTypeExpr;
    jsName: string;
    from?: string;
    exported: boolean;
    loc: Location;
};

/**
 * External type declaration
 */
export type CoreExternalTypeDecl = {
    kind: "CoreExternalTypeDecl";
    name: string;
    typeExpr: CoreTypeExpr;
    exported: boolean;
    loc: Location;
};

/**
 * Import declaration
 */
export type CoreImportDecl = {
    kind: "CoreImportDecl";
    items: CoreImportItem[];
    from: string;
    loc: Location;
};

/**
 * Import item (named import with optional alias)
 */
export type CoreImportItem = {
    name: string;
    alias?: string;
    isType: boolean;
};

// =============================================================================
// Core Module
// =============================================================================

/**
 * Core module - top-level desugared AST
 */
export type CoreModule = {
    imports: CoreImportDecl[];
    declarations: CoreDeclaration[];
    loc: Location;
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for CoreExpr
 */
export function isCoreExpr(node: unknown): node is CoreExpr {
    return (
        typeof node === "object" &&
        node !== null &&
        "kind" in node &&
        typeof node.kind === "string" &&
        node.kind.startsWith("Core")
    );
}

/**
 * Type guard for CorePattern
 */
export function isCorePattern(node: unknown): node is CorePattern {
    return (
        typeof node === "object" &&
        node !== null &&
        "kind" in node &&
        typeof node.kind === "string" &&
        node.kind.startsWith("Core") &&
        node.kind.includes("Pattern")
    );
}

/**
 * Type guard for CoreDeclaration
 */
export function isCoreDeclaration(node: unknown): node is CoreDeclaration {
    return (
        typeof node === "object" &&
        node !== null &&
        "kind" in node &&
        typeof node.kind === "string" &&
        (node.kind.startsWith("Core") || node.kind.endsWith("Decl"))
    );
}

/**
 * Type guard for CoreModule
 */
export function isCoreModule(node: unknown): node is CoreModule {
    return (
        typeof node === "object" &&
        node !== null &&
        "imports" in node &&
        "declarations" in node &&
        Array.isArray((node as CoreModule).imports) &&
        Array.isArray((node as CoreModule).declarations)
    );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the kind of a CoreExpr node
 */
export function coreExprKind(expr: CoreExpr): string {
    return expr.kind;
}

/**
 * Get the kind of a CorePattern node
 */
export function corePatternKind(pattern: CorePattern): string {
    return pattern.kind;
}

/**
 * Get the kind of a CoreDeclaration node
 */
export function coreDeclarationKind(decl: CoreDeclaration): string {
    return decl.kind;
}
