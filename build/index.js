"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = analysePackages;

var _util = require("util");

const LOG = (0, _util.debuglog)('analyse-packages');
/**
 * Analyse Node.js packages.
 * @param {Config} config Configuration object.
 * @param {string} config.type The type.
 */

async function analysePackages(config = {}) {
  const {
    type
  } = config;
  LOG('analyse-packages called with %s', type);
  return type;
}
/**
 * @typedef {Object} Config
 * @property {string} type The type.
 */
//# sourceMappingURL=index.js.map