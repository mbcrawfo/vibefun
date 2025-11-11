# Collection Modules

### Map Module

The `Map` type provides efficient key-value storage with immutable operations.

```vibefun
type Map<K, V> = external;

// Construction
Map.empty: <K, V>() -> Map<K, V>
Map.fromList: <K, V>(List<(K, V)>) -> Map<K, V>

// Access
Map.get: <K, V>(Map<K, V>, K) -> Option<V>
Map.has: <K, V>(Map<K, V>, K) -> Bool
Map.size: <K, V>(Map<K, V>) -> Int

// Modification (returns new map)
Map.set: <K, V>(Map<K, V>, K, V) -> Map<K, V>
Map.delete: <K, V>(Map<K, V>, K) -> Map<K, V>
Map.update: <K, V>(Map<K, V>, K, (Option<V>) -> Option<V>) -> Map<K, V>

// Transformation
Map.map: <K, A, B>(Map<K, A>, (A) -> B) -> Map<K, B>
Map.filter: <K, V>(Map<K, V>, (K, V) -> Bool) -> Map<K, V>
Map.fold: <K, V, A>(Map<K, V>, A, (A, K, V) -> A) -> A

// Conversion
Map.keys: <K, V>(Map<K, V>) -> List<K>
Map.values: <K, V>(Map<K, V>) -> List<V>
Map.toList: <K, V>(Map<K, V>) -> List<(K, V)>
```

**Example:**
```vibefun
let scores = Map.empty();
    |> Map.set("Alice", 95)
    |> Map.set("Bob", 87)
    |> Map.set("Charlie", 92)

match Map.get(scores, "Alice") {
    | Some(score) => "Alice scored " & String.fromInt(score)
    | None => "Alice not found"
}
```

### Set Module

The `Set` type provides efficient membership testing with immutable operations.

```vibefun
type Set<T> = external;

// Construction
Set.empty: <T>() -> Set<T>
Set.fromList: <T>(List<T>) -> Set<T>
Set.singleton: <T>(T) -> Set<T>

// Access
Set.has: <T>(Set<T>, T) -> Bool
Set.size: <T>(Set<T>) -> Int
Set.isEmpty: <T>(Set<T>) -> Bool

// Modification (returns new set)
Set.add: <T>(Set<T>, T) -> Set<T>
Set.delete: <T>(Set<T>, T) -> Set<T>

// Set operations
Set.union: <T>(Set<T>, Set<T>) -> Set<T>
Set.intersect: <T>(Set<T>, Set<T>) -> Set<T>
Set.diff: <T>(Set<T>, Set<T>) -> Set<T>
Set.isSubset: <T>(Set<T>, Set<T>) -> Bool

// Transformation
Set.filter: <T>(Set<T>, (T) -> Bool) -> Set<T>
Set.fold: <T, A>(Set<T>, A, (A, T) -> A) -> A

// Conversion
Set.toList: <T>(Set<T>) -> List<T>
```

**Example:**
```vibefun
let evens = Set.fromList([2, 4, 6, 8, 10]);
let primes = Set.fromList([2, 3, 5, 7, 11]);

let evenPrimes = Set.intersect(evens, primes);  // {2}
let allNumbers = Set.union(evens, primes);  // {2, 3, 4, 5, 6, 7, 8, 10, 11}
```

