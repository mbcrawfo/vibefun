# Result Module

### Result Module

```vibefun
Result.map: <T, E, U>(Result<T, E>, (T) -> U) -> Result<U, E>
Result.mapErr: <T, E, F>(Result<T, E>, (E) -> F) -> Result<T, F>
Result.flatMap: <T, E, U>(Result<T, E>, (T) -> Result<U, E>) -> Result<U, E>
Result.isOk: <T, E>(Result<T, E>) -> Bool
Result.isErr: <T, E>(Result<T, E>) -> Bool
Result.unwrap: <T, E>(Result<T, E>) -> T  // Panics on Err
Result.unwrapOr: <T, E>(Result<T, E>, T) -> T
```

