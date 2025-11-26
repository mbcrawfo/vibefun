<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->


# Module System Errors

Errors during module resolution and import/export handling

## Overview

| Code | Name | Severity |
|------|------|----------|
| [VF5000](#vf5000) | ModuleNotFound | **Error** |
| [VF5001](#vf5001) | ImportNotExported | **Error** |
| [VF5002](#vf5002) | DuplicateImport | **Error** |
| [VF5003](#vf5003) | ImportShadowed | **Error** |
| [VF5100](#vf5100) | DuplicateExport | **Error** |
| [VF5101](#vf5101) | ReexportConflict | **Error** |
| [VF5900](#vf5900) | CircularDependency | **Warning** |
| [VF5901](#vf5901) | CaseSensitivityMismatch | **Warning** |

---

## VF5000

**ModuleNotFound** **Error**

### Message

> Module '{path}' not found

### Explanation

The import statement references a module that could not be found. This can happen if the file path is incorrect, the file doesn't exist, or the module name is misspelled.

### Example

**Problem:**

```vibefun
import { foo } from "./utills"
```

**Solution:**

```vibefun
import { foo } from "./utils"
```

*Fixed typo in module path: "utills" → "utils"*

### Hint

> Check that the module path is correct and the file exists

### Related

[VF5001](modules.md#vf5001), [VF5002](modules.md#vf5002)


---

## VF5001

**ImportNotExported** **Error**

### Message

> '{name}' is not exported from module '{path}'

### Explanation

The import statement tries to import a name that is not exported from the target module. Either the name is misspelled, or the target module doesn't export this binding.

### Example

**Problem:**

```vibefun
import { helpr } from "./utils"
```

**Solution:**

```vibefun
import { helper } from "./utils"
```

*Fixed typo in import name: "helpr" → "helper"*

### Hint

> Check the module's exports or add the export declaration

### Related

[VF5000](modules.md#vf5000), [VF5100](modules.md#vf5100)


---

## VF5002

**DuplicateImport** **Error**

### Message

> '{name}' is already imported

### Explanation

The same name is imported multiple times. Each imported name must be unique within a module. Use aliasing (as newName) if you need to import identically named exports from different modules.

### Example

**Problem:**

```vibefun
import { foo } from "./a"
import { foo } from "./b"
```

**Solution:**

```vibefun
import { foo } from "./a"
import { foo as fooB } from "./b"
```

*Used alias to avoid duplicate import name*

### Hint

> Remove the duplicate import or use an alias

### Related

[VF5003](modules.md#vf5003)


---

## VF5003

**ImportShadowed** **Error**

### Message

> Import '{name}' is shadowed by local declaration

### Explanation

An import is shadowed by a local declaration with the same name. This makes the import inaccessible and is likely a mistake.

### Example

**Problem:**

```vibefun
import { foo } from "./utils"
let foo = 1
```

**Solution:**

```vibefun
import { foo as utilsFoo } from "./utils"
let foo = 1
```

*Used import alias to avoid shadowing*

### Hint

> Rename the local declaration or use an import alias

### Related

[VF5002](modules.md#vf5002)


---

## VF5100

**DuplicateExport** **Error**

### Message

> '{name}' is already exported

### Explanation

The same name is exported multiple times from this module. Each exported name must be unique.

### Example

**Problem:**

```vibefun
export let foo = 1
export let foo = 2
```

**Solution:**

```vibefun
export let foo = 1
export let bar = 2
```

*Renamed duplicate export to have unique names*

### Hint

> Remove the duplicate export declaration

### Related

[VF5101](modules.md#vf5101), [VF5102](typechecker.md#vf5102)


---

## VF5101

**ReexportConflict** **Error**

### Message

> Re-export '{name}' conflicts with existing export

### Explanation

A re-export statement introduces a name that conflicts with an existing export. This can happen when re-exporting from multiple modules or combining local exports with re-exports.

### Example

**Problem:**

```vibefun
export { foo } from "./a"
export { foo } from "./b"
```

**Solution:**

```vibefun
export { foo } from "./a"
export { foo as fooB } from "./b"
```

*Used alias for conflicting re-export*

### Hint

> Use an alias for the re-export or remove the conflicting export

### Related

[VF5100](modules.md#vf5100)


---

## VF5900

**CircularDependency** **Warning**

### Message

> Circular dependency detected: {cycle}

### Explanation

A circular dependency was detected between modules. While this may work at runtime, circular dependencies can lead to subtle bugs and make code harder to understand and maintain. Consider extracting shared code into a separate module.

### Example

**Problem:**

```vibefun
// a.vf
import { b } from "./b"
// b.vf
import { a } from "./a"
```

**Solution:**

```vibefun
// shared.vf
export let shared = ...
// a.vf and b.vf import from shared
```

*Extract shared code to break the circular dependency*

### Hint

> Consider restructuring modules to break the cycle

### Related

[VF5000](modules.md#vf5000)


---

## VF5901

**CaseSensitivityMismatch** **Warning**

### Message

> Module path '{actual}' has different casing than on disk: '{expected}'

### Explanation

The module path casing doesn't match the actual file name on disk. While this may work on case-insensitive file systems (like macOS and Windows), it will fail on case-sensitive systems (like Linux).

### Example

**Problem:**

```vibefun
import { foo } from "./Utils"  // file is utils.vf
```

**Solution:**

```vibefun
import { foo } from "./utils"
```

*Fixed casing to match actual file name*

### Hint

> Use the exact casing as the file on disk

### Related

[VF5000](modules.md#vf5000)

