'use strict';

require('mocha');
const assert = require('assert').strict;
const braces = require('..');

const deepAst = depth => {
  let ast = { type: 'text', value: 'a' };
  for (let i = 0; i < depth; i++) {
    ast = { type: 'brace', nodes: [ast] };
  }
  return { type: 'root', nodes: [ast] };
};

describe('options.maxDepth', () => {
  it('limits brace and parenthesis nesting during parsing', () => {
    assert.doesNotThrow(() => braces.parse('{{a,b},c}', { maxDepth: 2 }));
    assert.throws(
      () => braces.parse('{{a,b},c}', { maxDepth: 1 }),
      /Input depth \(2\), exceeds max depth \(1\)/
    );
    assert.doesNotThrow(() => braces.parse('((a))', { maxDepth: 2 }));
    assert.throws(() => braces.parse('((a))', { maxDepth: 1 }), /exceeds max depth/);
  });

  it('requires an explicit non-negative integer', () => {
    assert.throws(() => braces.parse('{a,b}', { maxDepth: 1.5 }), TypeError);
    assert.throws(() => braces.parse('{a,b}', { maxDepth: -1 }), TypeError);
  });

  it('bounds caller-supplied ASTs in every public walker', () => {
    const ast = deepAst(6);
    assert.throws(() => braces.compile(ast, { maxDepth: 5 }), /AST depth/);
    assert.throws(() => braces.expand(ast, { maxDepth: 5 }), /AST depth/);
    assert.throws(() => braces.stringify(ast, { maxDepth: 5 }), /AST depth/);
    assert.doesNotThrow(() => braces.compile(ast, { maxDepth: 6 }));
    assert.doesNotThrow(() => braces.expand(ast, { maxDepth: 6 }));
    assert.doesNotThrow(() => braces.stringify(ast, { maxDepth: 6 }));
  });

  it('keeps fallback stringification at the active AST depth', () => {
    const dollarAst = braces.parse('{a,${b,{c,d}}}');
    assert.throws(() => braces.expand(dollarAst, { maxDepth: 2 }), /AST depth \(3\)/);
    assert.doesNotThrow(() => braces.expand(dollarAst, { maxDepth: 3 }));

    const invalidAst = braces.parse('{a,{b,{c,d}}}');
    const outerBrace = invalidAst.nodes.find(node => node.type === 'brace');
    const invalidSubtree = outerBrace.nodes.find(node => node.type === 'brace');
    invalidSubtree.invalid = true;
    assert.throws(() => braces.expand(invalidAst, { maxDepth: 2 }), /AST depth \(3\)/);
    assert.doesNotThrow(() => braces.expand(invalidAst, { maxDepth: 3 }));

    const rangeAst = braces.parse('{a,{1..10..x}}');
    const rangeBrace = rangeAst.nodes
      .find(node => node.type === 'brace')
      .nodes.find(node => node.type === 'brace');
    rangeBrace.nodes.push({ type: 'brace', nodes: [{ type: 'text', value: 'nested' }] });
    assert.throws(() => braces.expand(rangeAst, { maxDepth: 2 }), /AST depth \(3\)/);
    assert.doesNotThrow(() => braces.expand(rangeAst, { maxDepth: 3 }));
  });

  it('rejects a pathological depth before recursive work grows', () => {
    const pattern = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000);
    assert.throws(() => braces.parse(pattern, { maxDepth: 100 }), /Input depth/);

    const ast = deepAst(5000);
    assert.throws(() => braces.compile(ast, { maxDepth: 100 }), /AST depth/);
    assert.throws(() => braces.expand(ast, { maxDepth: 100 }), /AST depth/);
    assert.throws(() => braces.stringify(ast, { maxDepth: 100 }), /AST depth/);
  });

  it('preserves default and bounded behavior for normal glob patterns', () => {
    const pattern = 'src/**/({a,b})/*.js';
    assert.equal(braces.compile(pattern, { maxDepth: 3 }), braces.compile(pattern));
    assert.deepEqual(braces.expand(pattern, { maxDepth: 3 }), braces.expand(pattern));
    assert.equal(braces.stringify(braces.parse(pattern), { maxDepth: 3 }), pattern);
  });
});
