# Vibefun Project Memory

## Project Overview

**Vibefun** is a pragmatic functional programming language that transpiles to JavaScript. It combines ML-style functional programming with modern type system features, targeting the JavaScript runtime for practical real-world applications.

### Quick Summary

- **Paradigm:** Pragmatic functional (like OCaml/F#)
- **Target:** JavaScript/Node.js runtime
- **Type System:** ML-style with Hindley-Milner inference
- **Key Features:** Algebraic data types, pattern matching, immutability by default, explicit JavaScript interop
- **File Extension:** `.vf`

**For comprehensive language details, syntax, semantics, and examples, see [vibefun-spec.md](./vibefun-spec.md).**

## Core Project Directives

These directives guide all development work on the vibefun project:

1. **Coding Standards**: Before writing any code, review `.claude/CODING_STANDARDS.md` to understand the project's coding conventions, naming patterns, and best practices.

2. **Detailed Planning**: Always create detailed plans before implementing changes. Use `.claude/plans/` to document plans for future reference.

3. **Documentation**: Regularly update CLAUDE.md with design decisions and project structure information. Use CLAUDE.md files in subfolders to document additional context.

4. **Type Safety**: All code must be written in TypeScript using appropriate types. The use of `any` is **strictly prohibited**.

5. **Functional Style**: Prefer functional programming style in TypeScript code. Use pure functions, immutability, and composition where possible. Classes may be used when practical (e.g., for lexers, parsers, or stateful components).

6. **Comprehensive Testing**: All code changes must include comprehensive test coverage. Tests should cover:
   - Unit tests for individual functions/components
   - Integration tests for module interactions
   - Edge cases and error conditions
   - Type checking validation

7. **Quality Checks**: After implementing any changes, always run the following in order:
   - `npm run check` - Type checking
   - `npm run lint` - Linting
   - `npm test` - Tests
   - `npm run format` - Code formatting with Prettier

   Or use the convenience command: `npm run verify` (runs all checks)

## Language Design Summary

The vibefun language design is based on these core principles:

- **Functional-first with pragmatic escape hatches** - Immutability and pure functions by default
- **Strong static typing with inference** - Hindley-Milner type system minimizes annotations
- **Algebraic data types** - Sum types (variants) and product types (records)
- **Pattern matching** - Exhaustive matching with compiler guarantees
- **Explicit JavaScript interop** - Clear FFI boundaries with `external` and `unsafe`
- **Developer experience** - Clear error messages, readable generated code, fast compilation

**For detailed language specification, see [vibefun-spec.md](./vibefun-spec.md).**

## Project Structure

The project uses **npm workspaces** to organize code into independently publishable packages:

```
vibefun/
├── .claude/              # Project plans and documentation
│   └── plans/            # Implementation plans for compiler phases
├── packages/
│   ├── core/             # @vibefun/core - Compiler library
│   │   └── src/          # Lexer, parser, types, and utilities
│   ├── cli/              # @vibefun/cli - Command-line interface
│   │   └── src/          # CLI implementation using commander
│   └── stdlib/           # @vibefun/stdlib - Standard library
│       └── src/          # Standard library implementation
├── examples/             # Example vibefun programs
├── tsconfig.base.json    # Shared TypeScript configuration
└── package.json          # Workspace root configuration
```

### Workspace Packages

- **@vibefun/core**: The compiler core library containing the lexer, parser, type system, and code generator. Can be imported as a library by other projects.
- **@vibefun/cli**: The vibefun command-line tool for compiling `.vf` files. Depends on @vibefun/core.
- **@vibefun/stdlib**: The vibefun standard library providing common functional programming utilities and operations.

## Technical Decisions

### Implementation Language
- **TypeScript**: All compiler code written in TypeScript with strict typing
- **No `any` types**: Maintain type safety throughout the codebase (strictly prohibited)
- **Functional style**: Prefer functional programming patterns (pure functions, immutability, composition)
- **Classes when practical**: Use classes for lexers, parsers, and stateful components when it improves clarity
- **Node 24.10**: Using modern Node.js features
- **Comprehensive testing**: All code must have thorough test coverage

### Compilation Pipeline

1. **Lexer**: Tokenize `.vf` source files
2. **Parser**: Build AST using recursive descent
3. **Desugarer**: Transform surface syntax to core AST
4. **Type Checker**: Infer and validate types (Algorithm W)
5. **Optimizer**: Optional optimizations (constant folding, dead code elimination)
6. **Code Generator**: Emit JavaScript + source maps

### Code Generation Strategy
- **Readable output**: Generated JavaScript should be human-readable
- **Curried functions**: Multi-argument functions become nested single-argument functions
- **Variants as objects**: `{ tag: 'Constructor', args: [...] }`
- **Source maps**: For debugging in JavaScript context

### External Function Overloading
- **Scope**: Only `external` declarations can be overloaded (not pure vibefun functions)
- **Purpose**: Enables natural JavaScript interop for APIs with multiple signatures (e.g., `fetch`, `setTimeout`)
- **Resolution**: Compile-time resolution based on argument count (arity)
- **Validation**: All overloads must map to the same JavaScript function and module
- **Type system**: Scoped to externals only - no impact on Hindley-Milner inference for pure vibefun code
- **Alternative**: Pure vibefun code uses pattern matching or different function names instead of overloading

See `vibefun-spec.md` (JavaScript Interop → Overloaded External Functions) for complete details.

### Dependencies (Planned)

Development:
- TypeScript compiler
- Vitest for testing
- Prettier (already configured)
- ESLint for linting

Runtime:
- Minimal runtime library (custom implementation)
- No external runtime dependencies for compiled output

## Quick Language Reference

### File Extension
- Source files: `.vf`
- Each file is a module

### Naming Conventions
- Types & Constructors: `PascalCase`
- Functions & Variables: `camelCase`

### Simple Examples

```vibefun
// Functions
let add = (x, y) => x + y

// Types
type Option<T> = Some(T) | None

// Pattern matching
match option {
    | Some(x) => x
    | None => 0
}

// Pipe operator
data |> filter(pred) |> map(transform) |> sum

// JavaScript interop
external log: (String) -> Unit = "console.log"
unsafe { log("Hello!") }
```

**See [vibefun-spec.md](./vibefun-spec.md) for complete syntax, semantics, type system details, and standard library.**

## Development Workflow

### Compiler Development Commands

```bash
# Build all packages
npm run build
npm run build:watch      # Watch mode (all packages)

# Build specific workspace
npm run build -w @vibefun/core
npm run build -w @vibefun/cli

# Quality checks (run after every change)
npm run check            # Type checking (all workspaces)
npm run lint             # Linting (all packages)
npm test                 # Run tests (all packages)
npm run format           # Format code (all packages)

# All checks at once
npm run verify           # Run all checks + format
npm run verify:ci        # CI version (doesn't modify files)

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report

# Workspace-specific testing
npm test -w @vibefun/core
npm test -w @vibefun/stdlib
```

### Vibefun Language Commands (Future)

```bash
vibefun compile src/main.vf -o dist/main.js
vibefun check src/main.vf          # Type check only
vibefun run src/main.vf            # Compile and run
```

### Project Configuration
`vibefun.json` will configure:
- Entry point
- Output directory
- Source map generation
- Runtime type checking mode
- Target ES version

## Testing Strategy

1. **Unit tests**: Test each compiler phase independently
2. **Integration tests**: End-to-end compilation tests
3. **Type checking tests**: Ensure type errors are caught correctly
4. **Code generation tests**: Verify JavaScript output
5. **Example programs**: Real-world usage examples

## Open Questions & Future Considerations

1. **Effect system**: How to handle async/await and side effects?
2. **Type classes**: Add trait/interface system for ad-hoc polymorphism?
3. **Module system**: More sophisticated namespace handling?
4. **Optimizations**: Tail call optimization feasibility in JavaScript?
5. **REPL**: Interactive development environment?
6. **Language server**: IDE integration with LSP?
7. **Package manager**: Dependency management system?

## Important Notes

- Always maintain location information for good error messages
- Type inference should minimize need for annotations
- JavaScript interop must be explicit and type-safe
- Generated code should be readable for debugging
- Developer experience is a first-class concern
- Document design decisions as we make them

## Documentation Resources

### Language Documentation
- **[vibefun-spec.md](./vibefun-spec.md)** - Complete language specification (syntax, types, semantics, standard library)

### Design & Planning Documents
- **[.claude/plans/language-design.md](./.claude/plans/language-design.md)** - Original language design exploration
- **[.claude/plans/type-system.md](./.claude/plans/type-system.md)** - Detailed type system design and algorithms
- **[.claude/plans/compiler-architecture.md](./.claude/plans/compiler-architecture.md)** - Compiler pipeline design
- **[.claude/plans/lexer-implementation.md](./.claude/plans/lexer-implementation.md)** - Detailed lexer implementation plan

# Additional Instructions
- Documentation Rules @.claude/DOCUMENTATION_RULES.md
- Coding Standards @.claude/CODING_STANDARDS.md
