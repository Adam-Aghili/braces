'use strict';

const utils = require('./utils');

module.exports = (ast, options = {}, startDepth) => {
  const maxDepth = utils.getMaxDepth(options);

  const stringify = (node, parent = {}, depth = 0) => {
    if (node && node.nodes) {
      utils.assertMaxDepth(depth, maxDepth);
    }
    const invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    let output = '';

    if (node.value) {
      if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
        return '\\' + node.value;
      }
      return node.value;
    }

    if (node.value) {
      return node.value;
    }

    if (node.nodes) {
      for (const child of node.nodes) {
        output += stringify(child, undefined, child.nodes ? depth + 1 : depth);
      }
    }
    return output;
  };

  const depth = startDepth === undefined ? (ast.type === 'root' ? 0 : 1) : startDepth;
  return stringify(ast, {}, depth);
};
