# Array Module

### Array Module

The `Array` type is a mutable, fixed-size or growable array backed by JavaScript arrays. Unlike `List<T>`, arrays support efficient random access and in-place updates.

```vibefun
// Array type (imported from external JavaScript)
type Array<T> = external;

// Construction
Array.make: <T>(Int, T) -> Array<T>           // Create array of size n with default value
Array.fromList: <T>(List<T>) -> Array<T>      // Convert list to array
Array.empty: <T>() -> Array<T>                // Create empty array

// Access
Array.get: <T>(Array<T>, Int) -> Option<T>    // Safe indexed access
Array.set: <T>(Array<T>, Int, T) -> Unit      // Update element at index (mutates!)
Array.length: <T>(Array<T>) -> Int            // Get array length

// Transformation (pure - return new arrays)
Array.map: <A, B>(Array<A>, (A) -> B) -> Array<B>
Array.filter: <A>(Array<A>, (A) -> Bool) -> Array<A>
Array.fold: <A, B>(Array<A>, B, (B, A) -> B) -> B

// Conversion
Array.toList: <T>(Array<T>) -> List<T>        // Convert array to list
Array.slice: <T>(Array<T>, Int, Int) -> Array<T>  // Extract subarray

// Mutation (modifies array in-place)
Array.push: <T>(Array<T>, T) -> Unit          // Append to end
Array.pop: <T>(Array<T>) -> Option<T>         // Remove from end
Array.reverse: <T>(Array<T>) -> Unit          // Reverse in-place
Array.sort: <T>(Array<T>, (T, T) -> Int) -> Unit  // Sort in-place
```

**Safety note:** Array operations that mutate must be used within `unsafe` blocks or with mutable references, as they violate referential transparency.

**Example:**
```vibefun
// Safe: pure operations
let arr = Array.fromList([1, 2, 3, 4, 5]);
let doubled = Array.map(arr, (x) => x * 2);
let total = Array.fold(arr, 0, (acc, x) => acc + x);

// Unsafe: mutation
unsafe {
    let mut arr = Array.make(3, 0);
    Array.set(arr, 0, 10);
    Array.set(arr, 1, 20);
    Array.set(arr, 2, 30);
}
```

