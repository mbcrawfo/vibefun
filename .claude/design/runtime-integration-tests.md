# Runtime Integration Tests Design Document

**Created:** 2025-11-26
**Status:** Blocked on code generator
**Related:** module-resolution feature

## Overview

This document outlines the design for runtime integration tests that will verify module resolution behavior at JavaScript runtime. These tests are blocked until the code generator is implemented.

## Purpose

Runtime integration tests will verify:
1. Module initialization order matches compilation order
2. Circular dependencies work correctly with deferred initialization
3. Type-only cycles have no runtime impact
4. Module singleton semantics are preserved
5. Generated JavaScript executes correctly in Node.js

## Test Scenarios

### 1. Cyclic Module Initialization Order

**Scenario:** Two modules with value cycle should initialize in correct order.

```vibefun
// a.vf
import { b } from './b';
export let a = () => b();

// b.vf
import { a } from './a';
export let b = () => 42;
export let useA = () => a();
```

**Expected JavaScript Output:**
```javascript
// Modules should use deferred access pattern
// to avoid accessing uninitialized exports
```

**Test Approach:**
- Compile modules
- Run generated JS with Node.js
- Verify `b()` returns 42
- Verify `useA()` works after initialization

### 2. Deferred Initialization Semantics

**Scenario:** Value access should be deferred to avoid TDZ errors.

```vibefun
// counter.vf
import { increment } from './operations';
export let count = 0;
export let getCount = () => count;

// operations.vf
import { count, getCount } from './counter';
export let increment = () => { count = count + 1; };
```

**Expected Behavior:**
- No temporal dead zone errors
- Mutations visible across module boundaries
- Deferred initialization pattern in generated code

### 3. Type-Only Cycles at Runtime

**Scenario:** Type-only imports should have no runtime presence.

```vibefun
// a.vf
import type { TypeB } from './b';
export type TypeA = { wrapped: TypeB };
export let createA = () => ({ value: 42 });

// b.vf
import type { TypeA } from './a';
export type TypeB = { data: TypeA };
export let createB = () => ({ info: "test" });
```

**Expected JavaScript Output:**
```javascript
// No runtime import for types
// No circular dependency at runtime
```

**Test Approach:**
- Compile modules
- Verify no runtime import statements for type-only imports
- Run generated JS successfully

### 4. Module Singleton Semantics

**Scenario:** Each module should be initialized exactly once.

```vibefun
// shared.vf
export let counter = 0;
export let increment = () => { counter = counter + 1; };

// a.vf
import { increment } from './shared';
increment();

// b.vf
import { increment } from './shared';
increment();

// main.vf
import './a';
import './b';
import { counter } from './shared';
```

**Expected Behavior:**
- `counter` should be 2 after main.vf runs
- `shared.vf` initialized only once

### 5. Error Propagation During Init

**Scenario:** Errors during module initialization should propagate correctly.

```vibefun
// thrower.vf
export let value = throw "initialization error";

// user.vf
import { value } from './thrower';
```

**Expected Behavior:**
- Error thrown when `user.vf` is loaded
- Error message includes module path
- Stack trace shows initialization chain

## Expected JavaScript Output Patterns

### Import Generation

```javascript
// Vibefun import
import { x } from './module';

// Generated JS
import { x } from './module.js';
```

### Export Generation

```javascript
// Vibefun export
export let value = 42;

// Generated JS
export let value = 42;
```

### Deferred Access Pattern (for cycles)

```javascript
// For cyclic value dependencies, generate lazy access:
let _a_cached = null;
const get_a = () => {
  if (_a_cached === null) {
    _a_cached = require('./a.js');
  }
  return _a_cached;
};

// Usage
const useA = () => get_a().someFunction();
```

## Node.js Test Harness Approach

### Test Setup

```typescript
// test/runtime/harness.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface RuntimeTestResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Compile Vibefun files and run the generated JavaScript.
 */
export function runRuntimeTest(
  files: Map<string, string>,  // filename -> content
  entryPoint: string,
): RuntimeTestResult {
  // 1. Create temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-runtime-test-'));

  try {
    // 2. Write Vibefun files
    for (const [filename, content] of files) {
      const filePath = path.join(tempDir, filename);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }

    // 3. Compile with vibefun
    const entryPath = path.join(tempDir, entryPoint);
    const outputDir = path.join(tempDir, 'dist');

    // TODO: Use vibefun compiler API directly when available
    // compile(entryPath, { outDir: outputDir });

    // 4. Run generated JavaScript
    const jsEntry = path.join(outputDir, entryPoint.replace('.vf', '.js'));
    const result = execSync(`node ${jsEntry}`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });

    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: String(error),
    };
  } finally {
    // 5. Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
```

### Test Structure

```typescript
// test/runtime/cyclic-init.test.ts
import { describe, it, expect } from 'vitest';
import { runRuntimeTest } from './harness';

describe('Cyclic Module Initialization', () => {
  it('should handle value cycles with deferred initialization', () => {
    const files = new Map([
      ['a.vf', `
        import { b } from './b';
        export let a = () => b();
      `],
      ['b.vf', `
        import { a } from './a';
        export let b = () => 42;
        export let useA = () => a();
      `],
      ['main.vf', `
        import { b, useA } from './b';
        // Test entry point
        console.log(b());
        console.log(useA());
      `],
    ]);

    const result = runRuntimeTest(files, 'main.vf');

    expect(result.success).toBe(true);
    expect(result.output).toContain('42');
  });

  it('should initialize modules exactly once', () => {
    const files = new Map([
      ['counter.vf', `
        export let count = 0;
        count = count + 1;  // Runs on init
        export let getCount = () => count;
      `],
      ['a.vf', `import { getCount } from './counter';`],
      ['b.vf', `import { getCount } from './counter';`],
      ['main.vf', `
        import './a';
        import './b';
        import { getCount } from './counter';
        console.log(getCount());  // Should print 1
      `],
    ]);

    const result = runRuntimeTest(files, 'main.vf');

    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe('1');
  });
});
```

## Dependencies

This test suite is blocked on:

1. **Code Generator** - Must generate valid JavaScript from Vibefun modules
2. **CLI** - Optional, could use compiler API directly
3. **Module Bundling** - May need to bundle modules for Node.js execution

## Implementation Plan

When code generator is implemented:

1. Create `packages/core/test/runtime/` directory
2. Implement test harness (`harness.ts`)
3. Port test scenarios from this document
4. Add to CI pipeline
5. Document any discovered edge cases

## Related Documentation

- `docs/spec/08-modules.md` - Module system specification
- `.claude/active/module-resolution/module-resolution-plan.md` - Feature plan
- `packages/core/src/module-resolver/` - Module resolution implementation

## Notes

- Tests should be isolated (temp directories, clean up)
- Consider using vitest's `concurrent` for parallelization
- May need special handling for Windows path separators
- Consider ESM vs CommonJS output modes
