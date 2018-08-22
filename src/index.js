import { debuglog } from 'util'

const LOG = debuglog('analyse-packages')

/**
 * Analyse Node.js packages.
 * @param {Config} config Configuration object.
 * @param {string} config.type The type.
 */
export default async function analysePackages(config = {}) {
  const {
    type,
  } = config
  LOG('analyse-packages called with %s', type)
  return type
}

/**
 * @typedef {Object} Config
 * @property {string} type The type.
 */
