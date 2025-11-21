import { describe, it, expect } from 'vitest';
import { Parser } from './parser.js';
import { Lexer } from '../lexer/lexer.js';
import type { Expr } from '../types/index.js';

// Helper to parse an expression by wrapping it in a let declaration
function parseExpr(source: string): Expr {
  const wrappedSource = `let test = ${source};`;
  const lexer = new Lexer(wrappedSource, 'test.vf');
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, 'test.vf');
  const module = parser.parse();

  const decl = module.declarations[0];

  if (!decl || decl.kind !== 'LetDecl') {
    throw new Error('Expected LetDecl');
  }

  return decl.value;
}

describe('Lambda Return Type Annotations', () => {
  describe('basic return type syntax', () => {
    it('should parse lambda with return type only', () => {
      const lambda = parseExpr('(x): Int => x + 1');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType).toBeDefined();
      expect(lambda.returnType?.kind).toBe('TypeConst');
      if (lambda.returnType?.kind !== 'TypeConst') return;
      expect(lambda.returnType.name).toBe('Int');
    });

    it('should parse lambda with both parameter and return types', () => {
      const lambda = parseExpr('(x: Int): Int => x + 1');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      // Check parameter type
      expect(lambda.params).toHaveLength(1);
      expect(lambda.params[0]?.type).toBeDefined();
      expect(lambda.params[0]?.type?.kind).toBe('TypeConst');

      // Check return type
      expect(lambda.returnType).toBeDefined();
      expect(lambda.returnType?.kind).toBe('TypeConst');
      if (lambda.returnType?.kind !== 'TypeConst') return;
      expect(lambda.returnType.name).toBe('Int');
    });

    it('should parse lambda with multiple params and return type', () => {
      const lambda = parseExpr('(x: Int, y: String): String => y');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.params).toHaveLength(2);
      expect(lambda.returnType?.kind).toBe('TypeConst');
      if (lambda.returnType?.kind !== 'TypeConst') return;
      expect(lambda.returnType.name).toBe('String');
    });

    it('should parse lambda with no parameter types but return type', () => {
      const lambda = parseExpr('(x, y): Int => x + y');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.params).toHaveLength(2);
      expect(lambda.params[0]?.type).toBeUndefined();
      expect(lambda.params[1]?.type).toBeUndefined();
      expect(lambda.returnType).toBeDefined();
    });
  });

  describe('complex return types', () => {
    it('should parse lambda with Option return type', () => {
      const lambda = parseExpr('(x): Option<Int> => Some(x)');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('TypeApp');
      if (lambda.returnType?.kind !== 'TypeApp') return;
      expect(lambda.returnType.constructor.kind).toBe('TypeConst');
      if (lambda.returnType.constructor.kind !== 'TypeConst') return;
      expect(lambda.returnType.constructor.name).toBe('Option');
    });

    it('should parse lambda with function return type', () => {
      const lambda = parseExpr('(x): (Int) -> Int => (y) => x + y');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('FunctionType');
      if (lambda.returnType?.kind !== 'FunctionType') return;
      expect(lambda.returnType.params).toHaveLength(1);
    });

    it('should parse lambda with Result return type', () => {
      const lambda = parseExpr('(x: Int): Result<Int, String> => Ok(x)');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('TypeApp');
      if (lambda.returnType?.kind !== 'TypeApp') return;
      expect(lambda.returnType.args).toHaveLength(2);
    });

    it('should parse lambda with tuple return type', () => {
      const lambda = parseExpr('(x: Int): (Int, Int) => (x, x * 2)');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType).toBeDefined();
      // Tuple types are represented as TupleType or similar
    });

    it('should parse lambda with record return type', () => {
      const lambda = parseExpr('(name: String): { name: String, age: Int } => { name, age: 42 }');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('RecordType');
      if (lambda.returnType?.kind !== 'RecordType') return;
      expect(lambda.returnType.fields.length).toBeGreaterThan(0);
    });
  });

  describe('with block bodies', () => {
    it('should parse lambda with block body and return type', () => {
      const lambda = parseExpr(`(x: Int): Int => {
        let y = x + 1;
        y;
      }`);

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType).toBeDefined();
      expect(lambda.body.kind).toBe('Block');
    });

    it('should parse lambda with empty block and Unit return type', () => {
      const lambda = parseExpr('(): Unit => {}');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('TypeConst');
      if (lambda.returnType?.kind !== 'TypeConst') return;
      expect(lambda.returnType.name).toBe('Unit');
    });
  });

  describe('in various contexts', () => {
    it('should parse lambda with return type in let binding', () => {
      const wrappedSource = 'let add = (x: Int, y: Int): Int => x + y;';
      const lexer = new Lexer(wrappedSource, 'test.vf');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, 'test.vf');
      const module = parser.parse();

      const decl = module.declarations[0];
      expect(decl?.kind).toBe('LetDecl');
      if (decl?.kind !== 'LetDecl') return;

      expect(decl.value.kind).toBe('Lambda');
      if (decl.value.kind !== 'Lambda') return;
      expect(decl.value.returnType).toBeDefined();
    });

    it('should parse lambda with return type as function argument', () => {
      const callExpr = parseExpr('map(list, (x): Int => x * 2)');

      expect(callExpr.kind).toBe('App');
      if (callExpr.kind !== 'App') return;

      const lambdaArg = callExpr.args[1];
      expect(lambdaArg).toBeDefined();
      if (!lambdaArg) return;
      expect(lambdaArg.kind).toBe('Lambda');
      if (lambdaArg.kind !== 'Lambda') return;
      expect(lambdaArg.returnType).toBeDefined();
    });

    it('should parse nested lambdas with return types', () => {
      const lambda = parseExpr('(x: Int): (Int) -> Int => (y: Int): Int => x + y');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('FunctionType');

      const innerLambda = lambda.body;
      expect(innerLambda.kind).toBe('Lambda');
      if (innerLambda.kind !== 'Lambda') return;
      expect(innerLambda.returnType).toBeDefined();
    });

    it('should parse lambda with return type in match expression', () => {
      const matchExpr = parseExpr(`match x { | Some(v) => ((y: Int): Int => v + y) | None => ((y: Int): Int => y) }`);

      expect(matchExpr.kind).toBe('Match');
      if (matchExpr.kind !== 'Match') return;

      const firstCase = matchExpr.cases[0];
      expect(firstCase).toBeDefined();
      if (!firstCase) return;
      expect(firstCase.body.kind).toBe('Lambda');
      if (firstCase.body.kind !== 'Lambda') return;
      expect(firstCase.body.returnType).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should parse zero-parameter lambda with return type', () => {
      const lambda = parseExpr('(): Int => 42');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.params).toHaveLength(0);
      expect(lambda.returnType).toBeDefined();
    });

    it('should parse lambda with complex nested return type', () => {
      const lambda = parseExpr('(x): Result<Option<Int>, String> => Ok(Some(x))');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      expect(lambda.returnType?.kind).toBe('TypeApp');
    });
  });

  describe('error cases', () => {
    it('should throw on missing return type after colon', () => {
      expect(() => parseExpr('(x): => x')).toThrow();
    });

    it('should throw on invalid return type syntax', () => {
      expect(() => parseExpr('(x): 123 => x')).toThrow();
    });

    it('should throw on colon without closing paren', () => {
      expect(() => parseExpr('(x: Int => x')).toThrow();
    });

    it('should disambiguate from parameter type annotation', () => {
      // This has a parameter type, not a return type
      const lambda = parseExpr('(x: Int) => x');

      expect(lambda.kind).toBe('Lambda');
      if (lambda.kind !== 'Lambda') return;

      // Parameter has type
      expect(lambda.params[0]?.type).toBeDefined();
      // No return type
      expect(lambda.returnType).toBeUndefined();
    });
  });
});
