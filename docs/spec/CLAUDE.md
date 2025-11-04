# Vibefun Specification Documentation Guide

This document explains how to navigate and maintain the Vibefun language specification.

## Quick Start: Finding Information

**Start with [.agent-map.md](./.agent-map.md)**

The agent map is optimized for fast, query-oriented navigation to find relevant spec files without reading everything. It includes:
- Quick lookup table (topic → file)
- Query-based index ("How do I...?", "What is...?", "Can I...?")
- File relationship maps (which files to read together)
- Special topics index (edge cases, gotchas, common misconceptions)

**For Sequential Learning**: Start with **[README.md](./README.md)** for the full table of contents and read sections in order.

## Agent Map Design Philosophy

The `.agent-map.md` file is designed specifically for AI agent efficiency:

### 1. Query-Oriented Organization
Instead of organizing by file structure, the map organizes by **question patterns**:
- "How do I define a function?" → Direct file references
- "What is the value restriction?" → Type inference file
- "Can I use loops?" → Control flow + future features

This matches how agents naturally search for information.

### 2. Context Efficiency
The map provides maximum directional value with minimal tokens:
- **Fast scanning**: Agents find relevant files in seconds
- **No redundancy**: Points to information rather than duplicating it
- **Concise descriptions**: Just enough context to route queries

### 3. Relationship Awareness
The map shows which files work together for complex topics:
- Type system + pattern matching + exhaustiveness checking
- Functions + expressions + evaluation order
- Mutability + type inference (value restriction)

This helps agents understand when to read multiple files for complete context.

### 4. Specialization by Use Case
Different sections serve different agent needs:
- **Quick Lookup**: Fast topic-to-file mapping
- **Query Index**: Natural language question routing
- **Relationship Map**: Multi-file reading guidance
- **Special Topics**: Edge cases and gotchas

## Specification Structure Overview

The specification is organized into **~51 markdown files** grouped into **13 numbered sections**:

1. **01-introduction.md** - Language philosophy and goals
2. **02-lexical-structure/** - Tokens, operators, syntax rules (3 files)
3. **03-type-system/** - Hindley-Milner + extensions (9 files)
4. **04-expressions/** - Evaluation, control flow, literals (5 files)
5. **05-pattern-matching/** - Match semantics, exhaustiveness (4 files)
6. **06-functions.md** - First-class, curried, recursive functions
7. **07-mutable-references.md** - Ref<T> and value restriction
8. **08-modules.md** - File-based modules, imports/exports
9. **09-error-handling.md** - Result/Option philosophy
10. **10-javascript-interop/** - FFI, unsafe blocks, type safety (4 files)
11. **11-stdlib/** - Standard library modules (9 files)
12. **12-compilation/** - Pipeline, desugaring, codegen (3 files)
13. **13-appendix.md** - Syntax reference, future features (2 files)

**Key principle**: Folders contain related files with a `README.md` index; standalone files are cohesive single topics.

## Maintaining the Agent Map

**CRITICAL**: The `.agent-map.md` file must stay synchronized with the specification content.

### When to Update the Map

Update `.agent-map.md` whenever you:

1. **Add new spec files**
   - Add entry to Quick Lookup Table
   - Add to Query-Based Index if it answers common questions
   - Update File Relationship Map if it relates to other files
   - Add to Special Topics if it covers edge cases

2. **Remove or rename spec files**
   - Remove/update all references in Quick Lookup Table
   - Update Query-Based Index entries
   - Update File Relationship Map
   - Update cross-references in other sections

3. **Restructure folders**
   - Update all file paths in Quick Lookup Table
   - Verify Query-Based Index paths are correct
   - Update Structural Overview

4. **Add new language features**
   - Add to Quick Lookup Table
   - Add relevant queries to Query-Based Index
   - Update "Can I...?" section if feature was previously unavailable
   - Remove from future-features.md and update references

5. **Change major semantics**
   - Update Special Topics Index if edge cases change
   - Update Common Misconceptions if behavior changes
   - Verify Query-Based Index answers are still accurate

6. **Discover common agent queries**
   - Add new patterns to Query-Based Index
   - Add synonyms to Quick Lookup Table
   - Update relationship guidance if agents frequently need multiple files

### Validation Checklist

Before committing changes to the spec, verify:

- [ ] All spec files are represented in Quick Lookup Table
- [ ] File paths are accurate (test links if possible)
- [ ] Query-Based Index covers common question patterns
- [ ] File Relationship Map reflects current cross-references
- [ ] Special Topics Index includes known edge cases
- [ ] Structural Overview matches actual folder structure
- [ ] No dead links to removed/renamed files
- [ ] New features removed from future-features.md

### Maintenance Workflow

When making spec changes:

```bash
# 1. Make your spec changes (add/edit/remove .md files)
# 2. Update .agent-map.md accordingly
# 3. Verify links work by checking file paths
# 4. Test by asking a common question and seeing if map routes correctly
# 5. Commit spec changes and map updates together
```

## File Organization Principles

### Numbered Prefixes
Top-level sections use numbered prefixes (01-, 02-, etc.) to establish a logical reading order for sequential learning.

### Folder vs File Decision
- **Folder**: Use when section has 3+ distinct subtopics or exceeds ~400 lines
- **Single file**: Use for cohesive topics under ~400 lines
- **Combined files**: Related modules (Int+Float, Map+Set) are grouped to reduce file proliferation

### Child Folder Structure
Each folder contains:
1. `README.md` - Section overview and links to child documents
2. Child documents (2-9 files) - Focused subtopics (50-500 lines each)

### Cross-References
Use relative links between documents:
```markdown
See [Type Inference](../03-type-system/type-inference.md) for details.
See the [Pattern Matching](../05-pattern-matching/) section.
```

## Updating the Specification

### Small Changes
Edit the relevant file directly. Update `.agent-map.md` if the change:
- Adds new queryable information
- Changes behavior that affects "Can I...?" queries
- Introduces new edge cases or gotchas

### New Subsections
1. Add to appropriate folder or create new file
2. Update folder's README.md if adding to existing folder
3. Add to `.agent-map.md` Quick Lookup Table
4. Add relevant queries to Query-Based Index
5. Update main `README.md` if needed

### Reorganization
1. Move/rename files as needed
2. Update all folder READMEs
3. Update cross-references in affected documents
4. **Update all references in `.agent-map.md`** (paths, relationships)
5. Update main `README.md` table of contents

### New Major Section
1. Add numbered folder (e.g., `14-new-section/`)
2. Create folder README.md with overview and links
3. Create child documents
4. Add complete section to `.agent-map.md`:
   - Quick Lookup entries for all new files
   - Query-Based Index for common questions
   - Relationship Map if connects to other sections
5. Update main `README.md` table of contents

## Benefits of This Documentation System

1. **Dual Navigation**: Sequential learning (README.md) + fast lookup (.agent-map.md)
2. **AI-Optimized**: Agent map designed for query-based information retrieval
3. **Maintainability**: Small focused files, clear cross-references
4. **Discoverability**: Multiple entry points and navigation strategies
5. **Context Efficiency**: Minimal tokens to find maximum information
6. **Version Control**: Smaller files produce cleaner diffs

## Relationship to Project Documentation

This specification (`docs/spec/`) is referenced from:
- **Root `CLAUDE.md`**: Links to spec and agent map
- **Root `vibefun-spec.md`**: DELETED (replaced by this structure)

The specification is distinct from:
- **Implementation documentation**: In source code and tests
- **Project planning**: In `.claude/` folder
- **User-facing docs**: Future `docs/guide/` or website

## Examples of Good Map Maintenance

### Example 1: Adding a New Type Feature

```markdown
# Spec change: Add docs/spec/03-type-system/row-polymorphism.md

# Agent map updates needed:
1. Quick Lookup Table:
   | Row polymorphism | `03-type-system/row-polymorphism.md` |

2. Query-Based Index ("What is...?"):
   | What is row polymorphism? | `03-type-system/row-polymorphism.md` |

3. File Relationship Map:
   Add to "Core Type System Journey" after generic-types.md

4. Special Topics Index (if applicable):
   Add any edge cases or gotchas
```

### Example 2: Removing a Planned Feature

```markdown
# Spec change: Remove trait system from 13-appendix/future-features.md
# (decided to implement immediately)

# Agent map updates needed:
1. Move from "Future Considerations" to Quick Lookup Table
2. Update "Can I...?" section (change "planned" to actual file reference)
3. Add to Query-Based Index
4. Add relationship guidance if traits interact with other systems
```

### Example 3: Discovering Common Query

```markdown
# Notice agents frequently ask: "How do I handle null values from JS?"

# Agent map updates:
1. Add to Query-Based Index ("How do I...?"):
   | Handle null values from JS? | `11-stdlib/option.md`, `10-javascript-interop/type-safety.md` |

2. Consider adding to Special Topics if it's a common gotcha
```

## Summary

**For Navigation**: Use `.agent-map.md` for fast, query-based lookup.

**For Maintenance**: Keep `.agent-map.md` synchronized with all spec changes.

**For Learning**: Use `README.md` for sequential, comprehensive reading.

The agent map is the **primary tool** for efficient specification navigation. Keep it current, accurate, and optimized for query-based information retrieval.
