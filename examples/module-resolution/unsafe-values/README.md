# Unsafe Circular Value Imports (Warning Example)

This example demonstrates **unsafe** circular dependencies that trigger the VF5900 warning.

## The Problem

`moduleA.vf` and `moduleB.vf` have circular value dependencies:
- `moduleA` imports `formatMessage` from `moduleB`
- `moduleB` imports `MESSAGE` from `moduleA`

## Why It's Problematic

When modules load:
1. `moduleA` starts loading
2. `moduleA` imports `moduleB`
3. `moduleB` starts loading
4. `moduleB` tries to access `MESSAGE` from `moduleA`
5. ⚠️ `moduleA` hasn't finished initializing yet!

This can cause:
- Undefined values at module init time
- Runtime errors (temporal dead zone)
- Hard-to-debug initialization order issues

## Compiler Behavior

The vibefun compiler:
- ⚠️ Emits VF5900 warning for value cycles
- ✅ Still compiles the code (warning, not error)
- 📝 Suggests refactoring patterns in the warning

## Warning Output

\`\`\`
warning[VF5900]: Circular dependency detected: moduleA.vf → moduleB.vf → moduleA.vf
  --> moduleA.vf:5:1
   |
 5 | import { formatMessage } from "./moduleB";
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
 = hint: Consider restructuring modules to break the cycle
\`\`\`

## How to Fix

See the `lazy-eval/` example for the recommended fix pattern.
