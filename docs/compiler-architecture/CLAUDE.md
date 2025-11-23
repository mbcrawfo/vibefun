# Compiler Architecture Documentation Scope

This directory contains **high-level architecture documentation** for the Vibefun compiler. These documents describe design decisions, patterns, and structure—not implementation details.

## Purpose

The architecture documentation serves to:

- Explain **why** the compiler is structured the way it is
- Document key **design decisions** and their trade-offs
- Describe **architectural patterns** used throughout
- Provide a **conceptual map** of how components connect
- Guide **extensions** to the compiler

## What IS Included

✅ High-level architecture and design philosophy
✅ Compilation pipeline structure and data flow
✅ Architectural patterns (Two-AST strategy, pluggable passes, etc.)
✅ Data structure definitions and their purpose
✅ Cross-cutting concerns and utilities
✅ Extension points and how to use them

## What is NOT Included

❌ Implementation details (like "lexer is a stateful class")
❌ Specific file paths or code locations
❌ Code examples showing TypeScript implementation patterns
❌ Coding standards and conventions
❌ Detailed algorithms (like Algorithm W implementation details)
❌ Progress tracking or status indicators

## Where to Find Implementation Details

For implementation guidance, see:

- **Project root CLAUDE.md** - Project structure, development workflow, and technical decisions
- **Project root .claude/CODING_STANDARDS.md** - TypeScript coding patterns, naming conventions, and best practices
- **Source code** - The actual compiler implementation in packages/core/src
- **Tests** - Implementation examples and edge cases

## Where to Find Language Details

For language semantics and specification:

- **docs/spec/** - Complete language specification
- **docs/spec/.agent-map.md** - Quick navigation to spec topics

## Relationship to Other Documentation

```
vibefun/
├── CLAUDE.md                          # Project overview and workflow
├── .claude/CODING_STANDARDS.md        # Implementation patterns
├── docs/
│   ├── spec/                          # Language specification
│   └── compiler-architecture/         # THIS: Architecture docs
│       ├── CLAUDE.md                  # (You are here)
│       ├── README.md                  # Navigation guide
│       ├── 01-overview.md             # Architecture philosophy
│       ├── 02-compilation-pipeline.md # Phase descriptions
│       ├── 03-design-patterns.md      # Architectural patterns
│       ├── 04-data-structures.md      # Key data structures
│       ├── 05-cross-cutting.md        # Cross-phase utilities
│       └── 06-extensibility.md        # Extension guide
└── packages/core/src/                 # Implementation
```

## Documentation Principles

These architecture documents follow specific rules:

1. **Focus on "why" not "how"** - Explain design decisions, not implementation steps
2. **No file paths** - Don't reference specific source files (they may change)
3. **No implementation details** - Don't explain class structures, private methods, etc.
4. **No progress tracking** - Architecture is stable, status belongs elsewhere
5. **High-level only** - Stay at the conceptual level

## Getting Started

Start with [README.md](./README.md) for a complete navigation guide.

For quick lookups:
- **"How does X work?"** → See [02-compilation-pipeline.md](./02-compilation-pipeline.md)
- **"Why did we choose Y?"** → See [03-design-patterns.md](./03-design-patterns.md)
- **"How do I extend Z?"** → See [06-extensibility.md](./06-extensibility.md)

---

**Last Updated:** 2025-11-23
