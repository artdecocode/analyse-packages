import { equal, ok } from 'zoroaster/assert'
import Context from '../context'
import analysePackages from '../../src'

/** @type {Object.<string, (c: Context)>} */
const T = {
  context: Context,
  'is a function'() {
    equal(typeof analysePackages, 'function')
  },
  async 'calls package without error'() {
    await analysePackages()
  },
  async 'gets a link to the fixture'({ FIXTURE }) {
    const res = await analysePackages({
      type: FIXTURE,
    })
    ok(res, FIXTURE)
  },
}

export default T
