# Generic Types

### Generics (Parametric Polymorphism)

Generics allow types and functions to be parameterized by type variables.

#### Generic Types

```vibefun
type Box<T> = { value: T };

type Pair<A, B> = { first: A, second: B };

type Either<L, R> = Left(L) | Right(R);
```

#### Generic Functions

```vibefun
let identity: <T>(T) -> T = (x) => x;

let map: <A, B>(List<A>, (A) -> B) -> List<B> = (list, f) => ...;
```

#### Multiple Type Parameters

```vibefun
let zip: <A, B>(List<A>, List<B>) -> List<Pair<A, B>> = ...;
```

