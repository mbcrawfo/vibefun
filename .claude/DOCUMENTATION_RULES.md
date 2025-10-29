# Documentation Rules for CLAUDE.md

This document defines the rules for maintaining the root `CLAUDE.md` file.

## Rule 1: Project Structure - Folders Only

**Rule:** Only document folders in the project structure section. Do not document individual files.

**Rationale:** Individual file listings quickly become outdated and create noise. Folders provide sufficient structure overview.

**Example:**

✅ **Good:**
```
vibefun/
├── .claude/          # Project plans and documentation
├── src/
│   ├── lexer/        # Tokenization
│   ├── parser/       # AST generation
│   └── types/        # Type definitions
```

❌ **Bad:**
```
vibefun/
├── .claude/
│   ├── DOCUMENTATION_RULES.md
│   ├── CODING_STANDARDS.md
│   └── plans/
│       ├── lexer-implementation.md
│       └── parser-implementation.md
├── src/
│   ├── lexer/
│   │   ├── lexer.ts
│   │   ├── lexer.test.ts
│   │   └── identifiers.test.ts
```

## Rule 2: No Implementation Status in CLAUDE.md

**Rule:** Do not document implementation status, test coverage, or detailed progress in `CLAUDE.md`.

**Rationale:** Status information is transient and should live in dedicated progress tracking documents. CLAUDE.md should contain stable, high-level information.

**What to Avoid:**
- Status indicators like "(COMPLETE ✅)", "(in progress)", "(planned)"
- Test counts like "368 passing tests"
- Implementation details like "850 lines of code"
- Feature checklists with ✅ marks
- Detailed coverage breakdowns

**Where Status Belongs:**
- Progress tracking documents in `.claude/` (e.g., `LEXER_PROGRESS.md`)
- Commit messages
- Pull request descriptions

## Rule 3: Feature Plans - Document Before Implementation

**Rule:** When creating a feature plan, always:
1. Document the plan in the `.claude/` folder
2. Create a progress tracking document (e.g., `FEATURE_PROGRESS.md`)
3. Commit the plan BEFORE starting implementation

**Rationale:** Having a committed plan provides:
- Clear scope and approach before coding
- A reference point for future context
- Historical record of planning decisions
- Ability to review and discuss before implementation

**Process:**
1. Create `.claude/plans/feature-implementation.md` with detailed approach
2. Create `.claude/FEATURE_PROGRESS.md` to track implementation phases
3. Commit both documents
4. Begin implementation

**Example Plan Structure:**
```markdown
# Feature Implementation Plan

## Overview
Brief description of what we're building

## Phases
1. Phase 1: Setup
2. Phase 2: Core functionality
3. Phase 3: Integration
4. Phase 4: Documentation

## Design Decisions
Key technical choices
```

**Example Progress Structure:**
```markdown
# Feature Implementation Progress

## Phase 1: Setup
**Status:** ✅ Done / ⏳ In Progress / 🔜 Not Started
- [x] Task 1
- [ ] Task 2

## Overall Progress
Phases Completed: 1/4 (25%)
```

## Rule 4: Update Progress Documents After Work

**Rule:** When working through a plan with a progress document, always update the document after completing tasks or phases.

**Rationale:** Progress tracking is only valuable if it's kept current. This provides:
- Accurate status for context recovery
- Clear record of what's been done
- Easy identification of next steps

**When to Update:**
- After completing each phase
- After making significant progress on a task
- When encountering blockers or changing approach
- At the end of each work session

**What to Update:**
- Task completion checkboxes
- Status indicators (Done ✅ / In Progress ⏳ / Not Started 🔜)
- Time estimates vs actuals
- Notes about implementation decisions
- Overall progress percentage

## Rule 5: No Progress Document References in CLAUDE.md

**Rule:** Do not reference progress tracking documents in `CLAUDE.md`.

**Rationale:** Progress documents are working documents that change frequently. CLAUDE.md should be stable and not couple to transient tracking documents.

**What to Avoid:**
```markdown
❌ See `.claude/LEXER_PROGRESS.md` for detailed implementation notes.
❌ Implementation status tracked in FEATURE_PROGRESS.md
❌ For current progress, see .claude/PARSER_PROGRESS.md
```

**Instead:**
- Progress documents are discovered via `.claude/` directory listing
- Reference only stable planning documents if needed
- Keep CLAUDE.md focused on architecture and design

**Acceptable References:**
```markdown
✅ See `.claude/plans/` for feature implementation plans
✅ See [vibefun-spec.md](./vibefun-spec.md) for language specification
✅ See `.claude/CODING_STANDARDS.md` for code conventions
```

## Summary Checklist

When updating CLAUDE.md, ensure:
- [ ] Project structure shows folders only, no individual files
- [ ] No status indicators (✅, ⏳, planned, etc.) on folder descriptions
- [ ] No implementation statistics (test counts, line counts, etc.)
- [ ] No detailed feature lists or progress checklists
- [ ] No references to progress tracking documents
- [ ] Focus on stable, architectural information
- [ ] References only to stable documentation (specs, standards, plans)

## When These Rules Apply

These rules apply specifically to `CLAUDE.md` in the project root. Other documentation:
- `.claude/plans/` - Can be as detailed as needed
- `.claude/*_PROGRESS.md` - Should track status in detail
- Test files - Should document what they test
- Code comments - Should explain implementation
- README.md - Can include getting started and usage info

Keep CLAUDE.md stable, high-level, and focused on design and architecture.
