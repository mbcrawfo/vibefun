/**
 * Desugar type expressions
 */

import type { TypeExpr } from "../types/ast.js";
import type { CoreTypeExpr } from "../types/core-ast.js";

export function desugarTypeExpr(
    typeExpr: TypeExpr,
    desugarRecordTypeField: (
        field: import("../types/ast.js").RecordTypeField,
    ) => import("../types/core-ast.js").CoreRecordTypeField,
    desugarVariantConstructor: (
        ctor: import("../types/ast.js").VariantConstructor,
    ) => import("../types/core-ast.js").CoreVariantConstructor,
): CoreTypeExpr {
    switch (typeExpr.kind) {
        case "TypeVar":
            return {
                kind: "CoreTypeVar",
                name: typeExpr.name,
                loc: typeExpr.loc,
            };

        case "TypeConst":
            return {
                kind: "CoreTypeConst",
                name: typeExpr.name,
                loc: typeExpr.loc,
            };

        case "TypeApp":
            return {
                kind: "CoreTypeApp",
                constructor: desugarTypeExpr(typeExpr.constructor, desugarRecordTypeField, desugarVariantConstructor),
                args: typeExpr.args.map((arg) =>
                    desugarTypeExpr(arg, desugarRecordTypeField, desugarVariantConstructor),
                ),
                loc: typeExpr.loc,
            };

        case "FunctionType":
            return {
                kind: "CoreFunctionType",
                params: typeExpr.params.map((param) =>
                    desugarTypeExpr(param, desugarRecordTypeField, desugarVariantConstructor),
                ),
                return_: desugarTypeExpr(typeExpr.return_, desugarRecordTypeField, desugarVariantConstructor),
                loc: typeExpr.loc,
            };

        case "RecordType":
            return {
                kind: "CoreRecordType",
                fields: typeExpr.fields.map(desugarRecordTypeField),
                loc: typeExpr.loc,
            };

        case "VariantType":
            return {
                kind: "CoreVariantType",
                constructors: typeExpr.constructors.map(desugarVariantConstructor),
                loc: typeExpr.loc,
            };

        case "UnionType":
            return {
                kind: "CoreUnionType",
                types: typeExpr.types.map((type) =>
                    desugarTypeExpr(type, desugarRecordTypeField, desugarVariantConstructor),
                ),
                loc: typeExpr.loc,
            };

        case "TupleType":
            return {
                kind: "CoreTupleType",
                elements: typeExpr.elements.map((element) =>
                    desugarTypeExpr(element, desugarRecordTypeField, desugarVariantConstructor),
                ),
                loc: typeExpr.loc,
            };
    }
}
