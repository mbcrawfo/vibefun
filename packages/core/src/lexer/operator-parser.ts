/**
 * Operator and punctuation parsing for the lexer
 *
 * Handles all operators and punctuation using maximal munch (longest match) algorithm
 */

import type { Token } from "../types/index.js";
import type { Lexer } from "./lexer.js";

import { throwDiagnostic } from "../diagnostics/index.js";

/**
 * Read an operator or punctuation token using maximal munch algorithm
 *
 * The maximal munch (longest match) algorithm ensures that multi-character
 * operators are tokenized correctly. For example, ">>" is tokenized as
 * GT_GT (composition) rather than two separate GT tokens.
 *
 * Operator Precedence Table (by length, checked first to last):
 * - 3-character: ... (SPREAD)
 * - 2-character: == (EQ), != (NEQ), <= (LTE), >= (GTE), |> (PIPE_GT), >> (GT_GT),
 *                 << (LT_LT), -> (ARROW), => (FAT_ARROW), :: (CONS), := (ASSIGN),
 *                 && (AND), || (OR)
 * - 1-character: = (EQUALS), + (PLUS), - (MINUS), * (STAR), / (SLASH), % (PERCENT),
 *                < (LT), > (GT), ! (BANG), & (AMPERSAND), | (PIPE), and punctuation
 *
 * The algorithm checks for longer operators first, consuming them if found.
 * If no multi-character operator matches, it falls back to single-character
 * operators. This ensures "==" is parsed as EQ, not EQUALS followed by EQUALS.
 *
 * @param lexer - The lexer instance
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns A token representing the operator or punctuation
 * @throws {VibefunDiagnostic} If an unrecognized character is encountered
 *
 * @example
 * // ">=" is tokenized as GTE (not GT + EQUALS)
 * // ">>>" would be tokenized as GT_GT + GT (no 3-char >>> operator)
 * // "..." is tokenized as SPREAD (not DOT + DOT + DOT)
 */
export function readOperatorOrPunctuation(lexer: Lexer, hadLeadingWhitespace: boolean): Token {
    const start = lexer.makeLocation();
    const char = lexer.peek();
    const next = lexer.peek(1);
    const next2 = lexer.peek(2);

    const ws = hadLeadingWhitespace ? { hasLeadingWhitespace: true } : {};

    // Three-character operators
    if (char === "." && next === "." && next2 === ".") {
        lexer.advance();
        lexer.advance();
        lexer.advance();
        return { type: "SPREAD", value: "...", loc: start, ...ws };
    }

    // Two-character operators
    if (char === "=" && next === "=") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_EQ", value: "==", loc: start, ...ws };
    }
    if (char === "!" && next === "=") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_NEQ", value: "!=", loc: start, ...ws };
    }
    if (char === "<" && next === "=") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_LTE", value: "<=", loc: start, ...ws };
    }
    if (char === ">" && next === "=") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_GTE", value: ">=", loc: start, ...ws };
    }
    if (char === "|" && next === ">") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_PIPE_GT", value: "|>", loc: start, ...ws };
    }
    if (char === ">" && next === ">") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_GT_GT", value: ">>", loc: start, ...ws };
    }
    if (char === "<" && next === "<") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_LT_LT", value: "<<", loc: start, ...ws };
    }
    if (char === "-" && next === ">") {
        lexer.advance();
        lexer.advance();
        return { type: "ARROW", value: "->", loc: start, ...ws };
    }
    if (char === "=" && next === ">") {
        lexer.advance();
        lexer.advance();
        return { type: "FAT_ARROW", value: "=>", loc: start, ...ws };
    }
    if (char === ":" && next === ":") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_CONS", value: "::", loc: start, ...ws };
    }
    if (char === ":" && next === "=") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_ASSIGN", value: ":=", loc: start, ...ws };
    }
    if (char === "&" && next === "&") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_AND", value: "&&", loc: start, ...ws };
    }
    if (char === "|" && next === "|") {
        lexer.advance();
        lexer.advance();
        return { type: "OP_OR", value: "||", loc: start, ...ws };
    }

    // Single-character operators and punctuation
    lexer.advance();

    switch (char) {
        case "+":
            return { type: "OP_PLUS", value: "+", loc: start, ...ws };
        case "-":
            return { type: "OP_MINUS", value: "-", loc: start, ...ws };
        case "*":
            return { type: "OP_STAR", value: "*", loc: start, ...ws };
        case "/":
            return { type: "OP_SLASH", value: "/", loc: start, ...ws };
        case "%":
            return { type: "OP_PERCENT", value: "%", loc: start, ...ws };
        case "<":
            return { type: "OP_LT", value: "<", loc: start, ...ws };
        case ">":
            return { type: "OP_GT", value: ">", loc: start, ...ws };
        case "=":
            return { type: "OP_EQUALS", value: "=", loc: start, ...ws };
        case "!":
            return { type: "OP_BANG", value: "!", loc: start, ...ws };
        case "(":
            return { type: "LPAREN", value: "(", loc: start, ...ws };
        case ")":
            return { type: "RPAREN", value: ")", loc: start, ...ws };
        case "{":
            return { type: "LBRACE", value: "{", loc: start, ...ws };
        case "}":
            return { type: "RBRACE", value: "}", loc: start, ...ws };
        case "[":
            return { type: "LBRACKET", value: "[", loc: start, ...ws };
        case "]":
            return { type: "RBRACKET", value: "]", loc: start, ...ws };
        case ",":
            return { type: "COMMA", value: ",", loc: start, ...ws };
        case ".":
            return { type: "DOT", value: ".", loc: start, ...ws };
        case ":":
            return { type: "COLON", value: ":", loc: start, ...ws };
        case ";":
            return { type: "SEMICOLON", value: ";", loc: start, ...ws };
        case "|":
            return { type: "PIPE", value: "|", loc: start, ...ws };
        case "&":
            return { type: "OP_AMPERSAND", value: "&", loc: start, ...ws };

        default:
            throwDiagnostic("VF1400", start, { char: char ?? "EOF" });
    }
}
