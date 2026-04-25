/**
 * Parser diagnostic codes (VF2xxx)
 *
 * Error codes for the parsing phase.
 *
 * Subcategory allocation:
 * - VF2000-VF2099: Declaration parsing errors
 * - VF2100-VF2199: Expression parsing errors
 * - VF2200-VF2299: Pattern parsing errors
 * - VF2300-VF2399: Type expression parsing errors
 * - VF2400-VF2499: Import/export parsing errors
 * - VF2500-VF2599: General syntax errors
 * - VF2900-VF2999: Parser warnings (reserved)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

import { registry } from "../../registry.js";
import { declarationCodes } from "./declaration.js";
import { expressionCodes } from "./expression.js";
import { generalCodes } from "./general.js";
import { importExportCodes } from "./import-export.js";
import { patternCodes } from "./pattern.js";
import { typeCodes } from "./type.js";

export { VF2000, VF2001, VF2002, VF2003, VF2004, VF2005, VF2006, VF2007, VF2008 } from "./declaration.js";
export {
    VF2100,
    VF2101,
    VF2102,
    VF2103,
    VF2104,
    VF2105,
    VF2106,
    VF2107,
    VF2108,
    VF2109,
    VF2110,
    VF2111,
    VF2112,
    VF2113,
} from "./expression.js";
export { VF2500, VF2501 } from "./general.js";
export { VF2400, VF2401, VF2402, VF2403, VF2404 } from "./import-export.js";
export { VF2200, VF2201, VF2202 } from "./pattern.js";
export { VF2300, VF2301, VF2302, VF2303, VF2304 } from "./type.js";

const parserCodes: readonly DiagnosticDefinition[] = [
    ...declarationCodes,
    ...expressionCodes,
    ...patternCodes,
    ...typeCodes,
    ...importExportCodes,
    ...generalCodes,
];

/**
 * Register all parser diagnostic codes with the global registry.
 */
export function registerParserCodes(): void {
    registry.registerAll(parserCodes);
}
