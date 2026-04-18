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
2. **Vibefun Language Guide**: Before writing **any** `.vf` code — including test fixtures, examples, exploration, or verification scripts — **always** review `.claude/VIBEFUN_AI_CODING_GUIDE.md` first. Vibefun has critical syntax differences from other languages (e.g., semicolons are mandatory between declarations). This guide is specifically designed for AI agents writing vibefun code.
3. **Documentation**: Regularly update CLAUDE.md with design decisions and project structure information. Use CLAUDE.md files in subfolders to document additional context — see [Authoring CLAUDE.md Files](#authoring-claudemd-files) below for the rules.
4. **Follow the Language Specification**:
    - `./docs/spec/` contains the authoritative language specification for how Vibefun should function.
    - If you find a conflict between the code behavior and the language spec, always ask for clarification of the correct behavior.
    - When planning a feature where you have been instructed to change the language, always update the language spec to match.
5. **Comprehensive Testing**: All code changes must include comprehensive test coverage. Tests should cover:
   - Unit tests for individual functions/components
   - Integration tests for module interactions
   - Edge cases and error conditions
   - Type checking validation
6. **Quality Checks**: After implementing any changes, always run the following in order:
   - `pnpm run check` - Type checking
   - `pnpm run lint` - Linting
   - `pnpm test` - Tests
   - `pnpm run format` - Code formatting with Prettier
   - OR use the convenience command: `pnpm run verify` (runs all checks)

## Authoring CLAUDE.md Files

Folder-level `CLAUDE.md` files exist to give AI agents the non-obvious context they need to work safely inside a module (DI wiring, visitor order, pass/cycle semantics, fixture conventions, regeneration steps, etc.). Follow these rules.

**When to add a CLAUDE.md.** Create one when a folder has (a) non-trivial cross-file coupling like dependency injection or visitor wiring, (b) conventions a reader won't infer from the code (fixture layouts, regeneration commands, real-vs-import paths, α-equivalence), or (c) boundaries whose violation causes silent correctness bugs (e.g. `CoreUnsafe` preservation, `TypeEnv` mutation). Skip small, self-describing folders.

**How to write it.**
- **Size budget: ~100 lines or less — shorter is better.** If a folder genuinely needs more, stop and ask for approval with the reasoning before writing a longer file.
- Be brief, direct, and pitfall-first. Lead with what goes wrong, not what the folder "does".
- Never record implementation status, line counts, test counts, or progress (see `.claude/DOCUMENTATION_RULES.md`).
- Point to existing specs/READMEs rather than duplicating them.
- **Do NOT list child `CLAUDE.md` files from a parent `CLAUDE.md`.** The harness auto-loads nested `CLAUDE.md` files when their directories are accessed; enumerating them just creates an update burden.

**Keep it in sync.** Once a `CLAUDE.md` names a specific file, folder, fixture, type, or function, it is coupled to that name. When you rename, move, split, or delete those things, update the `CLAUDE.md` in the same commit — treat it as part of the change, not a follow-up. Any `CLAUDE.md` that lists files or folders must end with a one-line Maintenance footer reminding future editors of this coupling.

## Project Structure

The project uses **pnpm workspaces** to organize code into independently publishable packages:

```
vibefun/
├── examples/                    # Example vibefun programs
├── docs/                        # User facing and system documentation
│   ├── cli/                     # vibefun cli commands and options
│   ├── compiler-architecture/   # Architectural design docs for the vibefun compiler
│   ├── errors/                  # Reference for error codes produced by the compiler (auto-generated from source code)
│   └── spec/                    # Full vibefun language specification
├── packages/
│   ├── core/                    # @vibefun/core - Compiler library
│   │   └── src/                 # Lexer, parser, types, and utilities
│   ├── cli/                     # @vibefun/cli - Command-line interface
│   │   └── src/                 # CLI implementation using commander
│   └── stdlib/                  # @vibefun/std - Standard library
│       └── src/                 # Standard library implementation
├── tests/
│   └── spec-validation/         # Test suite validating the implementation of language features
├── tsconfig.base.json           # Shared TypeScript configuration
└── package.json                 # Workspace root configuration
```

### Workspace Packages

- **@vibefun/core**: The compiler core library containing the lexer, parser, type system, and code generator. Can be imported as a library by other projects.
- **@vibefun/cli**: The vibefun command-line tool for compiling `.vf` files. Depends on @vibefun/core.
- **@vibefun/std**: The vibefun standard library providing common functional programming utilities and operations.

## Technical Decisions

### Implementation Language
- **TypeScript**: All compiler code written in TypeScript with strict typing
- **No `any` types**: Maintain type safety throughout the codebase (strictly prohibited)
- **Functional style**: Prefer functional programming patterns (pure functions, immutability, composition)
- **Classes when practical**: Use classes for lexers, parsers, and stateful components when it improves clarity
- **Node 24.13**: Using modern Node.js features
- **`@types/node` version policy**: The `@types/node` major version must match the project's Node.js major version (currently 24). When upgrading the Node.js engine version, upgrade `@types/node` to match.
- **`pnpm.overrides` version policy**: When adding `pnpm.overrides` in `package.json`, always use pinned versions (e.g., `"4.0.4"`), never ranges (e.g., `">=4.0.4"`).
- **Comprehensive testing**: All code must have thorough test coverage

### Compilation Pipeline

See the [compiler architecture docs](./docs/compiler-architecture/) for compiler design details.

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

## Development Workflow

### Compiler Development Commands

```bash
# Build all packages
pnpm run build
pnpm run build:watch      # Watch mode (all packages)

# Build specific workspace
pnpm --filter @vibefun/core run build
pnpm --filter @vibefun/cli run build

# Quality checks (run after every change)
pnpm run check                   # Type checking (all workspaces)
pnpm run lint                    # Linting (all packages)
pnpm test                        # Run tests (all packages)
pnpm run format                  # Format code (all packages)

# All checks at once
pnpm run verify                  # Run all checks (read-only)

# Testing
pnpm test                        # Run all tests
pnpm run test:watch              # Watch mode
pnpm run test:coverage           # With coverage report

# Workspace-specific testing
pnpm --filter @vibefun/core test
pnpm --filter @vibefun/std test

# Regenerate error code docs (run after adding/changing/removing error codes)
pnpm docs:errors

# Spec validation - check the functionality of language features
pnpm spec:validate --verbose
```

### Running the Vibefun CLI

```bash
# After building (pnpm run build), run the CLI via the workspace script:
pnpm run vibefun compile src/main.vf -o dist/main.js
pnpm run vibefun compile src/main.vf --emit ast
pnpm run vibefun compile src/main.vf --verbose
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

## Important Notes

- Always maintain location information for good error messages
- Type inference should minimize need for annotations
- JavaScript interop must be explicit and type-safe
- Generated code should be readable for debugging
- Developer experience is a first-class concern

## Documentation Resources

### Language Documentation
- **[Language Specification](./docs/spec/)** - Complete language specification organized by topic (syntax, types, semantics, standard library)
  - **[Type System](./docs/spec/03-type-system/)** - Type system specification including inference, generics, and type checking algorithms

### Additional Instructions
- Documentation Rules @.claude/DOCUMENTATION_RULES.md
- Coding Standards @.claude/CODING_STANDARDS.md
- Ignore files in the ./claude/archive folder.  These are old plan documents that may be outdated and incorrect.
