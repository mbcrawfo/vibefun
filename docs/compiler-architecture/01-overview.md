# Architecture Overview

This document provides a high-level overview of the Vibefun compiler architecture, its design philosophy, and core principles.

## System Purpose

The Vibefun compiler transforms Vibefun source code (`.vf` files) into JavaScript, enabling pragmatic functional programming on the JavaScript runtime.

**Primary Goals:**
- Compile Vibefun to readable, debuggable JavaScript
- Provide strong static type safety through type inference
- Enable interoperability with JavaScript ecosystem
- Support modern functional programming patterns
- Deliver helpful error messages for developer productivity

**Non-Goals:**
- Runtime performance optimization (prioritize correctness and readability)
- Support for older JavaScript targets (ES2020+ is sufficient)
- Competing with low-level systems languages
- Providing a full IDE experience (though LSP is a future consideration)

## Design Philosophy

The Vibefun compiler is built on these foundational principles:

### 1. Pragmatic Over Pure

Vibefun embraces pragmatism:
- Explicit JavaScript interop rather than complete isolation
- Readable JavaScript output over optimal performance
- Practical trade-offs (fail-fast errors, currying overhead)
- Real-world usability prioritized

### 2. Correctness First

Type safety and correctness take precedence:
- Strict TypeScript throughout (no `any` types)
- Comprehensive testing (1,800+ tests)
- Fail-fast error handling (report errors immediately)
- Location tracking through entire pipeline

### 3. Modularity and Extensibility

The architecture supports evolution:
- Clear phase separation with well-defined interfaces
- Pluggable optimization passes
- Modular transformations
- Extension points for new features

### 4. Developer Experience

Good errors and debuggability matter:
- Source location tracking on every AST node
- Helpful, contextual error messages
- Source map generation for debugging
- Readable generated JavaScript

### 5. Functional Style

Practice what we preach:
- Immutable data transformations
- Pure functions where possible
- Classes only for stateful components (lexer, parser)
- Functional composition patterns

## Architecture at a Glance

### Compilation Pipeline

```
┌─────────────┐
│   Source    │  .vf files (UTF-8 text)
│   Code      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Lexer     │  Source → Tokens
│             │  - Unicode normalization
└──────┬──────┘  - Keyword recognition
       │         - Comment stripping
       ▼
┌─────────────┐
│   Parser    │  Tokens → Surface AST
│             │  - Recursive descent
└──────┬──────┘  - Precedence climbing
       │         - Disambiguation
       ▼
┌─────────────┐
│  Desugarer  │  Surface AST → Core AST
│             │  - 10+ transformations
└──────┬──────┘  - Minimal core language
       │         - Modular helpers
       ▼
┌─────────────┐
│    Type     │  Core AST → Typed Core AST
│   Checker   │  - Algorithm W (Hindley-Milner)
└──────┬──────┘  - Type inference
       │         - Pattern exhaustiveness
       ▼
┌─────────────┐
│  Optimizer  │  Typed AST → Optimized AST
│             │  - 7 optimization passes
└──────┬──────┘  - Configurable levels (O0, O1, O2)
       │         - Fixed-point iteration
       ▼
┌─────────────┐
│    Code     │  Optimized AST → JavaScript
│  Generator  │  - Readable output
└──────┬──────┘  - Source maps
       │
       ▼
┌─────────────┐
│ JavaScript  │  .js + .js.map files
│   Output    │
└─────────────┘
```

### Phase Responsibilities

| Phase | Input | Output | Responsibility |
|-------|-------|--------|----------------|
| **Lexer** | Text | Tokens | Tokenization, normalization |
| **Parser** | Tokens | Surface AST | Syntax analysis, tree building |
| **Desugarer** | Surface AST | Core AST | Syntax transformation, simplification |
| **Type Checker** | Core AST | Typed Core AST | Type inference, validation |
| **Optimizer** | Typed AST | Optimized AST | Performance improvements |
| **Code Gen** | Optimized AST | JavaScript | JavaScript emission, source maps |

### Data Flow

The compiler uses a **pipeline architecture** where:

1. Each phase is **independent** and testable
2. Phases communicate through **well-defined data structures**
3. **Location information flows** through all phases
4. **Errors halt compilation** immediately (fail-fast)

## Key Architectural Decisions

### Decision 1: Two-AST Strategy

**Pattern:** Separate Surface AST and Core AST

**Rationale:**
- Parser produces full syntax (Surface AST)
- Desugarer simplifies to minimal language (Core AST)
- Type checker works on small, well-defined Core AST
- Optimizer has fewer node types to handle

**Trade-off:** Extra desugaring phase, but simpler downstream phases

### Decision 2: Modular Transformations

**Pattern:** Each desugaring transformation is a pure function

**Rationale:**
- Independently testable transformations
- Clear single responsibility
- Easy to add new transformations
- No shared state between transformations

**Trade-off:** More files, but better maintainability

### Decision 3: Pluggable Optimization

**Pattern:** Optimization passes implement common interface

**Rationale:**
- Add passes without modifying core optimizer
- Enable/disable passes individually
- Configure optimization levels (O0, O1, O2)
- Fixed-point iteration for O2

**Trade-off:** More abstraction, but highly extensible

### Decision 4: Fail-Fast Errors

**Pattern:** Stop compilation on first error

**Rationale:**
- Simpler implementation (no error recovery)
- Clear, focused error messages
- Fast feedback loop
- Errors rarely cascade meaningfully

**Trade-off:** Only reports one error at a time

### Decision 5: Location Tracking Everywhere

**Pattern:** Every AST node includes source location

**Rationale:**
- Essential for good error messages
- Required for source maps
- Minimal overhead (4 fields)
- Flows naturally through transformations

**Trade-off:** Slight memory overhead

### Decision 6: Classes for State, Functions for Logic

**Pattern:** Use classes for stateful phases, functions for pure logic

**Rationale:**
- Lexer/Parser need position tracking → classes
- Transformations are pure → functions
- Clear distinction between stateful and pure
- Follows functional programming principles

**Trade-off:** Mixed paradigm, but pragmatic

## Quality Attributes

### Correctness
**Priority:** Highest

- Strict type checking throughout compiler implementation
- Comprehensive test coverage (1,800+ tests)
- No `any` types allowed
- Fail-fast error handling

### Maintainability
**Priority:** High

- Clear module boundaries
- Pure functions favored
- Modular transformations
- Consistent coding standards

### Extensibility
**Priority:** High

- Pluggable optimization passes
- Modular desugaring transformations
- Well-defined extension points
- Clear phase interfaces

### Performance
**Priority:** Medium

- Acceptable compile times for development
- No premature optimization
- Fixed-point limits on optimizer
- Profile before optimizing

### Debuggability
**Priority:** High

- Source location tracking
- Readable JavaScript output
- Source maps for debugging
- Helpful error messages

## System Constraints

### Technical Constraints

1. **Target Platform:** JavaScript/Node.js runtime (ES2020+)
2. **Implementation Language:** TypeScript with strict mode
3. **Type System:** Hindley-Milner with extensions
4. **Testing Framework:** Vitest
5. **Module System:** ES Modules

### Design Constraints

1. **No Runtime Required:** Generated JavaScript has minimal runtime dependencies
2. **No Error Recovery:** Parser fails on first error
3. **Structural Immutability:** AST nodes are immutable (new nodes for changes)
4. **Pure Transformations:** Desugaring and optimization are pure functions

### Resource Constraints

1. **Compilation Memory:** AST size tracking to prevent excessive memory use
2. **Optimization Time:** Fixed-point iteration limits (max iterations)
3. **Test Time:** Fast test suite for rapid feedback

## Architecture Principles

### Separation of Concerns

Each phase has a single, well-defined responsibility:
- Lexer: tokenization only
- Parser: syntax analysis only
- Desugarer: syntax transformation only
- Type Checker: type inference and validation only
- Optimizer: performance improvements only
- Code Generator: JavaScript emission only

### Interface Segregation

Phases depend on minimal interfaces:
- Lexer depends on: source text
- Parser depends on: tokens
- Desugarer depends on: Surface AST
- Type Checker depends on: Core AST
- Optimizer depends on: Typed Core AST
- Code Generator depends on: Optimized Core AST

### Open/Closed Principle

Open for extension, closed for modification:
- Optimizer: add passes without changing core
- Desugarer: add transformations as functions
- Type system: extend through configuration
- Error types: extend through class inheritance

### Don't Repeat Yourself (DRY)

Utilities extract common patterns:
- `ast-analysis.ts`: AST traversal patterns
- `ast-transform.ts`: AST transformation patterns
- `substitution.ts`: Variable substitution
- `expr-equality.ts`: Deep comparison

### Single Source of Truth

Authoritative definitions:
- Language spec (`docs/spec/`): what language does
- AST types (`types/ast.ts`, `types/core-ast.ts`): syntax structure
- Coding standards (`.claude/CODING_STANDARDS.md`): implementation patterns
- This architecture doc: how components connect

## Technology Stack

### Core Technologies

- **TypeScript 5.x** - Implementation language with strict type checking
- **Node.js 24.10+** - Runtime environment
- **Vitest** - Testing framework
- **ESLint** - Linting
- **Prettier** - Code formatting

### Build System

- **npm workspaces** - Monorepo management
- **tsup** - TypeScript bundling
- **npm scripts** - Build orchestration

### Project Structure

```
vibefun/
├── packages/
│   ├── core/          # Compiler library (@vibefun/core)
│   ├── cli/           # CLI tool (@vibefun/cli)
│   └── stdlib/        # Standard library (@vibefun/stdlib)
├── docs/
│   ├── spec/          # Language specification
│   └── compiler-architecture/  # This documentation
├── .claude/
│   ├── design/        # Detailed design docs
│   └── active/        # Active task tracking
└── examples/          # Example Vibefun programs
```

## Development Workflow

### Quality Checks

Every code change must pass:

```bash
npm run verify    # Runs all checks below
npm run check     # TypeScript type checking
npm run lint      # ESLint
npm test          # All tests
npm run format    # Prettier formatting
```

### Testing Strategy

- **Unit tests:** Every public function/method
- **Integration tests:** Phase interactions
- **Edge cases:** Boundary conditions, unicode, deep nesting
- **Error cases:** All error paths tested
- **Snapshot tests:** Parser output validation

### Code Review Checklist

- No `any` types
- Explicit return types for public functions
- Comprehensive test coverage
- Error messages include locations
- All quality checks pass
- Documentation updated

## Future Architecture Evolution

### Planned Components

1. **Code Generator** - JavaScript emission (in progress)
2. **Source Maps** - Debugging support
3. **Type Checker Completion** - Full Algorithm W implementation
4. **Pattern Exhaustiveness** - Algorithm implemented
5. **Runtime Type Checking** - FFI boundary validation

### Potential Future Work

1. **Effect System** - Track side effects in type system
2. **Type Classes** - Ad-hoc polymorphism
3. **Language Server Protocol** - IDE integration
4. **REPL** - Interactive development
5. **Package Manager** - Dependency management
6. **Incremental Compilation** - Faster rebuilds
7. **Error Recovery** - Report multiple errors

### Architectural Flexibility

The architecture supports future evolution through:

- Well-defined phase interfaces (add phases without breaking existing)
- Pluggable passes (add optimizations without core changes)
- Modular transformations (add desugarings easily)
- Extension points (documented in 06-extensibility.md)

## Reading Path

After understanding this overview, continue with:

1. **[02-compilation-pipeline.md](./02-compilation-pipeline.md)** - Deep dive into each phase
2. **[03-design-patterns.md](./03-design-patterns.md)** - Architectural patterns explained
3. **[04-data-structures.md](./04-data-structures.md)** - AST and type structures
4. **[05-cross-cutting.md](./05-cross-cutting.md)** - Shared utilities and patterns
5. **[06-extensibility.md](./06-extensibility.md)** - How to extend the compiler
6. **[07-implementation-guide.md](./07-implementation-guide.md)** - Coding patterns

## Related Documentation

- **Language Spec:** `docs/spec/` - What the language does
- **Compiler Implementation Guide:** `.claude/design/compiler-implementation-guide.md` - Detailed algorithms
- **Parser Architecture:** `.claude/design/parser-architecture.md` - Parser-specific design
- **Coding Standards:** `.claude/CODING_STANDARDS.md` - Implementation conventions

---

**Last Updated:** 2025-11-23
