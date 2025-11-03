# Math Module

### Math Module

Mathematical functions and constants.

```vibefun
// Constants
Math.pi: Float      // 3.141592653589793
Math.e: Float       // 2.718281828459045

// Trigonometry
Math.sin: (Float) -> Float
Math.cos: (Float) -> Float
Math.tan: (Float) -> Float
Math.asin: (Float) -> Float
Math.acos: (Float) -> Float
Math.atan: (Float) -> Float
Math.atan2: (Float, Float) -> Float

// Exponential and logarithmic
Math.exp: (Float) -> Float      // e^x
Math.log: (Float) -> Float      // Natural logarithm (ln)
Math.log10: (Float) -> Float    // Base-10 logarithm
Math.log2: (Float) -> Float     // Base-2 logarithm
Math.pow: (Float, Float) -> Float
Math.sqrt: (Float) -> Float

// Rounding
Math.round: (Float) -> Float
Math.floor: (Float) -> Float
Math.ceil: (Float) -> Float
Math.trunc: (Float) -> Float    // Remove fractional part

// Utility
Math.abs: (Float) -> Float
Math.sign: (Float) -> Float     // -1, 0, or 1
Math.min: (Float, Float) -> Float
Math.max: (Float, Float) -> Float
Math.random: () -> Float        // Random number in [0, 1)
```

**Note:** `Math.random()` is impure and should be used within `unsafe` blocks for proper effect tracking.

**Example:**
```vibefun
let circleArea = (radius) => Math.pi * Math.pow(radius, 2.0)
let distance = (x, y) => Math.sqrt(Math.pow(x, 2.0) + Math.pow(y, 2.0))

unsafe {
    let randomValue = Math.random()  // Impure operation
}
```

