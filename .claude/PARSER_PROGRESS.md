# Parser Implementation Progress Tracker

This document tracks the implementation progress of the vibefun parser through its 8 phases.

## Phase 1: Setup

**Time Estimate:** 1 hour
**Actual Time:** ~45 minutes
**Status:** ✅ Done

### Tasks
- [x] Extend `src/types/ast.ts` with all AST node types
- [x] Add Expr type with all expression variants (17 kinds)
- [x] Add Pattern type with all pattern variants (7 kinds)
- [x] Add TypeExpr type with all type expression variants (7 kinds)
- [x] Add Declaration type with all declaration variants (4 kinds)
- [x] Add Module type
- [x] Add helper types (BinaryOp, UnaryOp, RecordField, MatchCase, etc.)
- [x] Create/extend `src/utils/error.ts` with ParserError class (already existed)
- [x] Implement error formatting with source context (already existed)
- [x] Create `src/parser/parser.ts` with Parser class skeleton
- [x] Create test file scaffolds (7 test files)
- [x] Verify all checks pass (npm run verify)

### Deliverables
- `src/types/ast.ts` extended with complete AST types (293 lines total)
- `src/utils/error.ts` with ParserError class (already existed)
- `src/parser/parser.ts` skeleton (215 lines)
- `src/parser/index.ts` - Public exports
- Test file scaffolds created with todo tests:
  - `src/parser/parser.test.ts` (2 tests passing)
  - `src/parser/expressions.test.ts` (6 todo tests)
  - `src/parser/patterns.test.ts` (4 todo tests)
  - `src/parser/types.test.ts` (4 todo tests)
  - `src/parser/declarations.test.ts` (4 todo tests)
  - `src/parser/parser-integration.test.ts` (2 todo tests)
  - `src/parser/parser-errors.test.ts` (3 todo tests)
- All npm verify checks passing (372 tests, including 2 new parser tests)

### Acceptance Criteria
- [x] All AST node types defined with proper TypeScript types
- [x] Zero `any` types used
- [x] ParserError class with helpful formatting (already existed)
- [x] Parser class structure in place
- [x] All test files created
- [x] All npm run verify checks pass

### Notes
- AST types organized into 5 sections: Expressions, Patterns, Type Expressions, Declarations, Module
- Expression types: 17 variants including literals, operators, functions, control flow, data structures
- Pattern types: 7 variants for all destructuring scenarios
- Type expression types: 7 variants for complete type system support
- Declaration types: 4 variants for let, type, external, import
- Parser class includes token consumption utilities: peek, advance, isAtEnd, check, match
- Error handling with ParserError (already implemented from earlier)
- parseModule returns empty module for now (will be filled in later phases)
- Stub methods for parseExpression, parsePattern, parseTypeExpr (to be implemented)
- All test scaffolds use `it.todo()` to avoid empty test suite failures

---

## Phase 2: Core Parser

**Time Estimate:** 1.5 hours
**Actual Time:** ~30 minutes
**Status:** ✅ Done

### Tasks
- [x] Implement `peek(offset)` - look ahead at tokens (was already done in Phase 1)
- [x] Implement `advance()` - consume and return current token (was already done in Phase 1)
- [x] Implement `isAtEnd()` - check if at EOF (was already done in Phase 1)
- [x] Implement `check(type)` - test current token type (was already done in Phase 1)
- [x] Implement `match(...types)` - conditionally consume token (was already done in Phase 1)
- [x] Implement `expect(type, message)` - require token or error
- [x] Implement `error(message, location, help)` - create ParserError (was already done in Phase 1)
- [x] Implement `synchronize()` - error recovery
- [x] Write tests for token consumption methods
- [x] Write tests for error handling
- [x] Write tests for synchronization

### Deliverables
- Complete token consumption API (peek, advance, isAtEnd, check, match, expect)
- Error reporting with helpful messages
- Synchronization logic for error recovery
- `src/parser/parser.test.ts` (34 tests passing)

### Acceptance Criteria
- [x] Can navigate token stream correctly
- [x] Error messages include location and help text
- [x] Synchronization works for error recovery
- [x] All tests passing (406 total: 34 parser tests + 372 existing)
- [x] All npm run verify checks pass

### Notes
- Most core methods (peek, advance, isAtEnd, check, match) were already implemented in Phase 1
- Added `expect()` method for requiring specific token types with custom error messages
- Added `synchronize()` method for error recovery (syncs on semicolons, newlines, declaration keywords)
- Comprehensive test suite with 34 tests covering:
  - Construction and initialization (2 tests)
  - peek() method with offsets and EOF handling (4 tests)
  - advance() method and EOF behavior (3 tests)
  - isAtEnd() checks (3 tests)
  - check() method for token type matching (3 tests)
  - match() method with single and multiple types (4 tests)
  - expect() method with success/error cases (4 tests)
  - error() method with location and help text (3 tests)
  - synchronize() method with various sync points (4 tests)
  - Module parsing basics (4 tests)
- Used test helper functions to access private methods for thorough testing
- Added @ts-expect-error comments for expect() and synchronize() since they'll be used in later phases
- All quality checks passing (TypeScript, ESLint, tests, Prettier)

---

## Phase 3: Primary Expressions

**Time Estimate:** 1 hour
**Actual Time:** ~30 minutes
**Status:** ✅ Done

### Tasks
- [x] Implement `parsePrimary()` - entry point for primary expressions
- [x] Parse integer literals (INT_LITERAL)
- [x] Parse float literals (FLOAT_LITERAL)
- [x] Parse string literals (STRING_LITERAL)
- [x] Parse boolean literals (BOOL_LITERAL)
- [x] Parse unit literal `()`
- [x] Parse variables (IDENTIFIER)
- [x] Parse parenthesized expressions
- [x] Write tests for each literal type
- [x] Write tests for variables
- [x] Write tests for grouping

### Deliverables
- Primary expression parsing complete
- parseExpression() now functional (calls parsePrimary)
- parsePrimary() handles all literal types and variables
- `src/parser/expressions.test.ts` (29 tests passing + 5 todo)

### Acceptance Criteria
- [x] All literal types parse correctly (int, float, string, bool, unit)
- [x] Variables parse correctly (including unicode identifiers)
- [x] Parentheses group expressions properly
- [x] Location tracking accurate (all nodes have loc)
- [x] All tests passing (435 total: 29 new expression tests + 406 existing)

### Notes
- Implemented parseExpression() as entry point (for now, just calls parsePrimary)
- Implemented parsePrimary() with support for:
  - Integer literals (including hex 0xFF and binary 0b1010)
  - Float literals (including scientific notation 1.5e10)
  - String literals (including escape sequences and multi-line strings)
  - Boolean literals (true, false)
  - Unit literal (())
  - Variables (identifiers with unicode support)
  - Parenthesized expressions with proper nesting
- Correctly distinguishes between unit literal () and parenthesized expression (42)
- Comprehensive test suite with 29 tests covering:
  - Integer literals (5 tests): positive, zero, large, hex, binary
  - Float literals (4 tests): decimal, leading zero, scientific notation, negative exponent
  - String literals (5 tests): simple, empty, escape sequences, unicode, multi-line
  - Boolean literals (2 tests): true, false
  - Unit literal (1 test): ()
  - Variables (4 tests): simple, multi-char, with underscores, unicode
  - Parenthesized expressions (5 tests): simple, nested, variables, distinction from unit, unclosed error
  - Error cases (3 tests): unexpected token, empty input, helpful error messages
- All expression parsing errors include helpful error messages with location
- Test helper function parseExpression() for cleaner test code
- 5 todo tests for Phase 4 (operators, calls, lambdas, control flow, data structures)

---

## Phase 4a: Binary Operators with Precedence

**Time Estimate:** 1 hour
**Actual Time:** ~1.5 hours
**Status:** ✅ Done

### Tasks
- [x] Implement operator precedence climbing algorithm
- [x] Implement `parsePipe()` - pipe expressions (|>)
- [x] Implement `parseRefAssign()` - reference assignment (:=)
- [x] Implement `parseCons()` - list cons (::)
- [x] Implement `parseLogicalOr()` - logical OR (||)
- [x] Implement `parseLogicalAnd()` - logical AND (&&)
- [x] Implement `parseBitwiseOr()` - bitwise OR (|)
- [x] Implement `parseBitwiseAnd()` - bitwise AND (&)
- [x] Implement `parseEquality()` - equality (==, !=)
- [x] Implement `parseComparison()` - comparison (<, >, <=, >=)
- [x] Implement `parseShift()` - bitwise shift (<<, >>)
- [x] Implement `parseAdditive()` - addition/subtraction (+, -, ++)
- [x] Implement `parseMultiplicative()` - multiplication/division (*, /, %)
- [x] Write tests for all binary operators
- [x] Write tests for operator precedence
- [x] Write tests for associativity
- [x] Fix lexer to recognize :: token

### Deliverables
- Binary operator precedence parsing complete (10 precedence levels)
- 60+ expression tests passing
- `src/parser/parser.ts` extended with precedence methods (~500 lines total)
- `src/parser/expressions.test.ts` (60 tests passing + 4 todo)
- Lexer fix: Added COLON_COLON token recognition

### Acceptance Criteria
- [x] All binary operators parse correctly
- [x] Operator precedence correct (14 levels, binary operators: levels 2-12)
- [x] Associativity correct (left vs right)
- [x] All tests passing (462 total: 60 expression tests + 402 existing)
- [x] All npm run verify checks pass

### Notes
- Implemented 10 precedence-level parsing functions using precedence climbing algorithm
- Precedence levels (highest to lowest for binary ops):
  - Level 12: Multiplicative (*, /, %)
  - Level 11: Additive (+, -, ++)
  - Level 10: Shift (<<, >>)
  - Level 9: Comparison (<, <=, >, >=)
  - Level 8: Equality (==, !=)
  - Level 7: Bitwise AND (&)
  - Level 6: Bitwise OR (|)
  - Level 5: Logical AND (&&)
  - Level 4: Logical OR (||)
  - Level 3: List cons (::) - right-associative
  - Level 1: Reference assignment (:=) - right-associative
  - Level 2: Pipe (|>) - left-associative
- Right-associative operators: ::, :=
- Left-associative operators: all others
- Special nodes: Pipe (not BinOp), ListCons (not BinOp)
- Bug found and fixed: Lexer was tokenizing :: as two COLON tokens instead of one COLON_COLON token
- Added comprehensive tests covering:
  - All binary operators (arithmetic, comparison, logical, bitwise, special)
  - Precedence rules (5 tests verifying correct precedence)
  - Associativity (4 tests for left/right associativity)
  - Parentheses overriding precedence (1 test)

---

## Phase 4b: Unary Operators and Function Calls

**Time Estimate:** 1 hour
**Actual Time:** ~45 minutes
**Status:** ✅ Done

### Tasks
- [x] Implement `parseUnary()` - unary operators (-, !, ~)
- [x] Implement `parseCall()` - function calls with arguments
- [x] Handle curried functions
- [x] Write unary operator tests
- [x] Write function call tests

### Deliverables
- Unary operator parsing complete (precedence level 13)
- Function call parsing complete (precedence level 14 - highest)
- 15 new expression tests (7 unary + 8 function call tests)
- `src/parser/parser.ts` extended with parseUnary() and parseCall() (~550 lines total)
- `src/parser/expressions.test.ts` (75 tests passing + 3 todo)

### Acceptance Criteria
- [x] All unary operators parse correctly (-, !, ~)
- [x] Unary operators can stack (e.g., --, -!)
- [x] Unary operators bind tighter than binary operators
- [x] Function calls parse with 0, 1, or multiple arguments
- [x] Curried function calls work correctly (e.g., foo(1)(2))
- [x] Function calls bind tighter than unary operators
- [x] All tests passing (478 total: 75 expression tests + 403 existing)
- [x] All npm run verify checks pass

### Notes
- Implemented parseUnary() handling three unary operators:
  - `-` → Negate
  - `!` → LogicalNot
  - `~` → BitwiseNot
- Unary operators are right-associative (stack: -- becomes Negate(Negate(x)))
- Precedence level 13 (higher than all binary operators)
- Implemented parseCall() for function application:
  - Handles empty argument lists: `foo()`
  - Handles single/multiple arguments: `foo(1, 2, 3)`
  - Arguments can be arbitrary expressions
  - Curried calls work naturally: `foo(1)(2)` parses as App(App(foo, 1), 2)
- Precedence level 14 (highest - postfix operators)
- Updated parseMultiplicative() to call parseUnary() instead of parsePrimary()
- Call chain: Binary ops → parseUnary() → parseCall() → parsePrimary()
- Test coverage:
  - Unary operators: negation, logical not, bitwise not
  - Stacked unary operators: --, -!
  - Precedence: unary vs binary, parentheses override
  - Function calls: no args, single arg, multiple args
  - Curried calls: foo(1)(2)
  - Complex arguments: foo(a + b, c * d)
  - Precedence: calls vs unary, calls vs binary
  - Nested calls: foo(bar(x))

---

## Phase 4c: Lambda Expressions

**Time Estimate:** 45 minutes
**Actual Time:** ~40 minutes
**Status:** ✅ Done

### Tasks
- [x] Implement lambda expression parsing
- [x] Parse lambda parameters (simple variable patterns)
- [x] Parse lambda body
- [x] Write lambda tests
- [x] Distinguish lambdas from parenthesized expressions

### Deliverables
- Lambda expression parsing complete
- 9 new lambda expression tests
- `src/parser/parser.ts` extended with lambda parsing (~650 lines total)
- `src/parser/expressions.test.ts` (84 tests passing + 2 todo)

### Acceptance Criteria
- [x] Lambdas with no parameters parse correctly: `() => 42`
- [x] Lambdas with one parameter parse correctly: `(x) => x + 1`
- [x] Lambdas with multiple parameters parse correctly: `(x, y) => x + y`
- [x] Lambda body can be any expression
- [x] Nested lambdas work: `(x) => (y) => x + y`
- [x] Lambdas work as function arguments: `map((x) => x * 2, list)`
- [x] Correctly distinguishes `(x) => x` (lambda) from `(x)` (parenthesized var)
- [x] Correctly distinguishes `() => 42` (lambda) from `()` (unit literal)
- [x] All tests passing (487 total: 84 expression tests + 403 existing)
- [x] All npm run verify checks pass

### Notes
- Lambda syntax: `(param1, param2, ...) => body`
- Implemented as part of `parsePrimary()` with lookahead to distinguish from parenthesized expressions
- Uses lookahead strategy to determine if `(` starts a lambda or parenthesized expression:
  - `() =>` → lambda with no params
  - `(x) =>` → lambda with one param
  - `(x, y) =>` → lambda with multiple params
  - `(x)` → parenthesized variable
  - `(x + y)` → parenthesized expression
- Lookahead logic:
  - When seeing `(`, check first token inside
  - If `RPAREN` immediately: check for `=>` after to distinguish `() =>` from `()`
  - If `IDENTIFIER`:
    - Peek at next token after identifier
    - If `)`, peek further for `=>` to distinguish `(x) =>` from `(x)`
    - If `,`, it's lambda params `(x, y, ...)`
    - Otherwise, parse as parenthesized expression
  - Otherwise, parse as parenthesized expression
- For now, lambda parameters are simple VarPattern (identifiers only)
- Full pattern support will be added in Phase 5
- Test coverage:
  - No parameters: `() => 42`
  - Single parameter: `(x) => x + 1`
  - Multiple parameters: `(x, y) => x + y`
  - Complex body: `(x, y, z) => x * y + z`
  - Nested lambdas: `(x) => (y) => x + y`
  - As function argument: `map((x) => x * 2, list)`
  - With function call in body: `(x) => foo(x)`
  - Distinction tests: lambda vs parenthesized var, lambda vs unit literal

---

## Phase 4d: Control Flow - If/Match

**Time Estimate:** 45 minutes
**Actual Time:** ~1 hour
**Status:** ✅ Done

### Tasks
- [x] Implement if-then-else expression parsing
- [x] Implement match expression parsing
- [x] Parse match cases with simple patterns (var, wildcard)
- [x] Parse match cases with optional guards
- [x] Write if-expression tests (4 tests)
- [x] Write match-expression tests (7 tests)

### Deliverables
- If-then-else expression parsing complete
- Match expression parsing complete (with simple patterns)
- 11 new control flow tests (4 if + 7 match)
- `src/parser/parser.ts` extended with if/match parsing (~850 lines total)
- `src/parser/expressions.test.ts` (94 tests passing + 1 todo)

### Acceptance Criteria
- [x] If expressions parse correctly: `if cond then expr1 else expr2`
- [x] Nested if expressions work
- [x] Match expressions parse correctly: `match expr { | pattern => body }`
- [x] Match with multiple cases works
- [x] Match with wildcard pattern (_) works
- [x] Match with guards (when clauses) works
- [x] Case bodies parse correctly without consuming case separators
- [x] All tests passing (497 total: 94 expression tests + 403 existing)
- [x] All npm run verify checks pass

### Notes
- If expression syntax: `if condition then thenExpr else elseExpr`
- Implemented in `parsePrimary()` by checking for "if" keyword
- Parses condition, then branch, and else branch as full expressions
- Properly handles nested if expressions

- Match expression syntax: `match expr { | pattern => body | pattern when guard => body }`
- Implemented in `parsePrimary()` by checking for "match" keyword
- Patterns for now are simple: VarPattern (identifier) or WildcardPattern (_)
- Full pattern support will be added in Phase 5
- Guards are optional with `when` keyword
- Case bodies parse at `parseBitwiseAnd()` precedence level to avoid consuming `|` separator
- Important precedence fix: Match case bodies must not consume the `|` that separates cases
  - Initially tried `parseExpression()` - consumed `|` as bitwise OR
  - Then tried `parseLogicalAnd()` - still consumed `|` via `parseBitwiseOr()`
  - Final solution: `parseBitwiseAnd()` which is level 7, higher than bitwise OR (level 6)
- Case separator is `|` (PIPE token)
- Optional leading `|` before first case
- Cases can be separated by newlines and/or pipes
- Handles exactOptionalPropertyTypes by conditionally adding guard property

- Test coverage:
  - If: basic, complex condition, nested, with function calls
  - Match: single case, multiple cases, wildcard, guards, no leading pipes, complex expressions

---

## Phase 4e: Data Structures - Records and Lists

**Time Estimate:** 30 minutes
**Actual Time:** _Not started_
**Status:** 🔜 Not Started

### Tasks
- [ ] Implement `parseRecord()` - record construction and access
- [ ] Parse record field access (dot notation)
- [ ] Parse record updates with spread
- [ ] Implement `parseList()` - list literals
- [ ] Write record tests
- [ ] Write list tests

---

## Phase 4: Complex Expressions (Legacy - Replaced by 4a-4e)

**Note:** Phase 4 was broken down into sub-phases 4a-4e for more granular commits. See individual sub-phase sections above.

**Time Estimate:** 3 hours
**Actual Time:** _See sub-phases_
**Status:** 🔄 In Progress (4a complete, 4b-4e pending)

### Tasks

#### Binary Operators (1 hour) - ✅ DONE (See Phase 4a)
- [x] Implement operator precedence climbing algorithm
- [x] Implement `parsePipe()` - pipe expressions (|>)
- [x] Implement `parseLogicalOr()` - logical OR (||)
- [x] Implement `parseLogicalAnd()` - logical AND (&&)
- [x] Implement `parseEquality()` - equality (==, !=)
- [x] Implement `parseComparison()` - comparison (<, >, <=, >=)
- [x] Implement `parseAdditive()` - addition/subtraction (+, -, ++)
- [x] Implement `parseMultiplicative()` - multiplication/division (*, /, %)
- [x] Write tests for operator precedence
- [x] Write tests for associativity

#### Unary & Function Calls - 🔜 PENDING (See Phase 4b)
- [ ] Implement `parseUnary()` - unary operators (-, !, ~)

#### Function Calls & Lambdas (45 min)
- [ ] Implement `parseCall()` - function calls with arguments
- [ ] Implement `parseLambda()` - lambda expressions
- [ ] Handle curried functions
- [ ] Parse lambda parameters (patterns)
- [ ] Parse lambda body
- [ ] Write function call tests
- [ ] Write lambda tests

#### Control Flow (45 min)
- [ ] Implement `parseIf()` - if-then-else expressions
- [ ] Implement `parseMatch()` - match expressions with patterns
- [ ] Parse match cases with optional guards
- [ ] Write if-expression tests
- [ ] Write match-expression tests

#### Data Structures (30 min)
- [ ] Implement `parseRecord()` - record construction and access
- [ ] Parse record field access (dot notation)
- [ ] Parse record updates with spread
- [ ] Implement `parseList()` - list literals
- [ ] Parse list cons operator (::)
- [ ] Write record tests
- [ ] Write list tests

#### Other Expressions
- [ ] Implement `parseBlock()` - block expressions
- [ ] Handle type annotations on expressions
- [ ] Parse unsafe blocks
- [ ] Write comprehensive expression tests

### Deliverables
- All expression types implemented
- Correct operator precedence (14 levels)
- `src/parser/expressions.test.ts` complete (100+ tests)

### Acceptance Criteria
- [ ] All expression types parse correctly
- [ ] Operator precedence correct
- [ ] Associativity correct (left vs right)
- [ ] Function calls handle multiple arguments
- [ ] Lambdas support pattern parameters
- [ ] Match expressions support guards
- [ ] Records support spread syntax
- [ ] All tests passing

### Notes
_To be filled during implementation_

---

## Phase 5: Patterns

**Time Estimate:** 1.5 hours
**Actual Time:** _Not started_
**Status:** 🔜 Not Started

### Tasks
- [ ] Implement `parsePattern()` - main pattern parser
- [ ] Parse variable patterns (identifiers)
- [ ] Parse wildcard pattern (_)
- [ ] Parse literal patterns (numbers, strings, bools)
- [ ] Implement `parseConstructorPattern()` - variant constructors
- [ ] Handle nested constructor patterns
- [ ] Implement `parseRecordPattern()` - record destructuring
- [ ] Implement `parseListPattern()` - list destructuring
- [ ] Parse list patterns with rest (...rest)
- [ ] Implement or patterns (pattern1 | pattern2)
- [ ] Write tests for each pattern type
- [ ] Write tests for nested patterns
- [ ] Write tests for pattern edge cases

### Deliverables
- All pattern types implemented
- Support for nested patterns
- `src/parser/patterns.test.ts` complete (50+ tests)

### Acceptance Criteria
- [ ] All pattern types parse correctly
- [ ] Constructor patterns support nesting
- [ ] Record patterns support field renaming
- [ ] List patterns support rest elements
- [ ] Or patterns work correctly
- [ ] All tests passing

### Notes
_To be filled during implementation_

---

## Phase 6: Type Expressions

**Time Estimate:** 1 hour
**Actual Time:** _Not started_
**Status:** 🔜 Not Started

### Tasks
- [ ] Implement `parseTypeExpr()` - main type parser
- [ ] Parse type variables (lowercase identifiers in type context)
- [ ] Parse type constants (Int, String, Bool, etc.)
- [ ] Implement `parseFunctionType()` - function types with ->
- [ ] Implement `parseTypeApplication()` - generic type applications
- [ ] Parse type application arguments (List<T>, Option<Int>)
- [ ] Parse record types ({ field: Type })
- [ ] Parse variant types (Constructor1 | Constructor2)
- [ ] Parse union types (T1 | T2 | T3)
- [ ] Handle parenthesized types
- [ ] Write tests for all type expressions
- [ ] Write tests for complex nested types

### Deliverables
- All type expression types implemented
- Generic type parameter support
- `src/parser/types.test.ts` complete (40+ tests)

### Acceptance Criteria
- [ ] All type expression types parse correctly
- [ ] Function types handle multiple parameters
- [ ] Generic type applications work
- [ ] Record types parse field types
- [ ] Union types handle multiple alternatives
- [ ] All tests passing

### Notes
_To be filled during implementation_

---

## Phase 7: Declarations

**Time Estimate:** 2 hours
**Actual Time:** _Not started_
**Status:** 🔜 Not Started

### Tasks

#### Let Declarations (45 min)
- [ ] Implement `parseDeclaration()` - main declaration parser
- [ ] Implement `parseLetDecl()` - let bindings
- [ ] Handle `let rec` for recursive functions
- [ ] Handle `let mut` for mutable references
- [ ] Parse pattern on left side of =
- [ ] Parse expression on right side of =
- [ ] Handle export modifier
- [ ] Write let declaration tests

#### Type Declarations (45 min)
- [ ] Implement `parseTypeDecl()` - type definitions
- [ ] Parse type parameters (generics)
- [ ] Parse type aliases (type T = U)
- [ ] Parse record type definitions
- [ ] Parse variant type definitions with constructors
- [ ] Handle export modifier
- [ ] Write type declaration tests

#### External Declarations (15 min)
- [ ] Implement `parseExternalDecl()` - FFI declarations
- [ ] Parse external name and type
- [ ] Parse JavaScript name mapping
- [ ] Parse optional `from` module
- [ ] Write external declaration tests

#### Imports/Exports (15 min)
- [ ] Implement `parseImportDecl()` - import statements
- [ ] Parse named imports ({ a, b })
- [ ] Parse wildcard imports (*)
- [ ] Parse import aliases (as)
- [ ] Parse type imports (type keyword)
- [ ] Handle export modifier on declarations
- [ ] Write import/export tests

#### Module Structure
- [ ] Implement `parseModule()` - top-level module parser
- [ ] Collect all imports
- [ ] Collect all declarations
- [ ] Handle empty modules
- [ ] Write module structure tests

### Deliverables
- All declaration types implemented
- Module structure complete
- Import/export support
- `src/parser/declarations.test.ts` complete (50+ tests)

### Acceptance Criteria
- [ ] All declaration types parse correctly
- [ ] Recursive and mutable modifiers work
- [ ] Type definitions support all forms (alias, record, variant)
- [ ] External declarations support FFI syntax
- [ ] Imports support named and wildcard forms
- [ ] Exports work on declarations
- [ ] Module structure assembles correctly
- [ ] All tests passing

### Notes
_To be filled during implementation_

---

## Phase 8: Integration & Documentation

**Time Estimate:** 1.5 hours
**Actual Time:** _Not started_
**Status:** 🔜 Not Started

### Tasks

#### Integration Testing (45 min)
- [ ] Write complete program parsing tests
- [ ] Test function definitions with types
- [ ] Test type definitions with generics
- [ ] Test pattern matching programs
- [ ] Test programs with imports/exports
- [ ] Test programs with external declarations
- [ ] Test programs with multiple declarations
- [ ] Test real-world code examples
- [ ] `src/parser/parser-integration.test.ts` (30+ tests)

#### Error Testing (30 min)
- [ ] Test syntax error handling
- [ ] Test unexpected token errors
- [ ] Test missing token errors (expected X)
- [ ] Test error recovery and synchronization
- [ ] Test multiple errors in one program
- [ ] Verify error message quality
- [ ] `src/parser/parser-errors.test.ts` (20+ tests)

#### Documentation (15 min)
- [ ] Add JSDoc to Parser class
- [ ] Add JSDoc to all public methods
- [ ] Add usage examples in documentation
- [ ] Document error handling approach
- [ ] Update `CLAUDE.md` with parser status (folders only, no implementation details)

### Deliverables
- Complete integration test suite (30+ tests)
- Complete error test suite (20+ tests)
- Full JSDoc documentation
- Updated CLAUDE.md
- 300+ total tests passing

### Acceptance Criteria
- [ ] All integration tests passing
- [ ] All error tests passing
- [ ] Error messages are helpful and clear
- [ ] All public APIs documented with examples
- [ ] CLAUDE.md updated (structural info only)
- [ ] Total test count 300+
- [ ] All npm run verify checks pass
- [ ] Zero `any` types in codebase

### Notes
_To be filled during implementation_

---

## Overall Progress

**Total Estimated Time:** 12.5 hours
**Time Spent:** _Not started_
**Phases Completed:** 0/8 (0%)

### Success Metrics
- [ ] All 8 phases completed
- [ ] Comprehensive test coverage achieved (300+ tests)
- [ ] All npm run verify checks pass
- [ ] Zero `any` types used
- [ ] All AST node types implemented
- [ ] Documentation complete
- [ ] Parser ready for type checker implementation

### Current Status

**Not Started** - Planning phase complete, ready to begin implementation.

### Implementation Notes

_This section will be updated with important decisions, challenges, and insights during implementation._

---

## Next Steps

1. **Review Plan**: Ensure understanding of all phases
2. **Begin Phase 1**: Set up AST types and infrastructure
3. **Incremental Testing**: Write tests as features are implemented
4. **Quality Checks**: Run `npm run verify` after each phase
5. **Progress Updates**: Update this document after completing each phase

## References

- **Implementation Plan**: `.claude/plans/parser-implementation.md`
- **Language Specification**: `vibefun-spec.md`
- **Compiler Architecture**: `.claude/plans/compiler-architecture.md`
- **Coding Standards**: `.claude/CODING_STANDARDS.md`
- **Lexer Progress**: `.claude/LEXER_PROGRESS.md` (reference for successful approach)
