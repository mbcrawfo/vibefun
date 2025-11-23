# Vibefun Compiler Architecture

This directory contains the architectural documentation for the Vibefun compiler. These documents describe the high-level design, patterns, and organization of the compiler—not implementation details.

## Purpose

The compiler architecture documentation serves as:

- **A conceptual map** of how the compiler is organized
- **A reference** for understanding design decisions and patterns
- **A guide** for extending and modifying the compiler
- **A foundation** for onboarding new contributors

## Audience

This documentation is intended for:

- Developers working on the Vibefun compiler
- Contributors adding new language features
- AI agents assisting with compiler development
- Anyone seeking to understand the compiler's design

## How to Use This Documentation

### For Understanding the Compiler

Start with the overview and work through the documents in order:

1. Read **01-overview.md** for the big picture
2. Read **02-compilation-pipeline.md** to understand how data flows
3. Read **03-design-patterns.md** to learn key architectural patterns
4. Reference other documents as needed for specific topics

### For Extending the Compiler

Focus on:

- **06-extensibility.md** - How to add new features
- **03-design-patterns.md** - Patterns to follow
- **07-implementation-guide.md** - Coding standards and practices

### For Deep Implementation Details

This architecture documentation references but does not replace:

- **Language Specification** (`docs/spec/`) - What the language does
- **Design Documents** (`.claude/design/`) - Detailed algorithms and specifications
- **Coding Standards** (`.claude/CODING_STANDARDS.md`) - Implementation patterns
- **Source Code** (`packages/core/src/`) - Actual implementation

## Table of Contents

### [01. Architecture Overview](./01-overview.md)
High-level view of the compiler architecture, design philosophy, and core principles.

**Topics:**
- System purpose and goals
- Key design principles
- Architecture at a glance
- Quality attributes
- Constraints and trade-offs

### [02. Compilation Pipeline](./02-compilation-pipeline.md)
Detailed description of each compilation phase and how they connect.

**Topics:**
- Pipeline overview
- Lexer architecture
- Parser architecture
- Desugarer architecture
- Type checker architecture
- Optimizer architecture
- Code generator architecture
- Data flow between phases

### [03. Design Patterns](./03-design-patterns.md)
Core architectural patterns used throughout the compiler.

**Topics:**
- Two-AST strategy (Surface vs Core)
- Modular transformation architecture
- Pluggable pass system
- Location tracking pattern
- Error handling strategy
- Stateful vs functional components
- Module organization pattern

### [04. Data Structures](./04-data-structures.md)
Key data structures that flow through the compilation pipeline.

**Topics:**
- Surface AST hierarchy
- Core AST hierarchy
- Token representation
- Type representation
- Location and source position
- Error structures
- Optimization metrics

### [05. Cross-Cutting Concerns](./05-cross-cutting.md)
Patterns and utilities that span multiple phases.

**Topics:**
- Error handling across phases
- Location tracking throughout pipeline
- AST utilities (analysis, transformation, equality)
- Fresh variable generation
- Substitution and rewriting
- Immutability and cloning

### [06. Extensibility](./06-extensibility.md)
How to extend the compiler with new features.

**Topics:**
- Adding optimization passes
- Extending the desugarer
- Adding new AST node types
- Creating custom error types
- Testing new transformations
- Integration points

### [07. Implementation Guide](./07-implementation-guide.md)
Practical guidance for implementing compiler features.

**Topics:**
- When to use classes vs functions
- Module organization patterns
- TypeScript patterns and conventions
- Testing strategies by phase
- Helper function composition
- Performance considerations

## Related Documentation

### Language Specification
- **Location:** `docs/spec/`
- **Purpose:** Defines what the language does (semantics, syntax, type system)
- **Start here:** `docs/spec/.agent-map.md` for quick navigation

### Design Documents
- **Compiler Implementation Guide:** `.claude/design/compiler-implementation-guide.md`
  - Detailed algorithms (Algorithm W, pattern exhaustiveness)
  - Compilation strategies for JavaScript target
  - Technical specifications
- **Parser Architecture:** `.claude/design/parser-architecture.md`
  - Disambiguation strategies
  - Precedence and associativity
  - Parser-specific design decisions

### Project Documentation
- **CLAUDE.md** - Project overview, structure, and development workflow
- **CODING_STANDARDS.md** - TypeScript conventions and quality standards
- **VIBEFUN_AI_CODING_GUIDE.md** - Writing Vibefun code (for AI agents)

## Navigation Tips

### Quick Lookups

- **"How does X work?"** → See [02-compilation-pipeline.md](./02-compilation-pipeline.md)
- **"Why did we choose Y?"** → See [03-design-patterns.md](./03-design-patterns.md)
- **"What is structure Z?"** → See [04-data-structures.md](./04-data-structures.md)
- **"How do I add feature W?"** → See [06-extensibility.md](./06-extensibility.md)
- **"What pattern should I use?"** → See [07-implementation-guide.md](./07-implementation-guide.md)

### Cross-References

Documents reference each other with relative links. Follow links to dive deeper into specific topics.

### Finding Implementation

Each architecture document references the corresponding implementation files in `packages/core/src/`. Use these references to connect concepts to code.

## Document Maintenance

### When to Update

Update this documentation when:

- **Architectural patterns change** (new patterns, deprecated patterns)
- **Major phases are added/removed** (new compilation phases)
- **Design decisions evolve** (different approaches chosen)
- **Extension points change** (new ways to extend the compiler)

### What NOT to Include

Do not include in architecture docs:

- Implementation details (put in code comments or design docs)
- Status/progress tracking (put in `.claude/active/` or progress docs)
- API documentation (put in JSDoc comments)
- Detailed algorithms (put in design docs like compiler-implementation-guide.md)

### Keeping Docs Synchronized

When making architectural changes:

1. Update the relevant architecture document
2. Update related design documents if needed
3. Update code comments for implementation details
4. Consider updating examples if patterns change

## Getting Started

**New to the compiler?** Start here:

1. Read [01-overview.md](./01-overview.md) - Understand the big picture
2. Read [02-compilation-pipeline.md](./02-compilation-pipeline.md) - See how data flows
3. Browse the codebase in `packages/core/src/` - Connect concepts to code
4. Read [07-implementation-guide.md](./07-implementation-guide.md) - Learn implementation patterns

**Adding a feature?** Start here:

1. Read [06-extensibility.md](./06-extensibility.md) - Find the right extension point
2. Read [03-design-patterns.md](./03-design-patterns.md) - Follow established patterns
3. Read [07-implementation-guide.md](./07-implementation-guide.md) - Use correct coding patterns
4. Reference `.claude/CODING_STANDARDS.md` - Follow project standards

**Understanding a specific phase?** Start here:

1. Read the relevant section in [02-compilation-pipeline.md](./02-compilation-pipeline.md)
2. Read the corresponding design doc (if it exists)
3. Look at the implementation in `packages/core/src/`
4. Look at tests in `packages/core/src/*/**.test.ts`

---

**Last Updated:** 2025-11-23
