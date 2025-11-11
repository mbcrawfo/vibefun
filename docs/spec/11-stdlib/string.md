# String Module

The `String` module provides operations for working with text. Strings are immutable sequences of Unicode characters.

## Core Type

Strings are primitive values in Vibefun:
- Immutable
- Unicode-aware
- String concatenation uses the `&` operator

## String Operations

### String.length
```vibefun
String.length: (String) -> Int
```
**Description:** Return the number of characters in the string (Unicode code points, not bytes).

**Examples:**
```vibefun
String.length("hello");  // 5
String.length("");  // 0
String.length("🎉");  // 1 (one Unicode character)
```

---

### String.concat
```vibefun
String.concat: (String, String) -> String
```
**Description:** Concatenate two strings. The infix operator `&` is an alias for this function.

**Examples:**
```vibefun
String.concat("hello", " world");  // "hello world"
"hello" & " world";  // "hello world" (using operator)
```

---

### String.toUpperCase
```vibefun
String.toUpperCase: (String) -> String
```
**Description:** Convert all characters to uppercase according to Unicode rules.

**Examples:**
```vibefun
String.toUpperCase("hello");  // "HELLO"
String.toUpperCase("Café");  // "CAFÉ"
```

---

### String.toLowerCase
```vibefun
String.toLowerCase: (String) -> String
```
**Description:** Convert all characters to lowercase according to Unicode rules.

**Examples:**
```vibefun
String.toLowerCase("HELLO");  // "hello"
String.toLowerCase("Café");  // "café"
```

---

### String.trim
```vibefun
String.trim: (String) -> String
```
**Description:** Remove leading and trailing whitespace from the string.

**Examples:**
```vibefun
String.trim("  hello  ");  // "hello"
String.trim("\n\ttext\n");  // "text"
String.trim("no-trim");  // "no-trim"
```

---

### String.split
```vibefun
String.split: (String, String) -> List<String>
```
**Description:** Split a string into a list of substrings using a separator.

**Examples:**
```vibefun
String.split("a,b,c", ",");  // ["a", "b", "c"]
String.split("hello world", " ");  // ["hello", "world"]
String.split("no-separator", ",");  // ["no-separator"]
```

---

### String.contains
```vibefun
String.contains: (String, String) -> Bool
```
**Description:** Check if a string contains a substring.

**Examples:**
```vibefun
String.contains("hello world", "world");  // true
String.contains("hello", "bye");  // false
String.contains("", "");  // true
```

---

### String.startsWith
```vibefun
String.startsWith: (String, String) -> Bool
```
**Description:** Check if a string starts with a given prefix.

**Examples:**
```vibefun
String.startsWith("hello world", "hello");  // true
String.startsWith("hello", "world");  // false
```

---

### String.endsWith
```vibefun
String.endsWith: (String, String) -> Bool
```
**Description:** Check if a string ends with a given suffix.

**Examples:**
```vibefun
String.endsWith("hello world", "world");  // true
String.endsWith("hello", "world");  // false
```

---

## Conversion Functions

### String.fromInt
```vibefun
String.fromInt: (Int) -> String
```
**Description:** Convert an integer to its string representation.

**Examples:**
```vibefun
String.fromInt(42);  // "42"
String.fromInt(-10);  // "-10"
String.fromInt(0);  // "0"
```

---

### String.fromFloat
```vibefun
String.fromFloat: (Float) -> String
```
**Description:** Convert a float to its string representation.

**Examples:**
```vibefun
String.fromFloat(3.14);  // "3.14"
String.fromFloat(-2.5);  // "-2.5"
String.fromFloat(1.0);  // "1"
```

---

### String.toInt
```vibefun
String.toInt: (String) -> Option<Int>
```
**Description:** Parse a string as an integer. Returns `None` if the string is not a valid integer.

**Examples:**
```vibefun
String.toInt("42");  // Some(42)
String.toInt("-10");  // Some(-10)
String.toInt("3.14");  // None (not an integer)
String.toInt("hello");  // None (not a number)
```

---

### String.toFloat
```vibefun
String.toFloat: (String) -> Option<Float>
```
**Description:** Parse a string as a float. Returns `None` if the string is not a valid number.

**Examples:**
```vibefun
String.toFloat("3.14");  // Some(3.14)
String.toFloat("42");  // Some(42.0)
String.toFloat("-2.5");  // Some(-2.5)
String.toFloat("hello");  // None (not a number)
```

---

## Common Patterns

### String Building
```vibefun
// Concatenate multiple strings
let greeting = "Hello" & ", " & "world" & "!";

// Build from list
let joined = List.fold(["a", "b", "c"], "", (acc, s) =>
    if acc == "" then s else acc & "," & s;
)
// "a,b,c"
```

### String Processing Pipeline
```vibefun
let process = (input: String): String =>
    input;
        |> String.trim
        |> String.toLowerCase
        |> String.split(",")
        |> List.map(String.trim)
        |> List.fold("", (acc, s) => if acc == "" then s else acc & ";" & s)
```

---

## Performance Notes

- String concatenation with `&` is O(n+m) where n and m are the lengths of the strings
- For building strings from many parts, consider accumulating in a list and joining at the end
- String operations create new strings (strings are immutable)

---

## See Also

- **[Operators](../02-lexical-structure/operators.md)** - String concatenation operator `&`
- **[Option Module](./option.md)** - Used by parsing functions
- **[Numeric Modules](./numeric.md)** - Int and Float conversions
