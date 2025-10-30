/**
 * Desugar a record type field
 */

import type { RecordTypeField } from "../types/ast.js";
import type { CoreRecordTypeField, CoreTypeExpr } from "../types/core-ast.js";

/**
 * Desugar a record type field
 *
 * @param field - Surface record type field
 * @param desugarTypeExpr - The desugarTypeExpr function (passed to avoid circular dependency)
 * @returns Core record type field
 */
export function desugarRecordTypeField(
    field: RecordTypeField,
    desugarTypeExpr: (typeExpr: import("../types/ast.js").TypeExpr) => CoreTypeExpr,
): CoreRecordTypeField {
    return {
        name: field.name,
        typeExpr: desugarTypeExpr(field.typeExpr),
        loc: field.loc,
    };
}
