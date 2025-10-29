/**
 * Abstract Syntax Tree (AST) type definitions for Vibefun
 *
 * This module defines all AST node types for the vibefun language,
 * including expressions, patterns, types, and declarations.
 * All nodes include location information for error reporting and source mapping.
 */

/**
 * Source location information for error reporting and source maps
 */
export type Location = {
    /** Source file path */
    file: string;
    /** Line number (1-indexed) */
    line: number;
    /** Column number (1-indexed) */
    column: number;
    /** Character offset from start of file (0-indexed) */
    offset: number;
};

// =============================================================================
// Expressions
// =============================================================================

/**
 * Expression AST nodes
 */
export type Expr =
    // Literals
    | { kind: "IntLit"; value: number; loc: Location }
    | { kind: "FloatLit"; value: number; loc: Location }
    | { kind: "StringLit"; value: string; loc: Location }
    | { kind: "BoolLit"; value: boolean; loc: Location }
    | { kind: "UnitLit"; loc: Location }
    // Variables and Bindings
    | { kind: "Var"; name: string; loc: Location }
    | {
          kind: "Let";
          pattern: Pattern;
          value: Expr;
          body: Expr;
          mutable: boolean;
          recursive: boolean;
          loc: Location;
      }
    // Functions
    | { kind: "Lambda"; params: Pattern[]; body: Expr; loc: Location }
    | { kind: "App"; func: Expr; args: Expr[]; loc: Location }
    // Control Flow
    | { kind: "If"; condition: Expr; then: Expr; else_: Expr; loc: Location }
    | { kind: "Match"; expr: Expr; cases: MatchCase[]; loc: Location }
    // Records
    | { kind: "Record"; fields: RecordField[]; loc: Location }
    | { kind: "RecordAccess"; record: Expr; field: string; loc: Location }
    | {
          kind: "RecordUpdate";
          record: Expr;
          updates: RecordField[];
          loc: Location;
      }
    // Lists
    | { kind: "List"; elements: Expr[]; loc: Location }
    | { kind: "ListCons"; head: Expr; tail: Expr; loc: Location }
    // Operators
    | { kind: "BinOp"; op: BinaryOp; left: Expr; right: Expr; loc: Location }
    | { kind: "UnaryOp"; op: UnaryOp; expr: Expr; loc: Location }
    // Pipe
    | { kind: "Pipe"; expr: Expr; func: Expr; loc: Location }
    // Blocks
    | { kind: "Block"; exprs: Expr[]; loc: Location }
    // Type Annotation
    | { kind: "TypeAnnotation"; expr: Expr; typeExpr: TypeExpr; loc: Location }
    // Unsafe
    | { kind: "Unsafe"; expr: Expr; loc: Location };

/**
 * Record field in record construction or update
 */
export type RecordField = {
    name: string;
    value: Expr;
    loc: Location;
};

/**
 * Match case with pattern, optional guard, and body
 */
export type MatchCase = {
    pattern: Pattern;
    guard?: Expr;
    body: Expr;
    loc: Location;
};

/**
 * Binary operators
 */
export type BinaryOp =
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
    // Bitwise
    | "BitwiseAnd"
    | "BitwiseOr"
    | "LeftShift"
    | "RightShift"
    // String
    | "Concat"
    // List
    | "Cons"
    // Composition
    | "ForwardCompose"
    | "BackwardCompose"
    // Reference
    | "RefAssign";

/**
 * Unary operators
 */
export type UnaryOp =
    | "Negate" // -x
    | "LogicalNot" // !x
    | "BitwiseNot" // ~x
    | "Deref"; // !x (in ref context)

// =============================================================================
// Patterns
// =============================================================================

/**
 * Pattern AST nodes for destructuring
 */
export type Pattern =
    | { kind: "VarPattern"; name: string; loc: Location }
    | { kind: "WildcardPattern"; loc: Location }
    | { kind: "LiteralPattern"; literal: Literal; loc: Location }
    | {
          kind: "ConstructorPattern";
          constructor: string;
          args: Pattern[];
          loc: Location;
      }
    | { kind: "RecordPattern"; fields: RecordPatternField[]; loc: Location }
    | {
          kind: "ListPattern";
          elements: Pattern[];
          rest?: Pattern;
          loc: Location;
      }
    | { kind: "OrPattern"; patterns: Pattern[]; loc: Location };

/**
 * Record field in pattern matching
 */
export type RecordPatternField = {
    name: string;
    pattern: Pattern;
    loc: Location;
};

/**
 * Literal values for patterns
 */
export type Literal = number | string | boolean | null;

// =============================================================================
// Type Expressions
// =============================================================================

/**
 * Type expression AST nodes
 */
export type TypeExpr =
    | { kind: "TypeVar"; name: string; loc: Location }
    | { kind: "TypeConst"; name: string; loc: Location }
    | {
          kind: "TypeApp";
          constructor: TypeExpr;
          args: TypeExpr[];
          loc: Location;
      }
    | {
          kind: "FunctionType";
          params: TypeExpr[];
          return_: TypeExpr;
          loc: Location;
      }
    | { kind: "RecordType"; fields: RecordTypeField[]; loc: Location }
    | { kind: "VariantType"; constructors: VariantConstructor[]; loc: Location }
    | { kind: "UnionType"; types: TypeExpr[]; loc: Location };

/**
 * Record field in type definition
 */
export type RecordTypeField = {
    name: string;
    typeExpr: TypeExpr;
    loc: Location;
};

/**
 * Variant constructor in type definition
 */
export type VariantConstructor = {
    name: string;
    args: TypeExpr[];
    loc: Location;
};

// =============================================================================
// Declarations
// =============================================================================

/**
 * Declaration AST nodes
 */
export type Declaration =
    | {
          kind: "LetDecl";
          pattern: Pattern;
          value: Expr;
          mutable: boolean;
          recursive: boolean;
          exported: boolean;
          loc: Location;
      }
    | {
          kind: "TypeDecl";
          name: string;
          params: string[];
          definition: TypeDefinition;
          exported: boolean;
          loc: Location;
      }
    | {
          kind: "ExternalDecl";
          name: string;
          typeExpr: TypeExpr;
          jsName: string;
          from?: string;
          loc: Location;
      }
    | { kind: "ImportDecl"; items: ImportItem[]; from: string; loc: Location };

/**
 * Type definition body
 */
export type TypeDefinition =
    | { kind: "AliasType"; typeExpr: TypeExpr; loc: Location }
    | { kind: "RecordTypeDef"; fields: RecordTypeField[]; loc: Location }
    | {
          kind: "VariantTypeDef";
          constructors: VariantConstructor[];
          loc: Location;
      };

/**
 * Import item (named import with optional alias)
 */
export type ImportItem = {
    name: string;
    alias?: string;
    isType: boolean;
};

// =============================================================================
// Module
// =============================================================================

/**
 * Module (top-level AST node)
 */
export type Module = {
    imports: Declaration[]; // ImportDecl[]
    declarations: Declaration[];
    loc: Location;
};
