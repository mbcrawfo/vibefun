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
│   ├── lexer/                        # Tokenization (COMPLETE)
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

## Implementation Progress

### Lexer (COMPLETED ✅)

The lexer is fully implemented and tested with 368 passing tests across all phases:

**Features Implemented:**
- ✅ All token types (keywords, identifiers, literals, operators, punctuation)
- ✅ Unicode identifier support
- ✅ Number literals: integers, floats, hex (0x), binary (0b), scientific notation
- ✅ String literals: single-line and multi-line (""") with full escape sequences
- ✅ Escape sequences: \n, \t, \r, \", \', \\, \xHH, \uXXXX, \u{XXXXXX}
- ✅ All operators: 13 multi-character (==, !=, <=, >=, ++, |>, >>, <<, ->, =>, :=, &&, ||, ...)
- ✅ Comments: single-line (//) and nested multi-line (/* */)
- ✅ Whitespace handling with preserved newlines
- ✅ Accurate location tracking (file, line, column, offset)
- ✅ Comprehensive error messages with helpful hints

**Test Coverage:**
- 368 total tests passing
- 33 core lexer tests
- 50 identifier tests (including Unicode)
- 53 number literal tests (all formats)
- 59 string literal tests (all escape types)
- 45 comment tests (including nested)
- 72 operator tests (single and multi-character)
- 31 integration tests (complete programs)
- Edge cases, error handling, and location tracking

**Files:**
- `src/lexer/lexer.ts` - Main lexer implementation (~850 lines)
- `src/lexer/lexer.test.ts` - Core lexer tests
- `src/lexer/identifiers.test.ts` - Identifier parsing tests
- `src/lexer/numbers.test.ts` - Number literal tests
- `src/lexer/strings.test.ts` - String literal tests
- `src/lexer/comments.test.ts` - Comment handling tests
- `src/lexer/operators.test.ts` - Operator parsing tests
- `src/lexer/lexer-integration.test.ts` - Integration tests

See `.claude/LEXER_PROGRESS.md` for detailed implementation notes.

### Next Steps

1. **Parser**: Implement recursive descent parser to build AST from tokens
2. **Type Checker**: Implement Hindley-Milner type inference (Algorithm W)
3. **Code Generator**: Transpile AST to readable JavaScript
4. **Runtime**: Implement minimal runtime library
5. **Standard Library**: Implement core functions and data structures

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

### Development Resources
- **[.claude/CODING_STANDARDS.md](./.claude/CODING_STANDARDS.md)** - Project coding standards and conventions
- **[.claude/LEXER_PROGRESS.md](./.claude/LEXER_PROGRESS.md)** - Current lexer implementation progress tracker
