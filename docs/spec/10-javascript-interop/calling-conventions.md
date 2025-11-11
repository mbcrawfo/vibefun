# Calling Vibefun from JavaScript

### Calling Vibefun from JavaScript

Compiled Vibefun functions can be called from JavaScript, but you need to understand the calling conventions.

```javascript
// Generated JavaScript
const add = (x) => (y) => x + y;

// Call from JS
add(1)(2);  // 3

// With partial application
const increment = add(1);
increment(5);  // 6
```

#### Calling Conventions

**Curried functions:**
```vibefun
// Vibefun
let add = (x, y) => x + y;
// Type: (Int) -> (Int) -> Int
```

```javascript
// JavaScript
const add = (x) => (y) => x + y;

// Call as curried:
add(1)(2);  // 3

// Or partially apply:
const increment = add(1);
increment(5);  // 6
```

**Functions with many arguments:**
```vibefun
let calculate = (a, b, c, d) => a + b + c + d;
```

```javascript
// Nested currying
const calculate = (a) => (b) => (c) => (d) => a + b + c + d;

calculate(1)(2)(3)(4);  // 10

// Partial application at any level
const calc1 = calculate(1);
const calc12 = calc1(2);
const calc123 = calc12(3);
calc123(4);  // 10
```

#### ADT Representation in JavaScript

**Variant types** are compiled to objects with a `tag` field:

```vibefun
type Option<T> = Some(T) | None;
```

```javascript
// JavaScript representation
const Some = (value) => ({ tag: "Some", value });
const None = { tag: "None" };

// Pattern matching
function matchOption(opt) {
    switch (opt.tag) {
        case "Some":
            return opt.value;
        case "None":
            return null;
    }
}
```

**Records** are compiled to plain JavaScript objects:

```vibefun
type Person = { name: String, age: Int };
```

```javascript
// JavaScript representation
const person = { name: "Alice", age: 30 };

// Access fields directly
console.log(person.name);  // "Alice"
```

#### Constructing Vibefun Values from JS

JavaScript code can construct Vibefun values:

```javascript
// Construct Option values
const someValue = { tag: "Some", value: 42 };
const noneValue = { tag: "None" };

// Construct Result values
const okValue = { tag: "Ok", value: "success" };
const errValue = { tag: "Err", value: "error message" };

// Construct records
const person = { name: "Bob", age: 25, email: "bob@example.com" };

// Call Vibefun function with constructed values
const process = require('./compiled-vibefun');
const result = process.handleOption(someValue);
```

#### Refs in JavaScript

Refs are represented as objects with a `.value` field:

```vibefun
let mut counter = ref(0);
```

```javascript
// JavaScript representation
const counter = { value: 0 };

// Read ref
console.log(counter.value);  // 0

// Update ref
counter.value = 5;

// Refs are mutable objects
const ref1 = { value: 10 };
const ref2 = ref1;  // Same ref
ref1.value = 20;
console.log(ref2.value);  // 20 (same object)
```

---

