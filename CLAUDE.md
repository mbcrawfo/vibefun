# Vibefun Project Memory

## Project Overview

**Vibefun** is a pragmatic functional programming language that transpiles to JavaScript. It combines ML-style functional programming with modern type system features, targeting the JavaScript runtime for practical real-world applications.

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

## Core Design Decisions

### Language Paradigm
- **Pragmatic functional**: Like OCaml/F# - strong functional defaults with escape hatches
- **Immutability by default**: `let` bindings are immutable, `let mut` for mutable references
- **First-class functions**: Currying, partial application, higher-order functions
- **Algebraic data types**: Sum types (variants) and product types (records)
- **Pattern matching**: Exhaustive matching with compiler checks

### Type System
- **ML-style with inference**: Hindley-Milner algorithm for type inference
- **Extended with**:
  - Generics (parametric polymorphism)
  - Union types for flexible composition
  - No type classes in v1 (future consideration)
- **Type annotations**: Optional but required for FFI boundaries
- **Runtime type checking**: At FFI boundaries and optionally in development mode

### JavaScript Interop
- **Explicit boundaries**: FFI with `external` keyword and `unsafe` blocks
- **Clear separation**: Vibefun code is safe, JS interop is explicitly marked unsafe
- **Type safety**: JS values must be typed at boundaries

### Priority Features
1. **Functions & composition**: Pipe operators (`|>`), function composition (`>>`, `<<`)
2. **Algebraic types**: Variants and records with pattern matching
3. **Type inference**: Minimal annotations needed
4. **Good error messages**: Developer experience is paramount

## Project Structure

```
vibefun/
├── .claude/
│   ├── plans/
│   │   ├── language-design.md        # Comprehensive language specification
│   │   ├── type-system.md            # Detailed type system design
│   │   ├── compiler-architecture.md  # Compiler pipeline design
│   │   └── lexer-implementation.md   # Detailed lexer implementation plan
│   ├── CODING_STANDARDS.md           # Project coding standards and conventions
│   ├── LEXER_PROGRESS.md             # Current lexer implementation progress
│   └── settings.local.json           # Claude Code settings
├── src/
│   ├── types/
│   │   ├── token.ts                  # Token type definitions
│   │   ├── token.test.ts             # Token tests
│   │   ├── ast.ts                    # AST type definitions
│   │   └── index.ts                  # Type exports
│   ├── utils/
│   │   ├── error.ts                  # Error handling utilities
│   │   ├── error.test.ts             # Error utilities tests
│   │   └── index.ts                  # Utility exports
│   ├── lexer/                        # Tokenization (in progress)
│   ├── parser/                       # AST generation (planned)
│   ├── typechecker/                  # Type inference & checking (planned)
│   ├── compiler/                     # Transpilation to JS (planned)
│   ├── runtime/                      # Runtime library (planned)
│   ├── stdlib/                       # Standard library (planned)
│   └── cli/                          # Command-line interface (planned)
├── examples/                          # Example programs (planned)
├── package.json                      # Project dependencies and scripts
├── package-lock.json                 # Locked dependency versions
├── tsconfig.json                     # TypeScript configuration
├── vitest.config.ts                  # Vitest test configuration
├── eslint.config.mjs                 # ESLint configuration
├── .prettierrc.json                  # Prettier configuration
├── .editorconfig                     # Editor configuration
└── .gitignore                        # Git ignore patterns
```

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

### Dependencies (Planned)

Development:
- TypeScript compiler
- Vitest for testing
- Prettier (already configured)
- ESLint for linting

Runtime:
- Minimal runtime library (custom implementation)
- No external runtime dependencies for compiled output

## File Extensions and Conventions

- **Source files**: `.vf`
- **Module system**: Each file is a module
- **Import/export**: ES6-style syntax
- **Naming conventions**:
  - Types: PascalCase (`Option`, `Result`, `Person`)
  - Functions: camelCase (`map`, `filter`, `getUserId`)
  - Constructors: PascalCase (`Some`, `None`, `Ok`, `Err`)
  - Constants: camelCase

## Key Language Features

### Syntax Examples

**Basic function:**
```vibefun
let add = (x, y) => x + y
```

**Type definition:**
```vibefun
type Option<T> = Some(T) | None
```

**Pattern matching:**
```vibefun
let unwrap = (opt) => match opt {
    | Some(x) => x
    | None => panic("unwrap on None")
}
```

**Records:**
```vibefun
type Person = { name: String, age: Int }
let person = { name: "Alice", age: 30 }
let older = { ...person, age: 31 }
```

**Pipe operator:**
```vibefun
let result = data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> sum
```

**FFI (JavaScript interop):**
```vibefun
external console_log: (String) -> Unit = "console.log"

let debug = (msg) => unsafe {
    console_log(msg)
}
```

## Standard Library Design

### Core Modules

1. **List**: map, filter, fold, length, head, tail, etc.
2. **Option**: map, flatMap, getOrElse, isSome, isNone
3. **Result**: map, mapErr, flatMap, isOk, isErr
4. **String**: length, concat (++), toUpperCase, toLowerCase, split, etc.
5. **Int/Float**: Basic arithmetic, conversions

### Design Principles
- **Functional**: Immutable data structures
- **Curried**: Functions take one argument at a time
- **Composable**: Easy to chain and compose

## Development Workflow

### Compiler Development Commands

```bash
# Build the compiler
npm run build
npm run build:watch      # Watch mode

# Quality checks (run after every change)
npm run check            # Type checking
npm run lint             # Linting (use lint:fix to auto-fix)
npm test                 # Run tests
npm run format           # Format code

# All checks at once
npm run verify           # Run all checks + format
npm run verify:ci        # CI version (doesn't modify files)

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
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

## Resources

### Design Documentation
- **Language specification**: `.claude/plans/language-design.md`
- **Type system details**: `.claude/plans/type-system.md`
- **Compiler architecture**: `.claude/plans/compiler-architecture.md`
- **Lexer implementation plan**: `.claude/plans/lexer-implementation.md`

### Development Resources
- **Coding standards**: `.claude/CODING_STANDARDS.md`
- **Current progress**: `.claude/LEXER_PROGRESS.md` (tracks current implementation status)
