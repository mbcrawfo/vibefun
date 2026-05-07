# Chunk 05 — Lexer real gaps (post-orphan-check)

## Context

The audit's `02-lexical-structure.md` reports 33 testing gaps — the largest cluster of any section. **Pre-plan exploration confirmed many are false positives**: dedicated orphan test files cover several. This chunk closes only the residue that survives an orphan check.

Closes the residue of: 02 F-01, F-03, F-04, F-07, F-08, F-09, F-10, F-13, F-20, F-28, F-30, F-47, F-50.

## Spec under test

- `docs/spec/02-lexical-structure/basic-structure.md` — encoding, line endings, comments, semicolon rules, empty blocks.
- `docs/spec/02-lexical-structure/tokens.md` — number formats (incl. scientific notation, large integers), unit literal `()`, keyword-as-field-name allowance.
- `docs/spec/02-lexical-structure/operators.md` — unary minus context-dependence.

## Pre-flight orphan check (CRITICAL — most "untested" 02 entries are false positives)

| F-NN | Audit claim | Confirmed orphan coverage | Status |
|---|---|---|---|
| F-02 NFC normalization | untested | `lexer/unicode-normalization.test.ts` (230 lines) | **CLOSE BY CITATION**, no new test |
| F-12 reserved keywords | 5 of 8 missing | `lexer/reserved-keywords.test.ts` covers all 8 | **CLOSE BY CITATION** |
| F-31 `==` vs two `=` | untested | `lexer/operators-edge-cases.test.ts` | **CLOSE BY CITATION** |
| F-35/F-36/F-41 longest-match | untested | `lexer/operators-multi-char.test.ts`, `operators-edge-cases.test.ts` | **CLOSE BY CITATION** |
| F-42/F-43/F-44 number errors | untested | `lexer/numbers-formats.test.ts`, `numbers-edge-cases.test.ts` | **CLOSE BY CITATION** unless specific scientific-notation cases (F-43 `1e`, `1e+`) absent — verify |

For each gap below, **first grep the lexer test files**. If covered, document in PR description and skip.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

After orphan check, the genuinely missing tests are:

1. **`packages/core/src/lexer/encoding.test.ts`** (new — small) — Layer: U.
   - F-01: feed lexer a UTF-8 BOM-prefixed source (`﻿` + valid program). Assert BOM is consumed and tokens equal the un-BOM'd version.
2. **`packages/core/src/lexer/line-endings.test.ts`** (new) — Layer: U + I.
   - F-03: lex `let x = 1;\r\nlet y = 2;` and assert only one logical newline is recognised between the two `let`s (i.e., CRLF collapses).
3. **`packages/core/src/lexer/comments.test.ts`** (extend if not already covered) — Layer: U.
   - F-04 edges: `// ` (empty content), `// comment with EOF` (no trailing newline), `// !@#$%^&*()` (special chars). Assert no tokens emitted from comment body and the rest of source still tokenises.
4. **`packages/core/src/lexer/lexer-integration-syntax.test.ts`** (extend) — Layer: I.
   - F-07: lex `1 +\n2\n* 3` and assert resulting AST equals single-line `1 + 2 * 3` (compare token streams modulo newlines). The audit's [I, V] tag means add an integration test here; the V-layer counterpart is chunk 06.
   - F-09: multi-line list `[1,\n2,\n3]` — assert only outer-LBRACKET/inner-comma tokens, no SEMICOLONs between elements.
5. **`packages/core/src/lexer/lexer.test.ts`** (extend) — Layer: U.
   - F-08: lex `;` standalone and assert single SEMICOLON token. Trivial.
   - F-10: lex `{}` and assert LBRACE, RBRACE, EOF only.
   - F-13: lex `{ type: 1 }` and assert KEYWORD(type), COLON, NUMBER, ... — keyword tokens valid as field names (the parser later disambiguates).
   - F-28: lex `()` standalone and assert LPAREN, RPAREN (or whatever Unit literal token shape the lexer currently uses; verify before asserting).
   - F-30: lex `-5` then `1-5` and assert the `-` token's role is identical (lexer doesn't disambiguate; parser does — assert the tokens match in both inputs).
6. **`packages/core/src/lexer/numbers-formats.test.ts`** (extend if not already covered) — Layer: U.
   - F-20: lex `1e010` and assert numeric value equals 10^10 (no leading-zero exponent rejection).
   - F-47: large integer property test — for `n` in `[2^53, 2^53+10000]`, lex `n.toString()` and assert it parses without throwing. Document precision-loss expectation in test description (per spec, integers above MAX_SAFE_INTEGER are best-effort). Layer: P.
7. **`packages/core/src/lexer/strings.test.ts`** (extend if not already covered) — Layer: U.
   - F-50: lex `"foo\nbar"` (literal newline inside un-tripled `"..."`) and assert error code VF1001.

## Behavior expectations (for bug-triage)

- F-01 BOM: spec is silent on BOM-handling; if the lexer rejects, the test should match. **Read the lexer code first** to determine current behaviour, then assert it; spec gap goes to docs.
- F-30 unary minus: lexer should produce identical OP_MINUS tokens regardless of context. If the lexer flags one as "unary" and the other as "binary", that's parser concern leaking — file a bug.
- F-47 large int: spec at `02-lexical-structure/tokens.md` allows lossy round-trip but forbids crash. If property test crashes for any input, file a Tier 2 fast-check bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For F-47 property: `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- F-02, F-12, F-29, F-31–F-39, F-41, F-42, F-44 — covered by orphan tests; cite, don't duplicate.
- V-layer spec-validation cases — chunk 06.
- Lexer-level VFxxxx factory tests — not in audit scope (lexer codes are in the structurally-tested set).
