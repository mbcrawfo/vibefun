# JSON Module

### JSON Module

JSON serialization and deserialization with type-safe handling.

```vibefun
// JSON value representation
type JSON =;
    | JNull
    | JBool(Bool)
    | JNumber(Float)
    | JString(String)
    | JArray(List<JSON>)
    | JObject(Map<String, JSON>)

// Parsing
JSON.parse: (String) -> Result<JSON, String>
JSON.stringify: (JSON) -> String
JSON.stringifyPretty: (JSON, Int) -> String  // With indentation

// Type-safe extraction
JSON.asNull: (JSON) -> Option<Unit>
JSON.asBool: (JSON) -> Option<Bool>
JSON.asNumber: (JSON) -> Option<Float>
JSON.asString: (JSON) -> Option<String>
JSON.asArray: (JSON) -> Option<List<JSON>>
JSON.asObject: (JSON) -> Option<Map<String, JSON>>

// Object field access
JSON.getField: (JSON, String) -> Option<JSON>
JSON.getFieldAs: <T>(JSON, String, (JSON) -> Option<T>) -> Option<T>
```

**Example:**
```vibefun
let parseUserAge = (jsonString) =>
    JSON.parse(jsonString);
    |> Result.flatMap((json) =>
        match JSON.getFieldAs(json, "age", JSON.asNumber) {
            | Some(age) => Ok(Float.toInt(age))
            | None => Err("Missing or invalid age field")
        })

// Usage
match parseUserAge('{"name": "Alice", "age": 30}') {
    | Ok(age) => "Age: " & String.fromInt(age)
    | Err(msg) => "Error: " & msg
}
```

---

