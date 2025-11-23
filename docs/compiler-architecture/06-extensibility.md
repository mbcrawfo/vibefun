# Extensibility

This document describes the architectural extension points in the Vibefun compiler and the design patterns that enable extensibility.

## Overview

The compiler architecture provides several extension points through deliberate design choices:

- **Pluggable Optimization Passes** - New optimizations can be added without modifying the optimizer core
- **Modular Desugaring Transformations** - New surface syntax can be desugared to core language
- **AST Extension Points** - New language features can be added across the pipeline
- **Utility Extension** - New analysis and transformation utilities can be built on common patterns

## Extension Points by Architectural Pattern

### 1. Pluggable Pass System

**Extension Point:** Optimization passes

**Architectural Pattern:**
The optimizer uses the pluggable pass system pattern (see [03-design-patterns.md](./03-design-patterns.md#pattern-3-pluggable-pass-system)), which defines a uniform `OptimizationPass` interface. New optimization passes implement this interface and are registered with the optimizer.

**Why It's Extensible:**
- **Interface-based:** Passes implement a simple interface (name + transform function)
- **Collection-based:** Optimizer manages a collection of passes, making it easy to add/remove
- **Configurable:** Passes can be enabled/disabled without code changes
- **Independent:** Each pass operates independently, no coupling between passes

**Extension Capabilities:**
- Add new optimization passes (constant folding, dead code elimination, inlining, etc.)
- Configure pass ordering for experimentation
- Enable/disable passes based on optimization level
- Add pass-specific configurations

**Constraints:**
- Passes must be pure transformations
- Passes must preserve location information
- Passes should handle all Core AST node types (or delegate to children)

### 2. Modular Transformation Architecture

**Extension Point:** Desugaring transformations

**Architectural Pattern:**
The desugarer uses the modular transformation architecture pattern (see [03-design-patterns.md](./03-design-patterns.md#pattern-2-modular-transformation-architecture)), breaking complex transformations into independently testable functions.

**Why It's Extensible:**
- **One transformation per module:** Each transformation is self-contained
- **Orchestrated composition:** The desugarer composes transformations without knowing their internals
- **Pure functions:** Transformations have no side effects
- **Order-agnostic design:** While order matters, transformations don't depend on specific ordering knowledge

**Extension Capabilities:**
- Add new surface syntax transformations
- Reorder transformations (within constraints)
- Replace individual transformations without affecting others
- Test transformations in isolation

**Constraints:**
- Transformations must be pure (Surface/Core AST → Core AST)
- Must preserve location information
- Order matters: some transformations depend on others having run first
- Must handle all Surface AST node types

### 3. Two-AST Strategy

**Extension Point:** New language features

**Architectural Pattern:**
The two-AST strategy (see [03-design-patterns.md](./03-design-patterns.md#pattern-1-two-ast-strategy)) separates surface syntax from core semantics, providing a clear extension path for new features.

**Why It's Extensible:**
- **Separation of concerns:** Surface AST handles syntax, Core AST handles semantics
- **Desugaring layer:** New surface syntax doesn't complicate type checker or optimizer
- **Minimal core:** Core language remains small and stable
- **Freedom in parsing:** Parser can build natural surface structures

**Extension Capabilities:**
- Add new surface syntax without changing type checker
- Add syntactic sugar that desugars to existing core constructs
- Experiment with different syntaxes for the same semantic feature
- Keep core language minimal while surface language grows

**Constraints:**
- New features must desugar to core language
- If core language needs extension, all phases must be updated
- Surface syntax must map cleanly to core semantics

### 4. Module Organization Pattern

**Extension Point:** Utility functions and analysis tools

**Architectural Pattern:**
The module organization pattern (see [03-design-patterns.md](./03-design-patterns.md#pattern-7-module-organization-pattern)) uses index files to expose public APIs, making it easy to add new utilities.

**Why It's Extensible:**
- **Clear public API:** Index files define what's public vs internal
- **Encapsulation:** Implementation details can change without affecting consumers
- **Consistent pattern:** All modules follow the same structure
- **Easy discovery:** Public API is explicitly listed

**Extension Capabilities:**
- Add new AST analysis utilities
- Add new transformation utilities
- Add new helper functions
- Extend error handling

**Constraints:**
- New exports must be added to index file
- Should follow naming conventions
- Should match existing API style

## Extension Scenarios

### Scenario 1: Adding an Optimization

**What Changes:**
- Create new pass module implementing OptimizationPass interface
- Register pass with optimizer
- Add tests

**What Doesn't Change:**
- Optimizer core logic
- Other optimization passes
- Pipeline structure
- Data structures

**Architectural Enabler:** Pluggable pass system pattern

### Scenario 2: Adding Syntactic Sugar

**What Changes:**
- Add new node types to Surface AST
- Update parser to recognize new syntax
- Create desugaring transformation
- Add transformation to desugarer pipeline

**What Doesn't Change:**
- Core AST
- Type checker
- Optimizer
- Code generator

**Architectural Enabler:** Two-AST strategy + Modular transformation architecture

### Scenario 3: Adding a Core Language Feature

**What Changes:**
- Add node types to both Surface and Core AST
- Update parser
- Update desugarer
- Update type checker
- Update optimizer (if special optimizations apply)
- Update code generator

**What Doesn't Change:**
- Existing AST nodes (unless dependencies exist)
- Cross-cutting utilities (unless they need to handle new node)
- Error handling infrastructure

**Architectural Enabler:** Modular phase design + consistent AST patterns

### Scenario 4: Adding Analysis Utilities

**What Changes:**
- Create new utility modules
- Export from utils index
- Add tests

**What Doesn't Change:**
- Existing utilities
- Compiler phases
- Data structures

**Architectural Enabler:** Module organization pattern

## Architectural Properties That Enable Extension

### 1. Immutability

All data structures are immutable, meaning transformations create new structures rather than modifying existing ones.

**Enables:**
- Safe transformation composition
- Independent pass development
- Parallel processing (future)
- Easier testing and debugging

### 2. Uniform Location Tracking

Every AST node includes location information following the location tracking pattern (see [03-design-patterns.md](./03-design-patterns.md#pattern-4-location-tracking-pattern)).

**Enables:**
- Consistent error reporting across all extensions
- Source map generation for any transformation
- No need for extensions to invent their own location tracking

### 3. Interface-Based Contracts

Key extension points use interfaces (OptimizationPass, error classes, utility functions) rather than concrete implementations.

**Enables:**
- Multiple implementations of the same contract
- Easy testing through mocks/stubs
- Clear boundaries between components

### 4. Functional Core, Stateful Shell

Pure functions for transformations, stateful classes for I/O-bound operations (Lexer, Parser).

**Enables:**
- Testable transformations without state management
- Composable pure functions
- Clear separation of concerns

## Design Principles for Extensions

When designing extensions, follow these architectural principles:

### Principle 1: Preserve Existing Patterns

Match the architectural patterns already in use. If optimization passes use an interface, don't introduce a different pattern for your extension.

### Principle 2: Maintain Separation of Concerns

Don't mix concerns. Desugaring transforms syntax, type checking validates semantics, optimization improves performance. Keep extensions focused.

### Principle 3: Use Composition Over Modification

Add new components rather than modifying existing ones. Add a new pass rather than extending an existing pass.

### Principle 4: Respect Data Flow

Follow the natural pipeline flow (Lexer → Parser → Desugarer → Type Checker → Optimizer → Code Generator). Don't create back-channels between phases.

### Principle 5: Keep the Core Minimal

Add to the Surface AST, not the Core AST, whenever possible. Core AST growth has a multiplicative effect on complexity.

## Limits of Extensibility

While the architecture is extensible, some changes require deeper modifications:

### Changes Requiring Pipeline Modification

- Adding entirely new compilation phases (e.g., a macro expansion phase)
- Changing the fundamental data flow
- Adding stateful transformations that violate functional principles

### Changes Requiring Core AST Modification

- Adding primitives that can't be expressed in current core language
- Changing type system fundamentals
- Adding effects system

### Changes Requiring Pervasive Updates

- Changing location tracking structure
- Modifying error handling architecture
- Altering module system fundamentals

## Example Extension Points

### High-Level Extensions (Surface Syntax)

New surface syntax can be added with minimal changes:
- Pipe operators (already implemented)
- List comprehensions
- Pattern matching enhancements
- Syntactic conveniences

### Mid-Level Extensions (Optimizations)

New optimizations can be added as passes:
- Common subexpression elimination
- Inlining strategies
- Loop optimizations (if loops are added)
- Tail call optimization

### Low-Level Extensions (Core Language)

Core language extensions affect multiple phases:
- Effect systems
- Type classes
- Dependent types
- Linear types

## Next Steps

For architectural context:
- **[01-overview.md](./01-overview.md)** - Overall architecture philosophy
- **[03-design-patterns.md](./03-design-patterns.md)** - Patterns that enable extensibility
- **[02-compilation-pipeline.md](./02-compilation-pipeline.md)** - Pipeline structure

For implementation guidance:
- See project root `CLAUDE.md` and `.claude/CODING_STANDARDS.md`
- Review existing implementations of the pattern you're extending

---

**Last Updated:** 2025-11-23
