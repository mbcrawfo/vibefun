# Pattern Basics

### Match Expressions

```vibefun
match expression {
    | pattern1 => result1
    | pattern2 => result2
    | pattern3 => result3
}
```

### Literal Patterns

```vibefun
let describe = (n) => match n {
    | 0 => "zero"
    | 1 => "one"
    | 2 => "two"
    | _ => "many"
}
```

### Variable Patterns

```vibefun
let identity = (x) => match x {
    | value => value
}
```

### Wildcard Pattern

The underscore `_` matches anything and discards the value.

```vibefun
match option {
    | Some(x) => x
    | _ => 0
}
```

