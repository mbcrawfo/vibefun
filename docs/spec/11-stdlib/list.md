# List Module

The `List` module provides functional operations for working with immutable linked lists. Lists are the primary sequential data structure in Vibefun, optimized for prepending elements and sequential traversal.

## List Type

```vibefun
type List<T> = [] | [T, ...List<T>]
```

Lists are immutable, singly-linked sequences. Operations that "modify" lists return new lists.

## List Construction

```vibefun
let empty = []                    // Empty list
let nums = [1, 2, 3]             // List literal
let spread = [0, ...nums, 4]     // Spread operator
let cons = [1, 2, 3]             // Equivalent to [1, ...[ 2, ...[3, ...[]]]]
```

## Core Functions

### List.map

```vibefun
List.map: <A, B>(List<A>, (A) -> B) -> List<B>
```

**Description:** Transform each element of a list using the provided function.

**Semantics:**
- Applies function `f` to each element of the list
- Returns a new list with transformed elements
- Preserves list order
- Empty list returns empty list

**Examples:**

```vibefun
List.map([1, 2, 3], (x) => x * 2)
// [2, 4, 6]

List.map([], (x) => x * 2)
// []

List.map(["a", "b"], String.length)
// [1, 1]
```

**Performance:** O(n) time, O(n) space

---

### List.filter

```vibefun
List.filter: <A>(List<A>, (A) -> Bool) -> List<A>
```

**Description:** Keep only elements that satisfy the predicate.

**Semantics:**
- Returns a new list containing only elements where `predicate(element)` is `true`
- Preserves relative order of kept elements
- If no elements match, returns empty list
- If all elements match, returns a copy of the list

**Examples:**

```vibefun
List.filter([1, 2, 3, 4, 5], (x) => x % 2 == 0)
// [2, 4]

List.filter([1, 3, 5], (x) => x % 2 == 0)
// []

List.filter([], (x) => true)
// []
```

**Performance:** O(n) time, O(k) space where k is the number of matching elements

---

### List.fold

```vibefun
List.fold: <A, B>(List<A>, B, (B, A) -> B) -> B
```

**Description:** Left fold - reduce a list to a single value by applying a function from left to right.

**Semantics:**
- Also known as "foldLeft" or "reduce"
- Starts with initial accumulator value
- Processes elements from left to right (head to tail)
- For list `[a, b, c]` with initial `z` and function `f`:
  - Result: `f(f(f(z, a), b), c)`
- Empty list returns the initial accumulator

**Examples:**

```vibefun
// Sum
List.fold([1, 2, 3, 4], 0, (acc, x) => acc + x)
// 10
// Evaluation: fold(0, 1) -> 1, fold(1, 2) -> 3, fold(3, 3) -> 6, fold(6, 4) -> 10

// Build reversed list
List.fold([1, 2, 3], [], (acc, x) => [x, ...acc])
// [3, 2, 1]

// Concatenate strings with separator
List.fold(["a", "b", "c"], "", (acc, x) =>
    if acc == "" then x else acc & "," & x
)
// "a,b,c"

// Empty list
List.fold([], 100, (acc, x) => acc + x)
// 100
```

**Performance:** O(n) time, O(1) space (tail recursive)

---

### List.foldRight

```vibefun
List.foldRight: <A, B>(List<A>, B, (A, B) -> B) -> B
```

**Description:** Right fold - reduce a list to a single value by applying a function from right to left.

**Semantics:**
- Processes elements from right to left (tail to head)
- For list `[a, b, c]` with initial `z` and function `f`:
  - Result: `f(a, f(b, f(c, z)))`
- Note: Parameter order is `(element, accumulator)` (reversed from `fold`)
- Empty list returns the initial accumulator

**Examples:**

```vibefun
// Build list (preserves order, unlike fold)
List.foldRight([1, 2, 3], [], (x, acc) => [x, ...acc])
// [1, 2, 3]

// Subtraction (demonstrates order difference from fold)
List.fold([1, 2, 3], 0, (acc, x) => acc - x)
// 0 - 1 - 2 - 3 = -6

List.foldRight([1, 2, 3], 0, (x, acc) => x - acc)
// 1 - (2 - (3 - 0)) = 1 - (2 - 3) = 1 - (-1) = 2

// Flatten nested lists
let nested = [[1, 2], [3, 4], [5]]
List.foldRight(nested, [], (xs, acc) => List.concat(xs, acc))
// [1, 2, 3, 4, 5]
```

**Performance:** O(n) time, O(n) space (NOT tail recursive)

**Note:** `foldRight` is not tail recursive and can cause stack overflow on very large lists (>10,000 elements). Use `fold` when possible.

---

### List.length

```vibefun
List.length: <A>(List<A>) -> Int
```

**Description:** Return the number of elements in the list.

**Examples:**

```vibefun
List.length([1, 2, 3])      // 3
List.length([])             // 0
List.length([[1], [2, 3]])  // 2 (counts top-level elements only)
```

**Performance:** O(n) time (must traverse entire list)

**Note:** Length is not cached. If you need to check for empty list, use pattern matching instead:

```vibefun
// ❌ Inefficient
if List.length(xs) == 0 then ...

// ✅ Efficient
match xs {
    | [] => ...
    | _ => ...
}
```

---

### List.head

```vibefun
List.head: <A>(List<A>) -> Option<A>
```

**Description:** Return the first element of the list, if it exists.

**Semantics:**
- Returns `Some(element)` for non-empty lists
- Returns `None` for empty lists
- Does not modify the list

**Examples:**

```vibefun
List.head([1, 2, 3])  // Some(1)
List.head([42])       // Some(42)
List.head([])         // None
```

**Performance:** O(1) time

**Alternative:** Pattern matching is more idiomatic:

```vibefun
match list {
    | [] => // empty case
    | [head, ...tail] => // use head and tail
}
```

---

### List.tail

```vibefun
List.tail: <A>(List<A>) -> Option<List<A>>
```

**Description:** Return all elements except the first, if the list is non-empty.

**Semantics:**
- Returns `Some(rest)` for non-empty lists where `rest` is all elements after the first
- Returns `None` for empty lists
- For single-element list, returns `Some([])`

**Examples:**

```vibefun
List.tail([1, 2, 3])  // Some([2, 3])
List.tail([42])       // Some([])
List.tail([])         // None
```

**Performance:** O(1) time

---

### List.reverse

```vibefun
List.reverse: <A>(List<A>) -> List<A>
```

**Description:** Return a new list with elements in reverse order.

**Examples:**

```vibefun
List.reverse([1, 2, 3])  // [3, 2, 1]
List.reverse([42])       // [42]
List.reverse([])         // []
```

**Performance:** O(n) time, O(n) space

**Implementation note:** Can be implemented using `List.fold`:

```vibefun
let reverse = (xs) => List.fold(xs, [], (acc, x) => [x, ...acc])
```

---

### List.concat

```vibefun
List.concat: <A>(List<A>, List<A>) -> List<A>
```

**Description:** Concatenate two lists into a single list.

**Semantics:**
- Returns a new list with all elements from first list followed by all elements from second
- Does not modify either input list
- `concat([], ys)` returns a copy of `ys`
- `concat(xs, [])` returns a copy of `xs`

**Examples:**

```vibefun
List.concat([1, 2], [3, 4])     // [1, 2, 3, 4]
List.concat([], [1, 2])         // [1, 2]
List.concat([1, 2], [])         // [1, 2]
List.concat([], [])             // []
```

**Performance:** O(n) where n is the length of the first list

**Note:** Concatenation is O(n) in the first list because lists are singly-linked. Prefer prepending `[x, ...xs]` when possible (O(1)).

---

### List.flatten

```vibefun
List.flatten: <A>(List<List<A>>) -> List<A>
```

**Description:** Flatten a list of lists into a single list by one level.

**Semantics:**
- Takes a list of lists and concatenates them all
- Only flattens one level (not recursive)
- Preserves order: elements from first inner list, then second, etc.
- Empty outer list returns empty list
- Outer list containing empty lists produces empty result

**Examples:**

```vibefun
List.flatten([[1, 2], [3, 4], [5]])
// [1, 2, 3, 4, 5]

List.flatten([[], [1], [], [2, 3], []])
// [1, 2, 3]

List.flatten([])
// []

// Only flattens one level
List.flatten([[[1, 2]], [[3, 4]]])
// [[1, 2], [3, 4]]  (not [1, 2, 3, 4])
```

**Performance:** O(n*m) where n is the number of inner lists and m is the average length

**Implementation note:** Can be implemented using `foldRight`:

```vibefun
let flatten = (xss) =>
    List.foldRight(xss, [], (xs, acc) => List.concat(xs, acc))
```

---

## Additional Common Operations

These functions are not in the initial standard library but can be implemented using the core functions:

### List.append

```vibefun
// Append element to end (inefficient - O(n))
let append = <A>(xs: List<A>, x: A): List<A> =>
    List.concat(xs, [x])
```

**Note:** Appending to the end of a list is O(n). Prefer prepending `[x, ...xs]` (O(1)) and reversing if needed.

### List.take

```vibefun
// Take first n elements
let rec take = <A>(xs: List<A>, n: Int): List<A> =>
    if n <= 0 then []
    else match xs {
        | [] => []
        | [head, ...tail] => [head, ...take(tail, n - 1)]
    }
```

### List.drop

```vibefun
// Drop first n elements
let rec drop = <A>(xs: List<A>, n: Int): List<A> =>
    if n <= 0 then xs
    else match xs {
        | [] => []
        | [head, ...tail] => drop(tail, n - 1)
    }
```

### List.range

```vibefun
// Create range [start, start+1, ..., end-1]
let rec range = (start: Int, end: Int): List<Int> =>
    if start >= end then []
    else [start, ...range(start + 1, end)]
```

### List.contains

```vibefun
// Check if list contains element (requires equality)
let rec contains = <A>(xs: List<A>, target: A): Bool =>
    match xs {
        | [] => false
        | [head, ...tail] => head == target || contains(tail, target)
    }
```

---

## Edge Cases and Limitations

### Empty List Polymorphism

Due to the value restriction, binding an empty list creates a monomorphic type:

```vibefun
let empty = []  // Type: List<T> where T is a fresh type variable

// First use determines the type
let numbers = [1, ...empty]  // T := Int, empty: List<Int>
let strings = ["hello", ...empty]  // ❌ Error: empty is already List<Int>
```

To maintain polymorphism, use a function:

```vibefun
let empty = <A>(): List<A> => []

// Now each call gets fresh type
let numbers = [1, ...empty()]   // List<Int>
let strings = ["a", ...empty()] // List<String>
```

### Stack Overflow with Deep Recursion

Functions like `foldRight` are not tail recursive and can overflow on large lists:

```vibefun
// May overflow with lists >10,000 elements
let huge = List.range(0, 100000)
List.foldRight(huge, 0, (x, acc) => x + acc)  // ⚠️ Stack overflow risk
```

Use `fold` instead when possible (tail recursive):

```vibefun
// Safe for large lists
List.fold(huge, 0, (acc, x) => acc + x)  // ✅ OK
```

### List Performance Characteristics

| Operation | Time | Note |
|-----------|------|------|
| Prepend `[x, ...xs]` | O(1) | Efficient |
| Append (to end) | O(n) | Inefficient - avoid |
| Head access | O(1) | First element |
| Index access | O(n) | Must traverse |
| Concat | O(n) | n = length of first list |
| Reverse | O(n) | Creates new list |
| Length | O(n) | Not cached |

**Recommendation:** For index-based access, use `Array` instead of `List`.

---

## Examples: Common Patterns

### Mapping multiple transformations

```vibefun
[1, 2, 3, 4]
    |> List.map((x) => x * 2)
    |> List.filter((x) => x > 4)
    |> List.map((x) => x - 1)
// [5, 7]
```

### Building a list with fold

```vibefun
// Double all elements (using fold)
let double = (xs) =>
    List.foldRight(xs, [], (x, acc) => [x * 2, ...acc])
```

### Finding maximum

```vibefun
let max = (xs: List<Int>): Option<Int> =>
    match xs {
        | [] => None
        | [head, ...tail] => Some(
            List.fold(tail, head, (acc, x) => if x > acc then x else acc)
        )
    }
```

### Partitioning

```vibefun
// Partition into (evens, odds)
let partition = (xs: List<Int>): (List<Int>, List<Int>) => {
    let evens = List.filter(xs, (x) => x % 2 == 0)
    let odds = List.filter(xs, (x) => x % 2 != 0)
    (evens, odds)
}
```

---

## See Also

- **[Array Module](./array.md)** - Mutable arrays with O(1) index access
- **[Option Module](./option.md)** - Used by `head` and `tail`
- **[Pattern Matching](../05-pattern-matching/)** - List destructuring
