/**
 * Minimal Surface-AST pretty printer for property tests.
 *
 * This printer renders any AST shape produced by `ast-arb.ts` as source the
 * parser can accept and re-parse to a structurally equivalent AST. It is **not**
 * a formatter — output may have redundant parentheses, no spacing rules, and
 * no comment preservation. The contract is parser-acceptance and α-equivalent
 * round-trip, nothing more.
 *
 * Rules to keep round-trip safe:
 *   - every `BinOp`, `UnaryOp`, and `App` is wrapped in parentheses, so
 *     precedence-sensitive shape never changes on re-parse;
 *   - `Lambda` is always parenthesized for the same reason (lambdas extend to
 *     end-of-context, which can swallow surrounding tokens otherwise);
 *   - tuple/list/record/match bodies are explicit so semicolon and comma
 *     conventions cannot be misread.
 */

import type {
    BinaryOp,
    Declaration,
    Expr,
    MatchCase,
    Module,
    Pattern,
    RecordField,
    TypeExpr,
    UnaryOp,
} from "../ast.js";

import { renderStringLit } from "./source-arb.js";

const BIN_OP_SYMBOL: Record<BinaryOp, string> = {
    Add: "+",
    Subtract: "-",
    Multiply: "*",
    Divide: "/",
    Modulo: "%",
    Equal: "==",
    NotEqual: "!=",
    LessThan: "<",
    LessEqual: "<=",
    GreaterThan: ">",
    GreaterEqual: ">=",
    LogicalAnd: "&&",
    LogicalOr: "||",
    Concat: "&",
    Cons: "::",
    ForwardCompose: ">>",
    BackwardCompose: "<<",
    RefAssign: ":=",
};

const UNARY_OP_PREFIX: Record<UnaryOp, string> = {
    Negate: "-",
    LogicalNot: "!",
    Deref: "!",
};

function renderNumber(n: number): string {
    if (!Number.isFinite(n)) {
        throw new Error(`Cannot render non-finite number ${String(n)} as a vibefun literal`);
    }
    if (Number.isInteger(n)) {
        return n.toString(10);
    }
    return n.toString();
}

function paren(s: string): string {
    return `(${s})`;
}

export function prettyPrintTypeExpr(t: TypeExpr): string {
    switch (t.kind) {
        case "TypeVar":
        case "TypeConst":
            return t.name;
        case "TypeApp":
            return `${prettyPrintTypeExpr(t.constructor)}<${t.args.map(prettyPrintTypeExpr).join(", ")}>`;
        case "FunctionType": {
            const params =
                t.params.length === 1
                    ? prettyPrintTypeExpr(t.params[0] as TypeExpr)
                    : `(${t.params.map(prettyPrintTypeExpr).join(", ")})`;
            return `(${params} -> ${prettyPrintTypeExpr(t.return_)})`;
        }
        case "TupleType":
            return `(${t.elements.map(prettyPrintTypeExpr).join(", ")})`;
        case "RecordType":
            return `{ ${t.fields.map((f) => `${f.name}: ${prettyPrintTypeExpr(f.typeExpr)}`).join(", ")} }`;
        case "VariantType":
            return t.constructors
                .map((c) => (c.args.length === 0 ? c.name : `${c.name}(${c.args.map(prettyPrintTypeExpr).join(", ")})`))
                .join(" | ");
        case "UnionType":
            return t.types.map(prettyPrintTypeExpr).join(" | ");
        case "StringLiteralType":
            return renderStringLit(t.value);
    }
}

export function prettyPrintPattern(p: Pattern): string {
    switch (p.kind) {
        case "WildcardPattern":
            return "_";
        case "VarPattern":
            return p.name;
        case "LiteralPattern":
            if (p.literal === null) return "()";
            if (typeof p.literal === "string") return renderStringLit(p.literal);
            if (typeof p.literal === "boolean") return p.literal ? "true" : "false";
            return renderNumber(p.literal);
        case "ConstructorPattern":
            return p.args.length === 0
                ? p.constructor
                : `${p.constructor}(${p.args.map(prettyPrintPattern).join(", ")})`;
        case "RecordPattern":
            return `{ ${p.fields.map((f) => `${f.name}: ${prettyPrintPattern(f.pattern)}`).join(", ")} }`;
        case "ListPattern": {
            const head = p.elements.map(prettyPrintPattern).join(", ");
            const rest =
                p.rest === undefined ? "" : `${p.elements.length === 0 ? "" : ", "}...${prettyPrintPattern(p.rest)}`;
            return `[${head}${rest}]`;
        }
        case "OrPattern":
            return paren(p.patterns.map(prettyPrintPattern).join(" | "));
        case "TuplePattern":
            return `(${p.elements.map(prettyPrintPattern).join(", ")})`;
        case "TypeAnnotatedPattern":
            return paren(`${prettyPrintPattern(p.pattern)}: ${prettyPrintTypeExpr(p.typeExpr)}`);
    }
}

function prettyPrintMatchCase(c: MatchCase): string {
    const guard = c.guard === undefined ? "" : ` when ${prettyPrintExpr(c.guard)}`;
    return `| ${prettyPrintPattern(c.pattern)}${guard} => ${prettyPrintExpr(c.body)}`;
}

function prettyPrintRecordField(f: RecordField): string {
    return f.kind === "Field" ? `${f.name}: ${prettyPrintExpr(f.value)}` : `...${prettyPrintExpr(f.expr)}`;
}

export function prettyPrintExpr(e: Expr): string {
    switch (e.kind) {
        case "IntLit":
            return renderNumber(e.value);
        case "FloatLit":
            return renderNumber(e.value);
        case "StringLit":
            return renderStringLit(e.value);
        case "BoolLit":
            return e.value ? "true" : "false";
        case "UnitLit":
            return "()";
        case "Var":
            return e.name;
        case "Let":
            return paren(
                `let ${e.recursive ? "rec " : ""}${e.mutable ? "mut " : ""}${prettyPrintPattern(e.pattern)} = ${prettyPrintExpr(e.value)}; ${prettyPrintExpr(e.body)}`,
            );
        case "Lambda": {
            const params = e.params
                .map((p) => {
                    const pat = prettyPrintPattern(p.pattern);
                    return p.type === undefined ? pat : `${pat}: ${prettyPrintTypeExpr(p.type)}`;
                })
                .join(", ");
            const ret = e.returnType === undefined ? "" : `: ${prettyPrintTypeExpr(e.returnType)}`;
            return paren(`(${params})${ret} => ${prettyPrintExpr(e.body)}`);
        }
        case "App":
            return paren(`${prettyPrintExpr(e.func)}(${e.args.map(prettyPrintExpr).join(", ")})`);
        case "If":
            return paren(
                `if ${prettyPrintExpr(e.condition)} then ${prettyPrintExpr(e.then)} else ${prettyPrintExpr(e.else_)}`,
            );
        case "Match":
            return paren(`match ${prettyPrintExpr(e.expr)} { ${e.cases.map(prettyPrintMatchCase).join(" ")} }`);
        case "Record":
            return e.fields.length === 0 ? "{}" : `{ ${e.fields.map(prettyPrintRecordField).join(", ")} }`;
        case "RecordAccess":
            return paren(`${prettyPrintExpr(e.record)}.${e.field}`);
        case "RecordUpdate":
            return `{ ${prettyPrintExpr(e.record)} | ${e.updates.map(prettyPrintRecordField).join(", ")} }`;
        case "List":
            return `[${e.elements.map((el) => (el.kind === "Element" ? prettyPrintExpr(el.expr) : `...${prettyPrintExpr(el.expr)}`)).join(", ")}]`;
        case "BinOp":
            return paren(`${prettyPrintExpr(e.left)} ${BIN_OP_SYMBOL[e.op]} ${prettyPrintExpr(e.right)}`);
        case "UnaryOp":
            // `Deref` is the postfix `!`. `Negate`/`LogicalNot` are prefix.
            if (e.op === "Deref") {
                return paren(`${prettyPrintExpr(e.expr)}!`);
            }
            return paren(`${UNARY_OP_PREFIX[e.op]}${prettyPrintExpr(e.expr)}`);
        case "Pipe":
            return paren(`${prettyPrintExpr(e.expr)} |> ${prettyPrintExpr(e.func)}`);
        case "Block":
            return `{ ${e.exprs.map(prettyPrintExpr).join("; ")}${e.exprs.length > 0 ? ";" : ""} }`;
        case "TypeAnnotation":
            return paren(`${prettyPrintExpr(e.expr)}: ${prettyPrintTypeExpr(e.typeExpr)}`);
        case "Unsafe":
            return `unsafe { ${prettyPrintExpr(e.expr)} }`;
        case "TryCatch":
            return `try { ${prettyPrintExpr(e.tryBody)} } catch (${e.catchBinder}) { ${prettyPrintExpr(e.catchBody)} }`;
        case "Tuple":
            return `(${e.elements.map(prettyPrintExpr).join(", ")})`;
        case "While":
            return `while ${prettyPrintExpr(e.condition)} { ${prettyPrintExpr(e.body)} }`;
    }
}

export function prettyPrintDeclaration(d: Declaration): string {
    switch (d.kind) {
        case "LetDecl": {
            const prefix = `${d.exported ? "export " : ""}let ${d.recursive ? "rec " : ""}${d.mutable ? "mut " : ""}`;
            return `${prefix}${prettyPrintPattern(d.pattern)} = ${prettyPrintExpr(d.value)}`;
        }
        case "LetRecGroup": {
            const head = `${d.exported ? "export " : ""}let rec `;
            return (
                head +
                d.bindings.map((b) => `${prettyPrintPattern(b.pattern)} = ${prettyPrintExpr(b.value)}`).join(" and ")
            );
        }
        case "TypeDecl": {
            const params = d.params.length === 0 ? "" : `<${d.params.join(", ")}>`;
            const body =
                d.definition.kind === "AliasType"
                    ? prettyPrintTypeExpr(d.definition.typeExpr)
                    : d.definition.kind === "RecordTypeDef"
                      ? `{ ${d.definition.fields.map((f) => `${f.name}: ${prettyPrintTypeExpr(f.typeExpr)}`).join(", ")} }`
                      : d.definition.constructors
                            .map((c) =>
                                c.args.length === 0
                                    ? `| ${c.name}`
                                    : `| ${c.name}(${c.args.map(prettyPrintTypeExpr).join(", ")})`,
                            )
                            .join(" ");
            return `${d.exported ? "export " : ""}type ${d.name}${params} = ${body}`;
        }
        case "ExternalDecl": {
            const tparams =
                d.typeParams === undefined || d.typeParams.length === 0 ? "" : `<${d.typeParams.join(", ")}>`;
            const from = d.from === undefined ? "" : ` from ${renderStringLit(d.from)}`;
            return `${d.exported ? "export " : ""}external ${d.name}${tparams} : ${prettyPrintTypeExpr(d.typeExpr)} = ${renderStringLit(d.jsName)}${from}`;
        }
        case "ExternalTypeDecl":
            return `${d.exported ? "export " : ""}external type ${d.name} = ${prettyPrintTypeExpr(d.typeExpr)}`;
        case "ExternalBlock": {
            const from = d.from === undefined ? "" : ` from ${renderStringLit(d.from)}`;
            const body = d.items
                .map((it) =>
                    it.kind === "ExternalValue"
                        ? `external ${it.name} : ${prettyPrintTypeExpr(it.typeExpr)} = ${renderStringLit(it.jsName)};`
                        : `external type ${it.name} = ${prettyPrintTypeExpr(it.typeExpr)};`,
                )
                .join(" ");
            return `${d.exported ? "export " : ""}external { ${body} }${from}`;
        }
        case "ImportDecl": {
            const items = d.items
                .map((it) => `${it.isType ? "type " : ""}${it.name}${it.alias === undefined ? "" : ` as ${it.alias}`}`)
                .join(", ");
            return `import { ${items} } from ${renderStringLit(d.from)}`;
        }
        case "ReExportDecl": {
            const items =
                d.items === null
                    ? "*"
                    : `{ ${d.items.map((it) => `${it.isType ? "type " : ""}${it.name}${it.alias === undefined ? "" : ` as ${it.alias}`}`).join(", ")} }`;
            return `export ${items} from ${renderStringLit(d.from)}`;
        }
    }
}

export function prettyPrintModule(m: Module): string {
    const imports = m.imports.map((d) => `${prettyPrintDeclaration(d)};`);
    const decls = m.declarations.map((d) => `${prettyPrintDeclaration(d)};`);
    return [...imports, ...decls].join("\n");
}
