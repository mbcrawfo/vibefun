# Vibefun Compiler Implementation Guide

**Version:** 1.0
**Last Updated:** 2025-11-03
**Audience:** Compiler implementers and language developers

This guide provides detailed technical specifications for implementing a Vibefun compiler. It complements the [Vibefun Language Specification](./vibefun-spec.md) with implementation-specific details, algorithms, and strategies.

---

## Table of Contents

1. [Compilation Pipeline](#compilation-pipeline)
2. [AST Specifications](#ast-specifications)
3. [Type Inference Algorithm](#type-inference-algorithm)
4. [Pattern Exhaustiveness Checking](#pattern-exhaustiveness-checking)
5. [JavaScript Compilation Strategies](#javascript-compilation-strategies)
6. [Runtime Type Checking](#runtime-type-checking)
7. [Optimization Opportunities](#optimization-opportunities)
8. [Error Messages](#error-messages)
9. [Source Maps](#source-maps)

---

## Compilation Pipeline

The Vibefun compiler follows a multi-stage pipeline:

```
Source Code (.vf)
      ↓
┌─────────────┐
│   Lexer     │  Tokenization
└─────────────┘
      ↓
    Tokens
      ↓
┌─────────────┐
│   Parser    │  Surface AST construction
└─────────────┘
      ↓
  Surface AST
      ↓
┌─────────────┐
│  Desugarer  │  Transform to Core AST
└─────────────┘
      ↓
   Core AST
      ↓
┌─────────────┐
│Type Checker │  Inference + Validation
└─────────────┘
      ↓
Typed Core AST
      ↓
┌─────────────┐
│  Optimizer  │  Optional transformations
└─────────────┘
      ↓
Optimized AST
      ↓
┌─────────────┐
│  Code Gen   │  JavaScript + Source Maps
└─────────────┘
      ↓
JavaScript (.js) + Source Map (.js.map)
```

### Phase Responsibilities

**Lexer:**
- UTF-8 input handling
- Token stream generation
- Comment removal
- Location tracking for error reporting
- Semicolon insertion preparation

**Parser:**
- Recursive descent parsing
- Surface AST construction
- Precedence and associativity handling
- Location preservation
- Syntax error reporting

**Desugarer:**
- Syntactic sugar elimination (see Desugaring section in spec)
- Transformation to minimal core language
- Preserves type-relevant information
- Location mapping

**Type Checker:**
- Constraint generation
- Constraint solving (Algorithm W)
- Type inference
- Type error reporting
- Exhaustiveness checking for patterns

**Optimizer:**
- Constant folding
- Dead code elimination
- Inline expansion (optional)
- Common subexpression elimination (optional)

**Code Generator:**
- JavaScript AST construction
- Currying strategy application
- ADT representation
- Source map generation

---

## AST Specifications

### Surface AST

The Surface AST represents Vibefun source code before desugaring. It includes all syntactic sugar.

#### Core Node Types

All AST nodes include location information:

```typescript
interface Location {
    filename: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

interface ASTNode {
    loc: Location;
}
```

#### Expression Nodes

```typescript
type SurfaceExpr =
    | IntLiteral
    | FloatLiteral
    | StringLiteral
    | BoolLiteral
    | UnitLiteral
    | Identifier
    | Lambda
    | Application
    | BinaryOp
    | UnaryOp
    | IfExpr
    | MatchExpr
    | BlockExpr
    | ListLiteral
    | RecordLiteral
    | RecordAccess
    | RecordUpdate
    | LetExpr
    | RefAssign
    | Deref

interface IntLiteral extends ASTNode {
    type: 'IntLiteral';
    value: number;
}

interface FloatLiteral extends ASTNode {
    type: 'FloatLiteral';
    value: number;
}

interface StringLiteral extends ASTNode {
    type: 'StringLiteral';
    value: string;
}

interface BoolLiteral extends ASTNode {
    type: 'BoolLiteral';
    value: boolean;
}

interface UnitLiteral extends ASTNode {
    type: 'UnitLiteral';
}

interface Identifier extends ASTNode {
    type: 'Identifier';
    name: string;
}

interface Lambda extends ASTNode {
    type: 'Lambda';
    params: Pattern[];           // Surface syntax allows multiple params
    body: SurfaceExpr;
    returnType?: TypeAnnotation; // Optional type annotation
}

interface Application extends ASTNode {
    type: 'Application';
    func: SurfaceExpr;
    args: SurfaceExpr[];  // Multiple arguments allowed in surface syntax
}

interface BinaryOp extends ASTNode {
    type: 'BinaryOp';
    op: BinaryOperator;
    left: SurfaceExpr;
    right: SurfaceExpr;
}

type BinaryOperator =
    | 'Add' | 'Sub' | 'Mul' | 'Div' | 'Mod'
    | 'Eq' | 'Neq' | 'Lt' | 'Lte' | 'Gt' | 'Gte'
    | 'And' | 'Or'
    | 'Concat'  // String concatenation &
    | 'Cons'    // List cons ::
    | 'Pipe'    // Pipe |>
    | 'Compose' // Forward composition >>
    | 'ComposeBack'; // Backward composition <<

interface UnaryOp extends ASTNode {
    type: 'UnaryOp';
    op: 'Not' | 'Neg' | 'Deref';
    operand: SurfaceExpr;
}

interface IfExpr extends ASTNode {
    type: 'IfExpr';
    condition: SurfaceExpr;
    thenBranch: SurfaceExpr;
    elseBranch?: SurfaceExpr;  // Optional in surface syntax
}

interface MatchExpr extends ASTNode {
    type: 'MatchExpr';
    scrutinee: SurfaceExpr;
    cases: MatchCase[];
}

interface MatchCase {
    pattern: Pattern;
    guard?: SurfaceExpr;  // Optional when clause
    body: SurfaceExpr;
}

interface BlockExpr extends ASTNode {
    type: 'BlockExpr';
    statements: (LetDecl | SurfaceExpr)[];
}

interface ListLiteral extends ASTNode {
    type: 'ListLiteral';
    elements: (SurfaceExpr | SpreadElement)[];
}

interface SpreadElement {
    type: 'Spread';
    expr: SurfaceExpr;
}

interface RecordLiteral extends ASTNode {
    type: 'RecordLiteral';
    fields: (RecordField | RecordSpread)[];
}

interface RecordField {
    type: 'Field';
    name: string;
    value: SurfaceExpr;
}

interface RecordSpread {
    type: 'Spread';
    expr: SurfaceExpr;
}

interface RecordAccess extends ASTNode {
    type: 'RecordAccess';
    record: SurfaceExpr;
    field: string;
}

interface RecordUpdate extends ASTNode {
    type: 'RecordUpdate';
    record: SurfaceExpr;
    updates: RecordField[];
}

interface RefAssign extends ASTNode {
    type: 'RefAssign';
    ref: SurfaceExpr;
    value: SurfaceExpr;
}

interface Deref extends ASTNode {
    type: 'Deref';
    ref: SurfaceExpr;
}
```

#### Pattern Nodes

```typescript
type Pattern =
    | WildcardPattern
    | LiteralPattern
    | VarPattern
    | ConstructorPattern
    | RecordPattern
    | ListPattern
    | OrPattern;

interface WildcardPattern extends ASTNode {
    type: 'WildcardPattern';
}

interface LiteralPattern extends ASTNode {
    type: 'LiteralPattern';
    value: number | string | boolean | null;  // null for ()
}

interface VarPattern extends ASTNode {
    type: 'VarPattern';
    name: string;
    typeAnnotation?: TypeAnnotation;
}

interface ConstructorPattern extends ASTNode {
    type: 'ConstructorPattern';
    constructor: string;
    args: Pattern[];
}

interface RecordPattern extends ASTNode {
    type: 'RecordPattern';
    fields: { name: string; pattern: Pattern }[];
    // Note: No spread in record patterns (design decision)
}

interface ListPattern extends ASTNode {
    type: 'ListPattern';
    elements: Pattern[];
    spread?: { name: string; atEnd: boolean };  // Only at end allowed
}

interface OrPattern extends ASTNode {
    type: 'OrPattern';
    patterns: Pattern[];
    // Note: Variables cannot be bound in or-patterns (use match if binding needed)
}
```

#### Declaration Nodes

```typescript
type Declaration =
    | LetDecl
    | TypeDecl
    | ExternalDecl
    | ImportDecl
    | ExportDecl;

interface LetDecl extends ASTNode {
    type: 'LetDecl';
    name: string;
    params?: Pattern[];        // For function definitions
    body: SurfaceExpr;
    typeAnnotation?: TypeAnnotation;
    isRecursive: boolean;
    mutuallyRecursive?: LetDecl[];  // For let rec ... and ... patterns
}

interface TypeDecl extends ASTNode {
    type: 'TypeDecl';
    name: string;
    typeParams: string[];      // Type parameters
    definition: TypeDefinition;
}

type TypeDefinition =
    | AliasType
    | VariantType
    | RecordType;

interface AliasType {
    type: 'Alias';
    aliasedType: TypeAnnotation;
}

interface VariantType {
    type: 'Variant';
    constructors: { name: string; args: TypeAnnotation[] }[];
}

interface RecordType {
    type: 'Record';
    fields: { name: string; fieldType: TypeAnnotation }[];
}

interface ExternalDecl extends ASTNode {
    type: 'ExternalDecl';
    name: string;
    externType: TypeAnnotation;
    jsName: string;
    module?: string;  // Optional 'from "module"'
}

interface ImportDecl extends ASTNode {
    type: 'ImportDecl';
    names: string[];
    module: string;
}

interface ExportDecl extends ASTNode {
    type: 'ExportDecl';
    declaration: Declaration;
}
```

#### Type Annotation Nodes

```typescript
type TypeAnnotation =
    | TypeVar
    | TypeConstructor
    | FunctionType
    | RecordTypeAnnotation
    | UnionType;

interface TypeVar {
    type: 'TypeVar';
    name: string;
}

interface TypeConstructor {
    type: 'TypeConstructor';
    name: string;  // Int, Float, String, Bool, Unit, List, etc.
    args: TypeAnnotation[];
}

interface FunctionType {
    type: 'FunctionType';
    params: TypeAnnotation[];
    returnType: TypeAnnotation;
}

interface RecordTypeAnnotation {
    type: 'RecordType';
    fields: { name: string; fieldType: TypeAnnotation }[];
}

interface UnionType {
    type: 'UnionType';
    types: TypeAnnotation[];
}
```

#### Module Structure

```typescript
interface Module extends ASTNode {
    type: 'Module';
    filename: string;
    declarations: Declaration[];
}
```

### Core AST

The Core AST is the result of desugaring. It represents a minimal language subset:

**Key differences from Surface AST:**
- Multi-argument functions become nested lambdas
- Multi-argument applications become nested applications
- List literals become cons chains
- Record updates become record construction
- Pipe/composition operators become function applications
- String concatenation becomes String.concat calls
- If-without-else includes explicit `()` else branch
- OrPatterns are eliminated (duplicated branches)

```typescript
type CoreExpr =
    | Literal
    | Var
    | CoreLambda
    | CoreApp
    | CoreIf
    | CoreMatch
    | CoreBlock
    | CoreRecord
    | CoreRecordAccess
    | CoreRefOp;

interface CoreLambda extends ASTNode {
    type: 'CoreLambda';
    param: string;  // Single parameter only
    body: CoreExpr;
}

interface CoreApp extends ASTNode {
    type: 'CoreApp';
    func: CoreExpr;
    arg: CoreExpr;  // Single argument only
}

// Other nodes similar but without sugar
```

The core AST is the input to type checking and subsequent phases.

---

## Type Inference Algorithm

Vibefun uses **Algorithm W** (Damas-Milner type inference) with extensions for records, variants, and mutable references.

### Type Representation

```typescript
type Type =
    | TypeVariable
    | TypeConstructor
    | FunctionType
    | RecordType
    | VariantType
    | RefType;

interface TypeVariable {
    kind: 'TypeVar';
    id: number;         // Unique identifier
    level: number;      // For scoping (prevents escape)
    constraint?: Type;  // For unification
}

interface TypeConstructor {
    kind: 'TypeCon';
    name: string;       // 'Int', 'Float', 'String', 'Bool', 'Unit', 'List'
    args: Type[];
}

interface FunctionType {
    kind: 'Function';
    param: Type;
    return: Type;
}

interface RecordType {
    kind: 'Record';
    fields: Map<string, Type>;
    isOpen: boolean;    // For width subtyping
}

interface VariantType {
    kind: 'Variant';
    name: string;       // Nominal typing: name matters
    constructors: Map<string, Type[]>;
}

interface RefType {
    kind: 'Ref';
    inner: Type;
}
```

### Type Scheme (Polymorphic Types)

```typescript
interface TypeScheme {
    typeVars: number[];  // Quantified type variables
    type: Type;
}
```

### Type Environment

```typescript
class TypeEnv {
    private bindings: Map<string, TypeScheme> = new Map();
    private currentLevel: number = 0;

    // Get type scheme for variable
    lookup(name: string): TypeScheme | undefined {
        return this.bindings.get(name);
    }

    // Add binding
    extend(name: string, scheme: TypeScheme): TypeEnv {
        const newEnv = new TypeEnv();
        newEnv.bindings = new Map(this.bindings);
        newEnv.bindings.set(name, scheme);
        newEnv.currentLevel = this.currentLevel;
        return newEnv;
    }

    // Increment level for let-polymorphism
    enterLevel(): void {
        this.currentLevel++;
    }

    exitLevel(): void {
        this.currentLevel--;
    }

    getLevel(): number {
        return this.currentLevel;
    }
}
```

### Constraint Generation and Solving

**Algorithm W Implementation:**

```typescript
class TypeChecker {
    private nextTypeVarId = 0;
    private substitution: Map<number, Type> = new Map();

    // Create fresh type variable
    freshTypeVar(level: number): TypeVariable {
        return {
            kind: 'TypeVar',
            id: this.nextTypeVarId++,
            level: level,
            constraint: undefined
        };
    }

    // Instantiate type scheme (replace quantified vars with fresh vars)
    instantiate(scheme: TypeScheme, level: number): Type {
        const subst = new Map<number, Type>();
        for (const tv of scheme.typeVars) {
            subst.set(tv, this.freshTypeVar(level));
        }
        return this.applySubstitution(subst, scheme.type);
    }

    // Generalize type (quantify free type variables)
    generalize(env: TypeEnv, type: Type): TypeScheme {
        const freeVars = this.freeTypeVars(type).filter(
            tv => tv.level > env.getLevel()
        );
        return {
            typeVars: freeVars.map(tv => tv.id),
            type: type
        };
    }

    // Unification
    unify(t1: Type, t2: Type): void {
        const type1 = this.deref(t1);
        const type2 = this.deref(t2);

        if (type1.kind === 'TypeVar' && type2.kind === 'TypeVar' &&
            type1.id === type2.id) {
            return;  // Same type variable
        }

        if (type1.kind === 'TypeVar') {
            this.unifyVar(type1, type2);
            return;
        }

        if (type2.kind === 'TypeVar') {
            this.unifyVar(type2, type1);
            return;
        }

        if (type1.kind === 'Function' && type2.kind === 'Function') {
            this.unify(type1.param, type2.param);
            this.unify(type1.return, type2.return);
            return;
        }

        if (type1.kind === 'TypeCon' && type2.kind === 'TypeCon') {
            if (type1.name !== type2.name || type1.args.length !== type2.args.length) {
                throw new TypeError(`Cannot unify ${this.typeToString(type1)} with ${this.typeToString(type2)}`);
            }
            for (let i = 0; i < type1.args.length; i++) {
                this.unify(type1.args[i], type2.args[i]);
            }
            return;
        }

        if (type1.kind === 'Record' && type2.kind === 'Record') {
            this.unifyRecords(type1, type2);
            return;
        }

        if (type1.kind === 'Variant' && type2.kind === 'Variant') {
            if (type1.name !== type2.name) {
                throw new TypeError(`Cannot unify variant ${type1.name} with ${type2.name}`);
            }
            return;
        }

        if (type1.kind === 'Ref' && type2.kind === 'Ref') {
            this.unify(type1.inner, type2.inner);
            return;
        }

        throw new TypeError(`Cannot unify ${this.typeToString(type1)} with ${this.typeToString(type2)}`);
    }

    private unifyVar(tv: TypeVariable, type: Type): void {
        if (this.occursCheck(tv.id, type)) {
            throw new TypeError('Infinite type detected');
        }

        // Level adjustment for let-polymorphism
        this.adjustLevel(tv.level, type);

        this.substitution.set(tv.id, type);
    }

    private unifyRecords(r1: RecordType, r2: RecordType): void {
        // Width subtyping: r2 can have extra fields
        for (const [field, type1] of r1.fields) {
            const type2 = r2.fields.get(field);
            if (!type2) {
                if (!r2.isOpen) {
                    throw new TypeError(`Record missing field: ${field}`);
                }
            } else {
                this.unify(type1, type2);
            }
        }
    }

    private occursCheck(tvId: number, type: Type): boolean {
        const t = this.deref(type);
        if (t.kind === 'TypeVar') {
            return t.id === tvId;
        }
        // Recursively check in compound types
        return this.freeTypeVars(t).some(tv => tv.id === tvId);
    }

    private adjustLevel(targetLevel: number, type: Type): void {
        const t = this.deref(type);
        if (t.kind === 'TypeVar' && t.level > targetLevel) {
            t.level = targetLevel;
        }
        // Recursively adjust in compound types
    }

    private deref(type: Type): Type {
        if (type.kind === 'TypeVar' && this.substitution.has(type.id)) {
            return this.deref(this.substitution.get(type.id)!);
        }
        return type;
    }

    private freeTypeVars(type: Type): TypeVariable[] {
        const t = this.deref(type);
        if (t.kind === 'TypeVar') {
            return [t];
        }
        // Recursively collect from compound types
        // ... implementation details
        return [];
    }

    // Main type inference function
    infer(env: TypeEnv, expr: CoreExpr): Type {
        switch (expr.type) {
            case 'IntLiteral':
                return { kind: 'TypeCon', name: 'Int', args: [] };

            case 'FloatLiteral':
                return { kind: 'TypeCon', name: 'Float', args: [] };

            case 'StringLiteral':
                return { kind: 'TypeCon', name: 'String', args: [] };

            case 'BoolLiteral':
                return { kind: 'TypeCon', name: 'Bool', args: [] };

            case 'UnitLiteral':
                return { kind: 'TypeCon', name: 'Unit', args: [] };

            case 'Var':
                const scheme = env.lookup(expr.name);
                if (!scheme) {
                    throw new TypeError(`Undefined variable: ${expr.name}`);
                }
                return this.instantiate(scheme, env.getLevel());

            case 'CoreLambda':
                const paramType = this.freshTypeVar(env.getLevel());
                const newEnv = env.extend(expr.param, {
                    typeVars: [],
                    type: paramType
                });
                const bodyType = this.infer(newEnv, expr.body);
                return {
                    kind: 'Function',
                    param: paramType,
                    return: bodyType
                };

            case 'CoreApp':
                const funcType = this.infer(env, expr.func);
                const argType = this.infer(env, expr.arg);
                const resultType = this.freshTypeVar(env.getLevel());
                this.unify(funcType, {
                    kind: 'Function',
                    param: argType,
                    return: resultType
                });
                return resultType;

            // ... other cases
        }
    }

    // Type check a let binding (with value restriction)
    checkLet(env: TypeEnv, decl: LetDecl): [TypeEnv, Type] {
        if (decl.isRecursive) {
            // Recursive let: create type variable, infer body, generalize
            const recType = this.freshTypeVar(env.getLevel());
            const newEnv = env.extend(decl.name, {
                typeVars: [],
                type: recType
            });
            const bodyType = this.infer(newEnv, decl.body);
            this.unify(recType, bodyType);

            // Value restriction: only generalize syntactic values
            const scheme = this.isSyntacticValue(decl.body)
                ? this.generalize(env, bodyType)
                : { typeVars: [], type: bodyType };

            const finalEnv = env.extend(decl.name, scheme);
            return [finalEnv, bodyType];
        } else {
            // Non-recursive let
            const bodyType = this.infer(env, decl.body);

            // Value restriction
            const scheme = this.isSyntacticValue(decl.body)
                ? this.generalize(env, bodyType)
                : { typeVars: [], type: bodyType };

            const newEnv = env.extend(decl.name, scheme);
            return [newEnv, bodyType];
        }
    }

    // Syntactic value restriction (OCaml/SML semantics)
    private isSyntacticValue(expr: CoreExpr): boolean {
        switch (expr.type) {
            case 'IntLiteral':
            case 'FloatLiteral':
            case 'StringLiteral':
            case 'BoolLiteral':
            case 'UnitLiteral':
            case 'CoreLambda':
                return true;

            case 'Var':
                return true;

            case 'CoreRecord':
                // Record literals with syntactic value fields
                return expr.fields.every(f => this.isSyntacticValue(f.value));

            default:
                return false;
        }
    }
}
```

---

## Pattern Exhaustiveness Checking

Pattern exhaustiveness checking ensures that pattern matches cover all possible values. Vibefun uses a matrix-based algorithm similar to OCaml and Haskell.

### Pattern Matrix Algorithm

**Input:** A list of patterns `P = [p1, p2, ..., pn]` and a type `T`

**Output:** Boolean (exhaustive or not) + missing patterns

**Algorithm:**

```typescript
class ExhaustivenessChecker {
    // Check if pattern matrix is exhaustive
    isExhaustive(patterns: Pattern[], type: Type): boolean {
        const matrix = patterns.map(p => [p]);
        return this.checkMatrix(matrix, [type]);
    }

    // Core recursive algorithm
    private checkMatrix(matrix: Pattern[][], types: Type[]): boolean {
        // Base case: empty matrix is non-exhaustive
        if (matrix.length === 0) {
            return false;
        }

        // Base case: no types left means match succeeded
        if (types.length === 0) {
            return true;
        }

        const [firstType, ...restTypes] = types;

        // Get first column of patterns
        const firstColumn = matrix.map(row => row[0]);

        // If first column contains wildcard or variable, it's exhaustive
        if (firstColumn.some(p => this.isWildcard(p))) {
            return true;
        }

        // Constructor-based exhaustiveness
        if (this.isVariantType(firstType)) {
            return this.checkVariantExhaustiveness(matrix, firstType, restTypes);
        }

        if (this.isListType(firstType)) {
            return this.checkListExhaustiveness(matrix, firstType, restTypes);
        }

        // For primitive types, check literal coverage
        return this.checkLiteralExhaustiveness(firstColumn, firstType);
    }

    private isWildcard(p: Pattern): boolean {
        return p.type === 'WildcardPattern' || p.type === 'VarPattern';
    }

    private checkVariantExhaustiveness(
        matrix: Pattern[][],
        variantType: VariantType,
        restTypes: Type[]
    ): boolean {
        const constructors = Array.from(variantType.constructors.keys());

        // For each constructor, check specialized matrix
        for (const ctor of constructors) {
            const specialized = this.specializeMatrix(matrix, ctor, variantType);
            const argTypes = variantType.constructors.get(ctor)!;
            const newTypes = [...argTypes, ...restTypes];

            if (!this.checkMatrix(specialized, newTypes)) {
                return false;  // This constructor is not covered
            }
        }

        return true;  // All constructors covered
    }

    private specializeMatrix(
        matrix: Pattern[][],
        constructor: string,
        type: VariantType
    ): Pattern[][] {
        const result: Pattern[][] = [];

        for (const row of matrix) {
            const firstPattern = row[0];

            if (this.isWildcard(firstPattern)) {
                // Wildcard matches this constructor
                const arity = type.constructors.get(constructor)!.length;
                const wildcards = Array(arity).fill({ type: 'WildcardPattern' });
                result.push([...wildcards, ...row.slice(1)]);
            } else if (
                firstPattern.type === 'ConstructorPattern' &&
                firstPattern.constructor === constructor
            ) {
                // Constructor matches
                result.push([...firstPattern.args, ...row.slice(1)]);
            }
            // Other constructors are skipped (don't match)
        }

        return result;
    }

    private checkListExhaustiveness(
        matrix: Pattern[][],
        listType: TypeConstructor,
        restTypes: Type[]
    ): boolean {
        // Check empty list case
        const emptySpecialized = this.specializeListEmpty(matrix);
        if (!this.checkMatrix(emptySpecialized, restTypes)) {
            return false;
        }

        // Check non-empty (cons) case
        const consSpecialized = this.specializeListCons(matrix);
        const elementType = listType.args[0];
        const newTypes = [elementType, listType, ...restTypes];
        if (!this.checkMatrix(consSpecialized, newTypes)) {
            return false;
        }

        return true;
    }

    private specializeListEmpty(matrix: Pattern[][]): Pattern[][] {
        const result: Pattern[][] = [];
        for (const row of matrix) {
            const firstPattern = row[0];
            if (this.isWildcard(firstPattern)) {
                result.push(row.slice(1));
            } else if (
                firstPattern.type === 'ListPattern' &&
                firstPattern.elements.length === 0 &&
                !firstPattern.spread
            ) {
                result.push(row.slice(1));
            }
        }
        return result;
    }

    private specializeListCons(matrix: Pattern[][]): Pattern[][] {
        const result: Pattern[][] = [];
        for (const row of matrix) {
            const firstPattern = row[0];
            if (this.isWildcard(firstPattern)) {
                result.push([
                    { type: 'WildcardPattern' },  // head
                    { type: 'WildcardPattern' },  // tail
                    ...row.slice(1)
                ]);
            } else if (firstPattern.type === 'ListPattern') {
                if (firstPattern.elements.length > 0 || firstPattern.spread) {
                    const [head, ...tail] = firstPattern.elements;
                    const tailPattern = tail.length > 0 || firstPattern.spread
                        ? { type: 'ListPattern', elements: tail, spread: firstPattern.spread }
                        : { type: 'ListPattern', elements: [], spread: undefined };
                    result.push([head, tailPattern, ...row.slice(1)]);
                }
            }
        }
        return result;
    }

    private checkLiteralExhaustiveness(patterns: Pattern[], type: Type): boolean {
        // For Bool, check true and false are both covered
        if (type.kind === 'TypeCon' && type.name === 'Bool') {
            const hasTrue = patterns.some(p =>
                p.type === 'LiteralPattern' && p.value === true
            );
            const hasFalse = patterns.some(p =>
                p.type === 'LiteralPattern' && p.value === false
            );
            return hasTrue && hasFalse;
        }

        // For Int, Float, String: can't be exhaustive with literals
        // (infinite domain), but wildcard would catch it earlier
        return false;
    }

    // Generate witness (missing pattern) for non-exhaustive match
    generateWitness(patterns: Pattern[], type: Type): Pattern | null {
        const matrix = patterns.map(p => [p]);
        return this.generateWitnessForMatrix(matrix, [type]);
    }

    private generateWitnessForMatrix(
        matrix: Pattern[][],
        types: Type[]
    ): Pattern | null {
        if (types.length === 0) {
            return null;  // Match succeeded
        }

        if (matrix.length === 0) {
            // Missing case: construct witness
            return this.constructWitness(types[0]);
        }

        const [firstType, ...restTypes] = types;
        const firstColumn = matrix.map(row => row[0]);

        if (firstColumn.some(p => this.isWildcard(p))) {
            return null;  // Exhaustive
        }

        if (this.isVariantType(firstType)) {
            const constructors = Array.from(firstType.constructors.keys());
            for (const ctor of constructors) {
                const specialized = this.specializeMatrix(matrix, ctor, firstType);
                const argTypes = firstType.constructors.get(ctor)!;
                const witness = this.generateWitnessForMatrix(
                    specialized,
                    [...argTypes, ...restTypes]
                );
                if (witness) {
                    return {
                        type: 'ConstructorPattern',
                        constructor: ctor,
                        args: [witness]
                    };
                }
            }
        }

        return null;
    }

    private constructWitness(type: Type): Pattern {
        if (type.kind === 'TypeCon') {
            if (type.name === 'Bool') {
                return { type: 'LiteralPattern', value: true };
            }
            if (type.name === 'Int') {
                return { type: 'LiteralPattern', value: 0 };
            }
            if (type.name === 'Unit') {
                return { type: 'LiteralPattern', value: null };
            }
        }
        if (this.isVariantType(type)) {
            const firstCtor = Array.from(type.constructors.keys())[0];
            const argTypes = type.constructors.get(firstCtor)!;
            const args = argTypes.map(t => this.constructWitness(t));
            return {
                type: 'ConstructorPattern',
                constructor: firstCtor,
                args: args
            };
        }
        return { type: 'WildcardPattern' };
    }
}
```

### Error Messages for Non-Exhaustive Patterns

When a pattern match is non-exhaustive, the compiler should:
1. Report the missing case
2. Provide an example value that isn't matched

**Example error message:**

```
Error: Non-exhaustive pattern match

  match opt {
        ^^^
    | Some(x) => x
  }

Missing case: None

Suggestion: Add pattern:
  | None => ...
```

---

## JavaScript Compilation Strategies

### Curried Functions

Multi-argument functions are compiled to nested single-argument functions:

**Vibefun:**
```vibefun
let add = (x, y) => x + y
```

**JavaScript:**
```javascript
const add = (x) => (y) => x + y;
```

**Optimizations:**
- Detect full application: `add(1, 2)` can be optimized to avoid intermediate closures
- Use arity-checking for performance (check if all args provided)

```javascript
// Optimized version with arity check
const add = function(x, y) {
    if (arguments.length >= 2) {
        return x + y;  // Fast path: all args provided
    }
    return (y) => x + y;  // Partial application
};
```

### Algebraic Data Types

#### Variant Types

Compile to objects with `tag` field:

**Vibefun:**
```vibefun
type Option<T> = Some(T) | None
```

**JavaScript:**
```javascript
// Constructor functions
const Some = (value) => ({ tag: "Some", value });
const None = { tag: "None" };
```

**Pattern matching on variants:**

**Vibefun:**
```vibefun
match opt {
    | Some(x) => x
    | None => 0
}
```

**JavaScript:**
```javascript
(() => {
    switch (opt.tag) {
        case "Some":
            return opt.value;
        case "None":
            return 0;
        default:
            throw new Error("Non-exhaustive match");
    }
})()
```

#### Record Types

Compile to plain JavaScript objects:

**Vibefun:**
```vibefun
type Person = { name: String, age: Int }
let alice = { name: "Alice", age: 30 }
```

**JavaScript:**
```javascript
const alice = { name: "Alice", age: 30 };
```

**Record updates:**

**Vibefun:**
```vibefun
{ ...person, age: 31 }
```

**JavaScript:**
```javascript
{ ...person, age: 31 }
// Or for wider compatibility:
Object.assign({}, person, { age: 31 })
```

### Mutable References

Compile `Ref<T>` to objects with `.value` field:

**Vibefun:**
```vibefun
let mut counter = ref(0)
let x = !counter
counter := 5
```

**JavaScript:**
```javascript
const counter = { value: 0 };
const x = counter.value;
counter.value = 5;
```

### List Compilation

Lists can be compiled to:
1. **Linked lists** (functional, matches semantics)
2. **JavaScript arrays** (faster, but different performance characteristics)

**Recommended: Linked list representation**

```javascript
// List node
const Cons = (head, tail) => ({ tag: "Cons", head, tail });
const Nil = { tag: "Nil" };

// List literal [1, 2, 3]
const list = Cons(1, Cons(2, Cons(3, Nil)));
```

**Pattern matching on lists:**

**Vibefun:**
```vibefun
match list {
    | [] => 0
    | [x, ...xs] => x
}
```

**JavaScript:**
```javascript
(() => {
    if (list.tag === "Nil") {
        return 0;
    } else if (list.tag === "Cons") {
        const x = list.head;
        const xs = list.tail;
        return x;
    }
    throw new Error("Non-exhaustive match");
})()
```

### Pattern Matching Compilation

**Decision tree approach:** Generate nested if/switch statements

**Steps:**
1. Check tag for variant types
2. Extract fields
3. Bind variables
4. Evaluate guard (if present)
5. Execute body

**Example:**

**Vibefun:**
```vibefun
match result {
    | Ok(x) when x > 0 => "positive"
    | Ok(x) => "non-positive"
    | Err(msg) => "error: " & msg
}
```

**JavaScript:**
```javascript
(() => {
    if (result.tag === "Ok") {
        const x = result.value;
        if (x > 0) {
            return "positive";
        } else {
            return "non-positive";
        }
    } else if (result.tag === "Err") {
        const msg = result.value;
        return "error: " + msg;
    }
    throw new Error("Non-exhaustive match");
})()
```

---

## Runtime Type Checking

### Modes

Three runtime checking modes:

1. **`none`** (production): No runtime checks, trust type system
2. **`ffi`** (recommended for development): Check at FFI boundaries only
3. **`all`** (maximum safety): Check all type assertions

### Implementation

**For FFI mode:** Wrap external functions with type checkers:

```javascript
// External declaration:
// external parseInt: (String) -> Int = "parseInt"

// Without runtime checks (mode: none)
const parseInt_external = parseInt;

// With runtime checks (mode: ffi)
const parseInt_external = (str) => {
    // Check input type
    if (typeof str !== 'string') {
        throw new TypeError(`Expected String, got ${typeof str}`);
    }

    // Call external function
    const result = parseInt(str);

    // Check output type
    if (!Number.isInteger(result)) {
        throw new TypeError(`Expected Int return, got ${typeof result}`);
    }

    return result;
};
```

**For `all` mode:** Add checks at every function boundary:

```javascript
// Vibefun: let double = (x: Int) => x * 2

// Without checks
const double = (x) => x * 2;

// With checks (mode: all)
const double = (x) => {
    if (!Number.isInteger(x)) {
        throw new TypeError(`Expected Int, got ${typeof x}`);
    }
    const result = x * 2;
    if (!Number.isInteger(result)) {
        throw new TypeError(`Expected Int return, got ${typeof result}`);
    }
    return result;
};
```

### Type Checker Functions

Generate helper functions for type checking:

```javascript
// Primitive type checkers
const checkInt = (value, location) => {
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
        throw new TypeError(`Expected Int at ${location}, got ${value}`);
    }
    return value;
};

const checkString = (value, location) => {
    if (typeof value !== 'string') {
        throw new TypeError(`Expected String at ${location}, got ${typeof value}`);
    }
    return value;
};

// Variant type checker
const checkOption = (checkInner) => (value, location) => {
    if (!value || typeof value !== 'object' || !value.tag) {
        throw new TypeError(`Expected Option at ${location}`);
    }
    if (value.tag === "Some") {
        checkInner(value.value, `${location}.value`);
    } else if (value.tag !== "None") {
        throw new TypeError(`Invalid Option tag: ${value.tag}`);
    }
    return value;
};

// Record type checker
const checkPerson = (value, location) => {
    if (!value || typeof value !== 'object') {
        throw new TypeError(`Expected Person at ${location}`);
    }
    checkString(value.name, `${location}.name`);
    checkInt(value.age, `${location}.age`);
    return value;
};
```

---

## Optimization Opportunities

### Constant Folding

Evaluate constant expressions at compile time:

**Before:**
```javascript
const x = 2 + 3 * 4;
const y = "hello" + " " + "world";
```

**After:**
```javascript
const x = 14;
const y = "hello world";
```

### Dead Code Elimination

Remove unreachable code:

**Before:**
```javascript
if (true) {
    return 42;
} else {
    return 0;  // Dead code
}
```

**After:**
```javascript
return 42;
```

### Inline Expansion

Inline small functions (with care - can increase code size):

**Before:**
```javascript
const double = (x) => x * 2;
const result = double(21);
```

**After:**
```javascript
const result = 21 * 2;
```

### Tail Call Optimization

JavaScript does not guarantee TCO, but we can transform tail-recursive functions to loops:

**Vibefun:**
```vibefun
let rec sum = (n, acc) =>
    if n == 0 then acc else sum(n - 1, acc + n)
```

**Naive JavaScript:**
```javascript
const sum = (n) => (acc) => {
    if (n === 0) {
        return acc;
    } else {
        return sum(n - 1)(acc + n);  // NOT tail-call optimized
    }
};
```

**Optimized (loop):**
```javascript
const sum = (n) => (acc) => {
    while (true) {
        if (n === 0) {
            return acc;
        } else {
            const newN = n - 1;
            const newAcc = acc + n;
            n = newN;
            acc = newAcc;
            // Continue loop
        }
    }
};
```

**Detection:** Identify tail-recursive calls and transform to loops.

### Common Subexpression Elimination

Avoid recomputing the same expression:

**Before:**
```javascript
const x = a + b;
const y = (a + b) * 2;
```

**After:**
```javascript
const temp = a + b;
const x = temp;
const y = temp * 2;
```

---

## Error Messages

Good error messages are crucial for developer experience.

### Principles

1. **Clear location:** Show exactly where the error occurred
2. **Explain the problem:** What went wrong and why
3. **Suggest a fix:** How to resolve the issue
4. **Show context:** Relevant code snippet

### Error Message Format

```
Error: <Error Type>

  <source code with highlight>
  <pointer to error location>

<Clear explanation>

<Suggestion or note>
```

### Examples

#### Type Mismatch

```
Error: Type Mismatch

  let x: Int = "hello"
               ^^^^^^^

Expected type: Int
Actual type:   String

Cannot assign String to Int binding.

Suggestion: Remove type annotation or change value to an integer.
```

#### Undefined Variable

```
Error: Undefined Variable

  let y = unknownVar + 1
          ^^^^^^^^^^

Variable 'unknownVar' is not defined.

Did you mean: unknownValue, myVar, otherVar?
```

#### Non-Exhaustive Pattern Match

```
Error: Non-Exhaustive Pattern Match

  match option {
        ^^^^^^
    | Some(x) => x
  }

Missing cases:
  | None => ...

Suggestion: Add a catch-all pattern:
  | _ => <default value>
```

#### Arity Mismatch

```
Error: Arity Mismatch

  map(list)
      ^^^^

Function 'map' expects 2 arguments, but 1 was provided.

Type: <A, B>(List<A>, (A) -> B) -> List<B>

Suggestion: Provide the missing argument or use partial application:
  let mapper = map(list)
  mapper(fn)
```

#### Recursive Type

```
Error: Infinite Type

  let rec loop = (x) => loop(x)
                        ^^^^

Cannot construct infinite type: 'a = 'a -> 'b

This function calls itself in a way that creates a circular type constraint.

Note: Recursive functions must have a base case.
```

### Error Recovery

The compiler should:
1. **Continue parsing** after syntax errors to find more issues
2. **Limit cascading errors** (don't report hundreds of errors from one mistake)
3. **Provide actionable suggestions** when possible

---

## Source Maps

Source maps enable debugging Vibefun code in JavaScript environments.

### Source Map Format

Use the standard **Source Map v3** format ([specification](https://sourcemaps.info/spec.html)).

### Key Information to Track

1. **Original position** (Vibefun source line/column)
2. **Generated position** (JavaScript line/column)
3. **Original name** (variable/function names before compilation)

### Implementation Strategy

During code generation, maintain a mapping:

```typescript
interface SourceMapping {
    originalLine: number;
    originalColumn: number;
    generatedLine: number;
    generatedColumn: number;
    originalName?: string;
}

class CodeGenerator {
    private sourceMappings: SourceMapping[] = [];

    // Track mapping when generating code
    emitWithMapping(code: string, node: ASTNode, name?: string): void {
        const generatedLine = this.currentLine;
        const generatedColumn = this.currentColumn;

        this.sourceMappings.push({
            originalLine: node.loc.startLine,
            originalColumn: node.loc.startColumn,
            generatedLine,
            generatedColumn,
            originalName: name
        });

        this.emit(code);
    }

    // Generate source map file
    generateSourceMap(sourceFile: string, generatedFile: string): SourceMap {
        return {
            version: 3,
            file: generatedFile,
            sourceRoot: "",
            sources: [sourceFile],
            names: this.extractNames(),
            mappings: this.encodeMappings()
        };
    }

    private encodeMappings(): string {
        // Encode mappings using Base64 VLQ
        // ... implementation details
        return encodedMappings;
    }
}
```

### Debugging Experience

With source maps:
- Breakpoints set in `.vf` files work in debuggers
- Stack traces show Vibefun source locations
- Variable names match original Vibefun code

**Example stack trace:**

```
Error: Division by zero
    at divide (src/math.vf:15:10)      # Original source
    at calculate (src/main.vf:42:5)
    at main (src/main.vf:56:1)
```

---

## Implementation Checklist

When implementing a Vibefun compiler, ensure you have:

### Core Compiler
- [ ] Lexer with full Unicode support
- [ ] Recursive descent parser
- [ ] Desugarer for all surface syntax
- [ ] Type checker with Algorithm W
- [ ] Pattern exhaustiveness checker
- [ ] JavaScript code generator
- [ ] Source map generator

### Type System
- [ ] Type variable scoping (levels)
- [ ] Let-polymorphism with value restriction
- [ ] Width subtyping for records
- [ ] Nominal typing for variants
- [ ] Ref<T> handling
- [ ] Recursive and mutually recursive types

### Code Generation
- [ ] Curried function compilation
- [ ] ADT representation (variants, records)
- [ ] Pattern matching compilation
- [ ] List compilation
- [ ] Mutable reference compilation

### Error Handling
- [ ] Clear, actionable error messages
- [ ] Location tracking throughout pipeline
- [ ] Error recovery in parser
- [ ] Helpful suggestions

### Optional Features
- [ ] Constant folding
- [ ] Dead code elimination
- [ ] Tail call optimization (to loops)
- [ ] Inline expansion
- [ ] Runtime type checking (all modes)

### Testing
- [ ] Lexer tests (all token types, edge cases)
- [ ] Parser tests (all constructs, precedence)
- [ ] Type checker tests (inference, errors)
- [ ] Pattern exhaustiveness tests
- [ ] Code generation tests
- [ ] End-to-end integration tests

---

## Appendix: Useful Resources

### Type System Theory
- **Types and Programming Languages** by Benjamin Pierce
- **Advanced Topics in Types and Programming Languages** (Chapter on ML-style inference)
- **Algorithm W Step by Step** - Martin Grabmüller

### Pattern Matching
- **Warnings for pattern matching** - Luc Maranget (OCaml paper)
- **Compiling Pattern Matching to Good Decision Trees** - Augustsson

### Compiler Implementation
- **Modern Compiler Implementation in ML** - Andrew Appel
- **Engineering a Compiler** - Cooper & Torczon
- **Crafting Interpreters** - Robert Nystrom (for fundamentals)

### Functional Programming
- **Purely Functional Data Structures** - Chris Okasaki
- **Real World OCaml** - Yaron Minsky (for ML-style functional programming)

---

## Version History

**v1.0** (2025-11-03) - Initial release
- Complete compilation pipeline specification
- AST specifications (Surface and Core)
- Algorithm W implementation guide
- Pattern exhaustiveness checking algorithm
- JavaScript compilation strategies
- Runtime type checking modes
- Optimization opportunities
- Error message guidelines
- Source map generation

---

**End of Compiler Implementation Guide**

For the language specification, see [vibefun-spec.md](./vibefun-spec.md).

For general project information, see [CLAUDE.md](./CLAUDE.md).

