# Vibefun Specification Documentation Layout

This document describes the organization and structure of the Vibefun language specification documentation.

## Overview

The specification has been organized into **~35 focused files** grouped by topic to improve navigation, maintainability, and comprehension. The original monolithic `vibefun-spec.md` (5,958 lines) has been restructured into a hierarchical documentation system.

## Organization Principles

### 1. Logical Grouping
Related content is grouped into folders with a `README.md` serving as a section index:
- Large sections (>400 lines with multiple subtopics) → folders with multiple files
- Medium sections (~200-400 lines, cohesive) → single files
- Small sections (<200 lines) → combined or single files

### 2. Numbered Prefixes
Top-level sections use numbered prefixes (01-, 02-, etc.) to establish a logical reading order that mirrors the learning path:
1. Introduction → Language basics
2. Lexical Structure → How code is tokenized
3. Type System → Core type theory
4. Expressions → Building blocks
5. Pattern Matching → Data deconstruction
6-9. Language features (Functions, Refs, Modules, Errors)
10. JavaScript Interop → Practical integration
11. Standard Library → Available tools
12. Compilation → Implementation details
13. Appendix → Reference material

### 3. Child Folders for Complex Topics
Sections with many subsections are organized into folders:
- `02-lexical-structure/` - 3 files covering tokens, operators, and rules
- `03-type-system/` - 8 files for different type system aspects
- `04-expressions/` - 4 files for expression categories
- `05-pattern-matching/` - 4 files for pattern types and features
- `10-javascript-interop/` - 4 files for interop mechanisms
- `11-stdlib/` - 9 files, one per module or module group
- `12-compilation/` - 3 files for compilation phases

## Directory Structure

```
docs/spec/
├── README.md                              # Main index and table of contents
├── CLAUDE.md                              # This file - layout documentation
│
├── 01-introduction.md                     # Language intro & philosophy (52 lines)
│
├── 02-lexical-structure/                  # Tokenization (443 lines → 3 files)
│   ├── README.md                          # Section overview
│   ├── basic-structure.md                 # Files, comments, whitespace, ASI
│   ├── tokens.md                          # Keywords, identifiers, literals
│   └── operators.md                       # Operators, punctuation, edge cases
│
├── 03-type-system/                        # Type theory (1,002 lines → 8 files)
│   ├── README.md                          # Type system overview
│   ├── primitive-types.md                 # Int, Float, String, Bool, Unit, Ref, Function
│   ├── type-inference.md                  # Variables, polymorphism, inference, value restriction
│   ├── record-types.md                    # Structural records with width subtyping
│   ├── variant-types.md                   # Sum types and tagged unions
│   ├── generic-types.md                   # Parametric polymorphism
│   ├── union-types.md                     # Union type features
│   ├── recursive-types.md                 # Recursive and mutually recursive types
│   └── type-aliases.md                    # Type aliases and annotations
│
├── 04-expressions/                        # Core expressions (969 lines → 4 files)
│   ├── README.md                          # Expressions overview
│   ├── basic-expressions.md               # Literals, variables, calls, operators
│   ├── control-flow.md                    # If and match expressions
│   ├── data-literals.md                   # Records and lists
│   └── functions-composition.md           # Lambdas, blocks, pipes
│
├── 05-pattern-matching/                   # Pattern matching (998 lines → 4 files)
│   ├── README.md                          # Pattern matching overview
│   ├── pattern-basics.md                  # Match, literal, variable, wildcard
│   ├── data-patterns.md                   # Variant, list, record patterns
│   ├── advanced-patterns.md               # Nested, guards, or-patterns, as-patterns
│   └── exhaustiveness.md                  # Type checking and exhaustiveness
│
├── 06-functions.md                        # Functions (232 lines)
├── 07-mutable-references.md               # Ref<T> (350 lines)
├── 08-modules.md                          # Module system (237 lines)
├── 09-error-handling.md                   # Error handling (230 lines)
│
├── 10-javascript-interop/                 # JS interop (619 lines → 4 files)
│   ├── README.md                          # Interop overview
│   ├── external-declarations.md           # Declaring JS functions
│   ├── unsafe-blocks.md                   # Controlled side effects
│   ├── type-safety.md                     # FFI boundary safety
│   └── calling-conventions.md             # JS calling Vibefun
│
├── 11-stdlib/                             # Standard library (328 lines → 9 files)
│   ├── README.md                          # Stdlib overview
│   ├── list.md                            # List module
│   ├── option.md                          # Option module
│   ├── result.md                          # Result module
│   ├── string.md                          # String module
│   ├── numeric.md                         # Int and Float modules
│   ├── array.md                           # Array module
│   ├── collections.md                     # Map and Set modules
│   ├── math.md                            # Math module
│   └── json.md                            # JSON module
│
├── 12-compilation/                        # Compilation (344 lines → 3 files)
│   ├── README.md                          # Compilation overview
│   ├── desugaring.md                      # Surface to core transformations
│   ├── codegen.md                         # JavaScript output and source maps
│   └── runtime.md                         # Runtime type checking
│
└── 13-appendix.md                         # Reference material (130 lines)
```

## File Naming Conventions

- **Folders**: Descriptive kebab-case names (e.g., `javascript-interop`, `type-system`)
- **Files**: Descriptive kebab-case names (e.g., `basic-expressions.md`, `type-inference.md`)
- **READMEs**: Each folder contains a `README.md` with section overview and links to child documents

## Content Organization Within Folders

Each folder follows a consistent structure:

1. **README.md** (required)
   - Section title and brief description
   - Table of contents linking to all child documents
   - Overview of key concepts covered

2. **Child documents** (2-9 files)
   - Focused on specific subtopics
   - Typically 50-500 lines each
   - Self-contained but may reference other docs

## Navigation

### Entry Points
- **[README.md](./README.md)**: Start here for complete table of contents
- **Folder READMEs**: Overview and index for each major section
- **Root CLAUDE.md**: Links to `./docs/spec/` in project instructions

### Cross-References
Documentation uses relative links:
```markdown
See [Type Inference](../03-type-system/type-inference.md) for details.
See the [Pattern Matching](../05-pattern-matching/) section.
```

## Benefits of This Structure

1. **Improved Navigation**: Find specific topics quickly without scrolling through thousands of lines
2. **Better Comprehension**: Focused documents are easier to read and understand
3. **Maintainability**: Update specific sections without affecting others
4. **Modularity**: Each file can be read independently
5. **Discoverability**: READMEs provide clear entry points and overview
6. **Version Control**: Smaller files produce cleaner diffs

## Updating the Specification

When updating the spec:

1. **Small changes**: Edit the relevant file directly
2. **New subsection**: Add to appropriate folder or create new file
3. **Reorganization**: Update folder README and cross-references
4. **New major section**: Add numbered folder with README and child docs
5. **Always update**: Main README.md table of contents if structure changes

## Relationship to Project Documentation

This specification documentation (`docs/spec/`) is referenced from:
- **Root `CLAUDE.md`**: Links to spec as authoritative language reference
- **Root `vibefun-spec.md`**: DELETED (replaced by this structure)

The specification is distinct from:
- **Implementation documentation**: In source code comments and tests
- **Project planning**: In `.claude/` folder
- **User-facing docs**: Future `docs/guide/` or similar

## Design Decisions

### Why numbered prefixes?
Establishes a clear reading order for newcomers learning the language progressively.

### Why separate folders vs single files?
Folders used when:
- Section exceeds ~400 lines
- Contains 3+ distinct subtopics
- Subtopics can be read independently

### Why group some modules (numeric, collections)?
Related modules that are conceptually similar and relatively short (e.g., Int + Float, Map + Set) are combined to reduce file proliferation while maintaining clarity.

### Why keep some sections as single files (Functions, Modules)?
These sections (200-400 lines) are cohesive single topics that don't benefit from further subdivision. Breaking them apart would fragment the reading experience.

## Future Considerations

Potential additions as the language evolves:
- `14-effects/` - If effect system is added
- `15-traits/` - If trait/type class system is added
- `16-async/` - If async/await is formalized
- `examples/` - Extended examples and patterns
- `migration/` - Version migration guides
