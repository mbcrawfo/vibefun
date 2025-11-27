# Module Resolution Examples

This directory contains examples demonstrating vibefun's module resolution and circular dependency detection.

## Examples

| Directory | Description | Warning? |
|-----------|-------------|----------|
| [safe-types/](./safe-types/) | Type-only circular imports | ❌ No |
| [unsafe-values/](./unsafe-values/) | Value circular imports (problematic) | ⚠️ Yes (VF5900) |
| [lazy-eval/](./lazy-eval/) | Safe pattern using getter functions | ❌ No |
| [complex-cycle/](./complex-cycle/) | Multi-module cycle (A → B → C → A) | ⚠️ Yes (VF5900) |

## Quick Reference

### Safe: Type-Only Cycles

\`\`\`vibefun
// moduleA.vf
import type { TypeB } from "./moduleB";
export type TypeA = { b: TypeB };

// moduleB.vf  
import type { TypeA } from "./moduleA";
export type TypeB = { a: TypeA };
\`\`\`

✅ No warning - types are erased at runtime

### Warning: Value Cycles

\`\`\`vibefun
// moduleA.vf
import { valueB } from "./moduleB";
export let valueA = 1;

// moduleB.vf
import { valueA } from "./moduleA";
export let valueB = valueA + 1; // ⚠️ Problem!
\`\`\`

⚠️ VF5900 warning - may access uninitialized value

### Fix: Lazy Evaluation

\`\`\`vibefun
// moduleA.vf
export let getValue = () => 1;

// moduleB.vf
import { getValue } from "./moduleA";
export let compute = () => getValue() + 1; // ✅ Safe
\`\`\`

✅ No warning - value accessed after init

## Related Documentation

- [Module System Specification](../../docs/spec/08-modules.md)
- [Circular Dependency Handling](../../docs/spec/08-modules.md#circular-dependencies)
- [VF5900 Warning](../../docs/errors/VF5900.md) (auto-generated)
