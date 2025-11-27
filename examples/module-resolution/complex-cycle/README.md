# Complex Multi-Module Cycle

This example demonstrates a **3-module circular dependency** (A → C → B → A).

## The Cycle

\`\`\`
moduleA.vf ──imports──> moduleC.vf
     ▲                      │
     │                 imports
     │                      │
     └── moduleB.vf <───────┘
\`\`\`

- `moduleA` imports `processC` from `moduleC`
- `moduleC` imports `processB` from `moduleB`
- `moduleB` imports `processA` from `moduleA`

This creates a cycle: A → C → B → A

## Compiler Detection

The vibefun compiler detects this cycle and reports:

\`\`\`
warning[VF5900]: Circular dependency detected: moduleA.vf → moduleC.vf → moduleB.vf → moduleA.vf
  --> moduleA.vf:5:1
   |
 5 | import { processC } from "./moduleC";
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
 = hint: Consider restructuring modules to break the cycle
\`\`\`

## How to Fix: Extract Shared Module

The best fix is often to extract shared functionality into a separate module:

### Before (Cyclic)
\`\`\`
A ──> C
↑     │
│     ↓
└──── B
\`\`\`

### After (Acyclic)
\`\`\`
     Shared
    ╱  │  ╲
   ↓   ↓   ↓
   A   B   C
   │   │   │
   └───┴───┘
       │
   (use Shared)
\`\`\`

Create a `shared.vf` module containing the common functionality that all three modules need, then have A, B, and C import from Shared instead of each other.

## Key Points

- The compiler finds ALL cycles (using Tarjan's SCC algorithm)
- Longer cycles are reported with full path
- Each module in the cycle appears in the warning
- Break cycles by extracting shared functionality
