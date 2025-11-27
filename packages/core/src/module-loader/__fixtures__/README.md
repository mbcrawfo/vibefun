# Module Loader Test Fixtures

These fixtures provide version-controlled test modules for module loader and resolver testing.

## Fixtures

### simple-import/

Basic A imports B pattern:
- `main.vf` - imports `utils.vf`
- `utils.vf` - exports `greet` function

### diamond-dependency/

Diamond dependency pattern (A → B,C → D):
- `main.vf` - imports `moduleB.vf` and `moduleC.vf`
- `moduleB.vf` - imports `moduleD.vf`
- `moduleC.vf` - imports `moduleD.vf`
- `moduleD.vf` - shared dependency (should only be parsed once)

### type-only-cycle/

Safe circular type imports (no warning expected):
- `moduleA.vf` - `import type { TypeB } from './moduleB'`
- `moduleB.vf` - `import type { TypeA } from './moduleA'`
- `main.vf` - entry point

### value-cycle/

Unsafe value circular imports (warning VF5900 expected):
- `moduleA.vf` - `import { fromB } from './moduleB'`
- `moduleB.vf` - `import { fromA } from './moduleA'`
- `main.vf` - entry point

## Usage in Tests

```typescript
import * as path from 'path';
import { loadAndResolveModules } from '../index.js';

const fixturesDir = path.join(__dirname, '__fixtures__');

it('should handle simple imports', () => {
  const entry = path.join(fixturesDir, 'simple-import', 'main.vf');
  const result = loadAndResolveModules(entry);
  expect(result.errors).toHaveLength(0);
  expect(result.modules.size).toBe(2);
});

it('should detect value cycles', () => {
  const entry = path.join(fixturesDir, 'value-cycle', 'main.vf');
  const result = loadAndResolveModules(entry);
  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0].code).toBe('VF5900');
});
```

## Adding New Fixtures

1. Create a new directory with descriptive name
2. Add `.vf` files following vibefun syntax
3. Include comments explaining the test scenario
4. Update this README
