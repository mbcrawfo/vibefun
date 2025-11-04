# Vibefun Project Memory

## Project Overview

**Vibefun** is a pragmatic functional programming language that transpiles to JavaScript. It combines ML-style functional programming with modern type system features, targeting the JavaScript runtime for practical real-world applications.

### Quick Summary

- **Paradigm:** Pragmatic functional (like OCaml/F#)
- **Target:** JavaScript/Node.js runtime
- **Type System:** ML-style with Hindley-Milner inference
- **Key Features:** Algebraic data types, pattern matching, immutability by default, explicit JavaScript interop
- **File Extension:** `.vf`

**For comprehensive language details, see the [Language Specification](./docs/spec/) - start with [.agent-map.md](./docs/spec/.agent-map.md) for quick navigation to specific topics.**

## Core Project Directives

These directives guide all development work on the vibefun project:

1. **Coding Standards**: Before writing any code, review `.claude/CODING_STANDARDS.md` to understand the project's coding conventions, naming patterns, and best practices
2. **Documentation**: Regularly update CLAUDE.md with design decisions and project structure information. Use CLAUDE.md files in subfolders to document additional context.
3. **Follow the Language Specification**:
    - `./docs/spec/` contains the authoritative language specification for how Vibefun should function.
    - If you find a conflict between the code behavior and the language spec, always ask for clarification of the correct behavior.
    - When planning a feature where you have been instructed to change the language, always update the language spec to match.
4. **Comprehensive Testing**: All code changes must include comprehensive test coverage. Tests should cover:
   - Unit tests for individual functions/components
   - Integration tests for module interactions
   - Edge cases and error conditions
   - Type checking validation
5. **Quality Checks**: After implementing any changes, always run the following in order:
   - `npm run check` - Type checking
   - `npm run lint` - Linting
   - `npm test` - Tests
   - `npm run format` - Code formatting with Prettier
   - OR use the convenience command: `npm run verify` (runs all checks)


### Starting Large Tasks

Do not include time estimates during planning.

When exiting plan mode with an accepted plan:

1. **Create Task Directory**: `mkdir -p .claude/active/[task-name]/`
2. **Create Documents**:
   - `[task-name]-plan.md` - The accepted plan
   - `[task-name]-context.md` - Key files, decisions
   - `[task-name]-tasks.md` - Checklist of work
3. **Update Regularly**: Mark tasks complete immediately upon finishing.

### Continuing Tasks

- Check `.claude/active/[task-name]/` for existing tasks
- Read all three files before proceeding
- Update "Last Updated" timestamps

## Project Structure

The project uses **npm workspaces** to organize code into independently publishable packages:

```[task-name]
vibefun/
├── .claude/              # Project plans and documentation
│   ├── design/           # Design documents
│   └── active/           # Active task tracking
│       └── [task-name]/  # Task-specific plan files
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
- **Target**: ES2020 JavaScript for maximum compatibility with modern runtimes
- **Readable output**: Generated JavaScript should be human-readable for debugging
- **Source maps**: Enable debugging in JavaScript context
- **Implementation flexibility**: Specific generation patterns (currying, variant representation) are implementation details that may evolve

### External Function Overloading
- **Scope**: Only `external` declarations can be overloaded (not pure vibefun functions)
- **Purpose**: Enables natural JavaScript interop for APIs with multiple signatures (e.g., `fetch`, `setTimeout`)
- **Resolution**: Compile-time resolution based on argument count (arity)
- **Validation**: All overloads must map to the same JavaScript function and module
- **Type system**: Scoped to externals only - no impact on Hindley-Milner inference for pure vibefun code
- **Alternative**: Pure vibefun code uses pattern matching or different function names instead of overloading

See [JavaScript Interop: External Declarations](./docs/spec/10-javascript-interop/external-declarations.md) for complete details on overloaded external functions.

### Type Checker Implementation
- **Algorithm**: Constraint-based Hindley-Milner inference (Algorithm W)
- **Type variable scoping**: Level-based approach (Standard ML style) to prevent type variable escape
- **Polymorphism**: Let-polymorphism with full syntactic value restriction (OCaml/SML semantics)
- **Mutable references**: `Ref<T>` type with RefAssign (`:=`) and Deref (`!`) operators
- **Records**: Width subtyping (permissive - extra fields allowed)
- **Variants**: Nominal typing (exact name matching required)
- **Pattern matching**: Exhaustiveness checking with matrix-based algorithm
- **Mutual recursion**: Supported via `let rec f = ... and g = ...` syntax
- **Built-ins**: 46 standard library functions (List, Option, Result, String, Int, Float modules)
- **Error reporting**: Type mismatch, undefined variables, non-exhaustive patterns with helpful suggestions

See `.claude/active/type-checker/` for detailed implementation documentation.

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
- **[Language Specification](./docs/spec/)** - Complete language specification organized by topic (syntax, types, semantics, standard library)

### Design Documents
- **[.claude/design/language-design.md](.claude/design/language-design.md)** - Original language design exploration
- **[.claude/design/type-system.md](.claude/design/type-system.md)** - Detailed type system design and algorithms
- **[.claude/design/compiler-implementation-guide.md](.claude/archive/compiler-architecture.md)** - Compiler design

### Additional Instructions
- Documentation Rules @.claude/DOCUMENTATION_RULES.md
- Coding Standards @.claude/CODING_STANDARDS.md
