import _packages from './packages.json'
import bosom from 'bosom'
import { GIT_CACHE, getCachePath, readInfo, GIT } from './lib'
import spawn from 'spawncommand'
import { join } from 'path'
import { Replaceable } from 'restream'
import Pedantry from 'pedantry'
import { lstatSync, createReadStream } from 'fs'
import Catchment from 'catchment'
import { deepEqual } from 'zoroaster/assert'

const isEqual = (a, b) => {
  try {
    deepEqual(a, b)
    return true
  } catch ({ message }) {
    console.log(message.split('\n').filter(l => /[+-]/.test(l)).filter(l => !l.startsWith('{')).join('\n'))
    return false
  }
}
/**
 * Analyse Node.js packages.
 * @param {Config} config Configuration object.
 * @param {string} config.type The type.
 */
export default async function analysePackages(config = {}) {
  const {
    packages,
  } = config
  console.log('Total: %s', packages.length)

  const gitDirs = await bosom(GIT_CACHE)
  const name = packages[0]
  const dir = gitDirs[name]
  const gitPath = join(GIT, dir)
  console.log(dir)
  // const path = getCachePath(p)
  const { versions } = await readInfo(name)
  const vv = Object.keys(versions).map((version) => {
    const {
      gitHead,
      scripts: { test } = {},
      dependencies: deps = {},
      devDependencies: devDeps = {},
    } = versions[version]
    const tag = `v${version}`
    const hasTests = /zoroaster/.test(test)
    return {
      version, gitHead, tag, gitPath, name, hasTests, deps, devDeps,
    }
  })
  // console.log(vv)
  let prevDeps = {}, prevDevDeps = {}
  await vv.reduce(async (acc, { deps, devDeps, hasTests, ...current }) => {
    const res = await acc
    await gitReset(current)
    const date = await gitDate(current)
    let zoroasterTests = 0,
      zoroasterTestLines = 0,
      zoroasterTestComments = 0,
      testLines = 0,
      testComments = 0
    if (hasTests) {
      if (!isEqual(deps, prevDeps) || !isEqual(devDeps, prevDevDeps)) {
        await yarn(current)
        prevDeps = deps
        prevDevDeps = devDeps
      } else {
        console.log('dependencies are the same')
      }
      zoroasterTests = await getTests(current)
      ;({
        lines: zoroasterTestLines,
        comments: zoroasterTestComments,
      } = await getLines(current, 'test/spec'))
    } else {
      ({ lines: testLines, comments: testComments } = await getLines(current, 'test/spec'))
    }
    const { lines: sl, comments: sc } = await getLines(current, 'src')
    const { lines: il, comments: ic } = await getLines(current, 'index.js')

    printLines('zoroaster test lines', zoroasterTestLines, zoroasterTestComments)
    printLines('test lines', testLines, testComments)
    printLines('source lines', sl, sc)
    printLines('index lines', il, ic)

    return [...res, {
      ...current,
      date,
    }]
  }, [])
}

const printLines = (type, lines, comments) => {
  if (!lines && !comments) return
  const s = comments ? ` (${comments } comments)` : ''
  console.log('%s: %s %s', type, lines, s)
}

const getLines = async ({ gitPath }, path) => {
  const p = join(gitPath, path)
  let source
  try {
    source = lstatSync(p)
  } catch (err) {
    return {}
  }
  const replaceable = new Replaceable([
    {
      re: /\/\*(?:[\s\S]+?)\*\//gm,
      replacement(match) {
        this.comments += match.split('\n').length
        return ''
      },
    },
  ])
  replaceable.comments = 0

  const catchment = new Catchment()

  if (source.isDirectory()) {
    const pedantry = new Pedantry(p)
    pedantry.pipe(replaceable).pipe(catchment)
  } else if (source.isFile()) {
    const rs = createReadStream(p)
    rs.pipe(replaceable).pipe(catchment)
  } else {
    return {}
  }

  const res = await catchment.promise
  const lines = res.split('\n').length
  return {
    lines,
    comments: replaceable.comments,
  }
}

const yarn = async ({ gitPath }) => {
  const { promise } = spawn('yarn', [], {
    cwd: gitPath,
    // stdio: 'inherit',
  })
  await promise
}

const getTests = async ({ gitPath, name }) => {
  const { promise } = spawn('zoroaster', ['test/spec'], {
    cwd: gitPath,
    env: {
      ...process.env,
      ZOROASTER_SKIP: 1,
    },
  })
  const { stdout, stderr } = await promise
  const res = /Executed (\d+)/.exec(stdout)
  if (!res) {
    console.warn(`Could not get number of tests for ${name}: ${stdout}, ${stderr}`)
    return
  }
  const [, n] = res
  return n
}

const gitDate = async ({ gitPath }) => {
  const { promise } = spawn('git', ['log', '-1', '--format=%cd'], {
    cwd: gitPath,
  })
  const { stdout } = await promise
  const d = new Date(stdout)
  return d
}

const gitReset = async ({ gitHead, gitPath, version, name }) => {
  console.log('Resetting %s:%s (%s)', name, version, gitHead )
  const { promise } = spawn('git', ['reset', '--hard', gitHead], {
    cwd: gitPath,
  })
  const { stdout } = await promise
  if (!stdout.startsWith('HEAD is now')) throw new Error(stdout)
}

(async () => {
  try {
    await analysePackages({
      packages: _packages,
    })
  } catch ({ stack }) {
    console.log(stack)
  }
})()

/**
 * @typedef {Object} Config
 * @property {string} type The type.
 */
