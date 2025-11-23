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

### For Deep Implementation Details

This architecture documentation is complemented by:

- **Language Specification** (`docs/spec/`) - What the language does
- **Source Code** - The actual compiler implementation

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

## Related Documentation

### Language Specification
- **Location:** `docs/spec/`
- **Purpose:** Defines what the language does (semantics, syntax, type system)
- **Start here:** `docs/spec/.agent-map.md` for quick navigation

## Navigation Tips

### Quick Lookups

- **"How does X work?"** → See [02-compilation-pipeline.md](./02-compilation-pipeline.md)
- **"Why did we choose Y?"** → See [03-design-patterns.md](./03-design-patterns.md)
- **"What is structure Z?"** → See [04-data-structures.md](./04-data-structures.md)
- **"How do I add feature W?"** → See [06-extensibility.md](./06-extensibility.md)

### Cross-References

Documents reference each other with relative links. Follow links to dive deeper into specific topics.

## Document Maintenance

### When to Update

Update this documentation when:

- **Architectural patterns change** (new patterns, deprecated patterns)
- **Major phases are added/removed** (new compilation phases)
- **Design decisions evolve** (different approaches chosen)
- **Extension points change** (new ways to extend the compiler)

### What NOT to Include

Do not include in architecture docs:

- Implementation details (put in code comments)
- Status/progress tracking (use separate progress tracking documents)
- API documentation (put in JSDoc comments)
- Detailed algorithms (use separate design documents)

### Keeping Docs Synchronized

When making architectural changes:

1. Update the relevant architecture document
2. Update code comments for implementation details
3. Consider updating examples if patterns change

## Getting Started

**New to the compiler?** Start here:

1. Read [01-overview.md](./01-overview.md) - Understand the big picture
2. Read [02-compilation-pipeline.md](./02-compilation-pipeline.md) - See how data flows
3. Read [03-design-patterns.md](./03-design-patterns.md) - Learn key architectural patterns

**Adding a feature?** Start here:

1. Read [06-extensibility.md](./06-extensibility.md) - Find the right extension point
2. Read [03-design-patterns.md](./03-design-patterns.md) - Follow established patterns
3. Review the relevant sections in [02-compilation-pipeline.md](./02-compilation-pipeline.md)

**Understanding a specific phase?** Start here:

1. Read the relevant section in [02-compilation-pipeline.md](./02-compilation-pipeline.md)
2. Review related data structures in [04-data-structures.md](./04-data-structures.md)
3. Explore the compiler source code and tests

---

**Last Updated:** 2025-11-23
