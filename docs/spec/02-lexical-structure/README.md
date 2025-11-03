# Lexical Structure

This section defines how Vibefun source code is tokenized and lexically analyzed.

## Contents

1. **[Basic Structure](./basic-structure.md)** - Source files, comments, whitespace, and semicolon insertion rules
2. **[Tokens](./tokens.md)** - Keywords, identifiers, and literals
3. **[Operators](./operators.md)** - Operators, punctuation, and lexical edge cases

## Overview

Vibefun source files use the `.vf` extension and are encoded in UTF-8. The lexer performs tokenization with support for:
- Single-line (`//`) and nested multi-line (`/* */`) comments
- Automatic semicolon insertion (ASI) similar to JavaScript
- Unicode identifiers with NFC normalization
- Rich literal syntax (integers, floats, strings, booleans, unit)
- Comprehensive operator set for functional programming
