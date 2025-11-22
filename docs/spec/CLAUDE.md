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

## Maintaining the AI Coding Guide

**CRITICAL**: The `.claude/VIBEFUN_AI_CODING_GUIDE.md` file must stay synchronized with the specification.

The AI Coding Guide is a practical reference designed for AI agents writing vibefun code. It extracts day-to-day coding knowledge from the spec, focusing on:
- Common syntax patterns and idioms
- Frequent gotchas and edge cases
- Quick reference for syntax
- JavaScript interop essentials
- Standard library overview

### When to Update the AI Coding Guide

Update `.claude/VIBEFUN_AI_CODING_GUIDE.md` whenever you:

1. **Change language syntax**
   - Update relevant sections in the guide (Core Syntax Fundamentals, Common Syntax Patterns)
   - Add new patterns or update existing examples
   - Update the Quick Reference Checklist if needed

2. **Change type system behavior**
   - Update Type System Essentials section
   - Update Common Gotchas if edge cases change
   - Update examples throughout the guide that demonstrate type inference

3. **Add or change standard library functions**
   - Update Standard Library Overview section
   - Update Common Daily Patterns if new patterns emerge
   - Add examples demonstrating new functionality

4. **Change JavaScript interop semantics**
   - Update JavaScript Interop section
   - Update unsafe block examples
   - Update external declaration patterns

5. **Discover new common mistakes**
   - Add to Common Gotchas & Edge Cases section
   - Update Quick Reference Checklist
   - Add warning examples with ❌/✅ patterns

6. **Change comparison to other languages**
   - Update Key Differences section
   - Ensure comparisons remain accurate

### AI Coding Guide Update Checklist

When making spec changes that affect practical coding:

- [ ] Review impact on syntax patterns (update examples)
- [ ] Check if new edge cases or gotchas emerge (add to guide)
- [ ] Verify all code examples still compile under new semantics
- [ ] Update Quick Reference Checklist if fundamental rules change
- [ ] Ensure guide remains focused on practical, daily usage (not comprehensive spec details)
- [ ] Test examples against actual compiler behavior if available

### Maintenance Workflow

```bash
# 1. Make spec changes
# 2. Identify practical impact on day-to-day coding
# 3. Update relevant sections in .claude/VIBEFUN_AI_CODING_GUIDE.md
# 4. Verify examples are accurate and consistent with spec
# 5. Commit spec and guide updates together
```

### What NOT to Add to the AI Coding Guide

The guide should remain focused and practical. Do NOT add:
- Comprehensive coverage of all language features (that's the spec's job)
- Implementation details of the compiler
- Theoretical type system discussions
- Rare edge cases that don't affect daily coding
- Future features that aren't implemented

The guide should answer: "What does an AI agent need to know to write vibefun code correctly **right now**?"

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
