/**
 * Test-only arbitraries and helpers for property-based parser tests.
 *
 * Excluded from the published `dist/` and from coverage (see the
 * `test-arbitraries` glob in `packages/core/package.json` and the
 * `coverage.exclude` entry in `vitest.config.ts`).
 */

export {
    ALL_OPERATOR_DESCRIPTORS,
    boolLiteralArb,
    floatLiteralArb,
    identifierArb,
    intLiteralArb,
    keywordArb,
    KEYWORD_LIST,
    multiCharOperatorArb,
    MULTI_CHAR_OPERATORS,
    operatorOrPunctuationArb,
    punctuationArb,
    PUNCTUATION_DESCRIPTORS,
    renderStringLiteral,
    renderToken,
    renderTokenStream,
    reservedKeywordArb,
    RESERVED_KEYWORD_LIST,
    singleCharOperatorArb,
    SINGLE_CHAR_OPERATORS,
    stringContentArb,
    tokenArb,
    tokensEquivalent,
    tokenStreamArb,
} from "./token-arb.js";
export type { OperatorDescriptor, OperatorOrPunctuationTokenType } from "./token-arb.js";

export { binaryOpArb, declArb, exprArb, letDeclArb, moduleArb, patternArb, typeExprArb, unaryOpArb } from "./ast-arb.js";
export type { AstArbOptions } from "./ast-arb.js";

export { astEquals } from "./ast-equality.js";

export {
    prettyPrintDeclaration,
    prettyPrintExpr,
    prettyPrintModule,
    prettyPrintPattern,
    prettyPrintTypeExpr,
} from "./ast-pretty.js";

export {
    lowerIdentifierArb,
    nonNegativeFloatArb,
    nonNegativeIntArb,
    renderStringLit,
    safeStringContentArb,
    SYNTHETIC_LOCATION,
    upperIdentifierArb,
} from "./source-arb.js";

export {
    coreBinaryOpArb,
    coreDeclArb,
    coreExprArb,
    coreModuleArb,
    corePatternArb,
    coreTypeExprArb,
    coreUnaryOpArb,
    moduleGraphArb,
    substitutionArb,
} from "./core-ast-arb.js";
export type {
    CoreDeclArbOptions,
    CoreExprArbOptions,
    CoreExprTier,
    CoreModuleArbOptions,
    CorePatternArbOptions,
    CoreTypeExprArbOptions,
    ModuleGraphArbOptions,
    ModuleGraphSpec,
    SubstitutionArbOptions,
} from "./core-ast-arb.js";
export { surfaceBinaryOpArb, surfaceExprArb, surfacePatternArb, surfaceUnaryOpArb } from "./surface-ast-arb.js";
export type { SurfaceExprArbOptions, SurfacePatternArbOptions } from "./surface-ast-arb.js";
