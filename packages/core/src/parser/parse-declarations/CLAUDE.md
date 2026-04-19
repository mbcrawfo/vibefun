# Declaration Parsing Sub-Module

Per-declaration-kind parsers. The dispatcher `index.ts` reads the declaration
keyword and delegates to a focused sub-file.

## Files

- `let.ts` — `parseLetDecl` and the public `validateMutableBinding` helper.
- `type.ts` — `parseTypeDecl`, `parseTypeDefinition`, and the public `parseTypeDeclBody` helper.
- `external.ts` — `parseExternalDeclOrBlock` and its block-item helpers.
- `import-export.ts` — `parseImportDecl` and `parseReExportDecl`.
- `shared-state.ts` — DI forward declarations for `parseExpression`, `parsePattern`,
  `parseTypeExpr`, `parseFunctionType`, plus their `setParseXxx` setters and
  accessor functions. Sub-files import the accessors, not the raw mutable state.
- `index.ts` — `parseDeclaration` dispatcher + re-exports.

## Wiring

`parser.ts` (one level up) wires the DI at load time:

```ts
Declarations.setParseExpression(Expressions.parseExpression);
Declarations.setParsePattern(Patterns.parsePattern);
Declarations.setParseTypeExpr(Types.parseTypeExpr);
Declarations.setParseFunctionType(Types.parseFunctionType);
```

The setters live in `shared-state.ts` and are re-exported through `index.ts`.

## Maintenance

If a new declaration kind is added, add a case to the `switch (keyword)` in
`index.ts` and add the parser to a new sub-file (by kind). When a new sub-file
is added, list it above.
