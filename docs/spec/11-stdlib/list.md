# List Module

### List Module

```vibefun
List.map: <A, B>(List<A>, (A) -> B) -> List<B>
List.filter: <A>(List<A>, (A) -> Bool) -> List<A>
List.fold: <A, B>(List<A>, B, (B, A) -> B) -> B
List.foldRight: <A, B>(List<A>, B, (A, B) -> B) -> B
List.length: <A>(List<A>) -> Int
List.head: <A>(List<A>) -> Option<A>
List.tail: <A>(List<A>) -> Option<List<A>>
List.reverse: <A>(List<A>) -> List<A>
List.concat: <A>(List<A>, List<A>) -> List<A>
List.flatten: <A>(List<List<A>>) -> List<A>
```

