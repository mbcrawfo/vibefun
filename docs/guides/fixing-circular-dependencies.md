# Fixing Circular Dependencies

This guide explains circular dependencies, when they're problematic, and how to fix them.

## What is a Circular Dependency?

A circular dependency occurs when modules depend on each other in a cycle:

```
moduleA.vf  →  moduleB.vf
    ↑              ↓
    └──────────────┘
```

```vibefun
// moduleA.vf
import { b } from "./moduleB"
export let a = b + 1

// moduleB.vf
import { a } from "./moduleA"
export let b = a + 1
```

Vibefun detects this and emits warning [VF5900](../errors/modules.md#vf5900):

```
warning[VF5900]: Circular dependency detected: moduleA.vf → moduleB.vf → moduleA.vf
```

## Why Are Circular Dependencies Problematic?

### Initialization Order Issues

When modules form a cycle, there's no valid order to initialize them. One module will inevitably see `undefined` values:

```vibefun
// a.vf
import { valueB } from "./b"
export let valueA = 1
console.log(valueB)  // undefined! b.vf hasn't finished initializing

// b.vf
import { valueA } from "./a"
export let valueB = valueA + 1  // NaN! valueA is undefined
```

### Hard to Understand

Circular dependencies make code harder to reason about:
- Which module initializes first?
- What values are available when?
- Changes in one module may unexpectedly affect another

### Testing Difficulties

Modules with circular dependencies are harder to test in isolation.

## When Circular Dependencies Are Safe

### Type-Only Cycles

If ALL imports in the cycle are type-only, no warning is emitted:

```vibefun
// a.vf
import type { TypeB } from "./b"
export type TypeA = { nested: TypeB }

// b.vf
import type { TypeA } from "./a"
export type TypeB = { nested: TypeA }
```

This is safe because:
- Types are erased at runtime
- No initialization order issues
- No runtime dependency exists

### Functions (Deferred Evaluation)

Functions referencing other modules are called later, after initialization:

```vibefun
// a.vf
import { getB } from "./b"
export let getA = () => "A: " ++ getB()  // Safe: called after init

// b.vf
import { getA } from "./a"
export let getB = () => "B"
export let useA = () => getA()           // Safe: called after init
```

The cycle exists, but since values are accessed through function calls (deferred), initialization works correctly.

## Fixing Circular Dependencies

### Pattern 1: Extract Shared Module

**Problem**: Two modules depend on each other for shared functionality.

```vibefun
// a.vf
import { b, shared } from "./b"
export let a = shared + 1

// b.vf
import { a, shared } from "./a"  // Error: circular!
export let b = shared + 2
export let shared = 100
```

**Solution**: Extract shared code to a third module.

```vibefun
// shared.vf
export let shared = 100

// a.vf
import { shared } from "./shared"
import { b } from "./b"
export let a = shared + 1

// b.vf
import { shared } from "./shared"
export let b = shared + 2
```

**When to use**: When modules share common types, constants, or utilities.

### Pattern 2: Lazy Evaluation

**Problem**: Module values depend on each other at initialization.

```vibefun
// a.vf
import { b } from "./b"
export let a = b * 2  // Needs b immediately

// b.vf
import { a } from "./a"
export let b = a + 1  // Needs a immediately - cycle!
```

**Solution**: Wrap in functions to defer evaluation.

```vibefun
// a.vf
import { getB } from "./b"
export let getA = () => getB() * 2

// b.vf
import { getA } from "./a"
export let getB = () => 10         // Base case
export let useA = () => getA()     // Now safe to call
```

**When to use**: When values must be computed from each other, but not at module load time.

### Pattern 3: Dependency Injection

**Problem**: Module A needs to call Module B, and B needs to call A.

```vibefun
// user-service.vf
import { log } from "./logger"
export let createUser = (name) => {
  log("Creating user")
  // ...
}

// logger.vf
import { getCurrentUser } from "./user-service"  // Cycle!
export let log = (msg) => {
  let user = getCurrentUser()
  // ...
}
```

**Solution**: Pass dependencies as parameters instead of importing.

```vibefun
// user-service.vf
export let createUser = (logger, name) => {
  logger("Creating user")
  // ...
}

// logger.vf
export let createLogger = (userGetter) => {
  (msg) => {
    let user = userGetter()
    // ...
  }
}

// main.vf - Wire up dependencies
import { createUser } from "./user-service"
import { createLogger } from "./logger"

let getCurrentUser = () => { /* ... */ }
let logger = createLogger(getCurrentUser)
let user = createUser(logger, "Alice")
```

**When to use**: When modules need to call each other's functions.

### Pattern 4: Event-Based Decoupling

**Problem**: Modules need to react to each other's changes.

```vibefun
// order.vf
import { updateInventory } from "./inventory"  // Cycle!
export let placeOrder = (item) => {
  // ...
  updateInventory(item)
}

// inventory.vf
import { notifyOrder } from "./order"
export let updateInventory = (item) => {
  // ...
  notifyOrder(item)
}
```

**Solution**: Use events/callbacks to decouple.

```vibefun
// events.vf
export type Event = OrderPlaced(Item) | InventoryUpdated(Item)
export let listeners: List<Event -> ()> = []
export let emit = (event) => List.forEach(listeners, (f) => f(event))
export let on = (handler) => List.push(listeners, handler)

// order.vf
import { emit, Event } from "./events"
export let placeOrder = (item) => {
  // ...
  emit(Event.OrderPlaced(item))
}

// inventory.vf
import { on, Event } from "./events"
let handleEvent = (event) => match event {
  Event.OrderPlaced(item) => updateStock(item)
  _ => ()
}
let _ = on(handleEvent)  // Register listener
```

**When to use**: When modules need loose coupling and asynchronous communication.

### Pattern 5: Merge Modules

Sometimes the simplest solution is combining tightly coupled modules:

**Before**:
```vibefun
// a.vf
import { b } from "./b"
export let a = b + 1

// b.vf
import { a } from "./a"
export let b = a + 1
```

**After**:
```vibefun
// ab.vf
export let a = 1
export let b = a + 1  // Now simple, no cycle
```

**When to use**: When modules are so tightly coupled they're essentially one unit.

## Best Practices

### 1. Organize by Feature, Not Type

**Avoid**:
```
types/
  ├── all-types.vf       # Everything imports this
models/
  ├── all-models.vf      # And this imports types
services/
  └── all-services.vf    # Creates cycles
```

**Prefer**:
```
features/
  ├── user/
  │   ├── types.vf
  │   ├── model.vf
  │   └── service.vf
  └── order/
      ├── types.vf
      └── service.vf
```

### 2. Keep Types Separate

Put types in dedicated files that don't import values:

```vibefun
// types.vf - Only types, no value imports
export type User = { name: String, age: Int }
export type Order = { user: User, items: List<Item> }

// user.vf - Imports types only
import type { User } from "./types"
export let createUser = (name, age): User => { name, age }
```

### 3. Use Clear Dependency Direction

Establish a clear dependency hierarchy:

```
UI → Services → Models → Types
↓ depends on →
```

Lower layers should never import from higher layers.

### 4. Prefer Composition Over Inheritance

Instead of modules knowing about each other:

```vibefun
// main.vf - Composes modules
import { UserService } from "./user-service"
import { OrderService } from "./order-service"

let userService = UserService.create()
let orderService = OrderService.create(userService)
```

## Detecting Cycles

Vibefun automatically detects cycles during compilation:

```
warning[VF5900]: Circular dependency detected: a.vf → b.vf → c.vf → a.vf
  --> src/a.vf:1:1
   |
 1 | import { b } from "./b"
   | ^^^^^^^^^^^^^^^^^^^^^^^
   |
 = hint: Consider restructuring modules to break the cycle
```

The warning shows:
- The complete cycle path
- Where the problematic import is
- A hint to restructure

## Summary

| Pattern | When to Use |
|---------|-------------|
| Extract Shared Module | Shared types, constants, utilities |
| Lazy Evaluation | Values computed from each other |
| Dependency Injection | Functions that call each other |
| Event-Based | Loose coupling, async communication |
| Merge Modules | Tightly coupled code |

Remember:
- Type-only cycles are safe (no warning)
- Function-wrapped values are usually safe (deferred evaluation)
- Value cycles at initialization time are problematic

## See Also

- [Module Resolution](./module-resolution.md) - How modules are found
- [VF5900: Circular Dependency](../errors/modules.md#vf5900) - Warning details
- [Module System Specification](../spec/08-modules.md) - Technical specification
