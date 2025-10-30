/**
 * Desugar type definitions
 */

import type { TypeDefinition } from "../types/ast.js";
import type {
    CoreRecordTypeField,
    CoreTypeDefinition,
    CoreTypeExpr,
    CoreVariantConstructor,
} from "../types/core-ast.js";

export function desugarTypeDefinition(
    typeDef: TypeDefinition,
    desugarTypeExpr: (typeExpr: import("../types/ast.js").TypeExpr) => CoreTypeExpr,
    desugarRecordTypeField: (field: import("../types/ast.js").RecordTypeField) => CoreRecordTypeField,
    desugarVariantConstructor: (ctor: import("../types/ast.js").VariantConstructor) => CoreVariantConstructor,
): CoreTypeDefinition {
    switch (typeDef.kind) {
        case "AliasType":
            return {
                kind: "CoreAliasType",
                typeExpr: desugarTypeExpr(typeDef.typeExpr),
                loc: typeDef.loc,
            };

        case "RecordTypeDef":
            return {
                kind: "CoreRecordTypeDef",
                fields: typeDef.fields.map(desugarRecordTypeField),
                loc: typeDef.loc,
            };

        case "VariantTypeDef":
            return {
                kind: "CoreVariantTypeDef",
                constructors: typeDef.constructors.map(desugarVariantConstructor),
                loc: typeDef.loc,
            };
    }
}
