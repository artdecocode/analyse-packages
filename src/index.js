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
  await packages.reduce(async (acc, current) => {
    await acc
    const cp = getCachePath(current, 'info')
    try {
      await bosom(cp)
      return
    } catch (err) {/**/}
    const res = await getPackageInfo(gitDirs, current)
    await bosom(cp, res, { space: 2 })
  }, {})
}

const getPackageInfo = async (gitDirs, name) => {
  const dir = gitDirs[name]
  const gitPath = join(GIT, dir)
  console.log('* %s *', dir)

  const { versions, readme } = await readInfo(name)

  const { length: readmeLength } = readme.split('\n')

  const vv = Object.keys(versions).map((version) => {
    const {
      name: n,
      gitHead,
      scripts: { test } = {},
      dependencies: deps = {},
      devDependencies: devDeps = {},
    } = versions[version]
    const tag = `v${version}`
    const hasTests = n == 'zoroaster' || /zoroaster/.test(test)
    return {
      version, gitHead, tag, gitPath, name, hasTests, deps, devDeps, readmeLength,
    }
  })
  // console.log(vv)
  let prevDeps = {}, prevDevDeps = {}
  const result = await vv.reduce(async (acc, { deps, devDeps, hasTests, ...current }) => {
    const res = await acc
    const hasReset = current.gitHead ? await gitReset(current) : await gitResetVersion(current)
    if (!hasReset) return res

    const date = await gitDate(current)
    let zoroasterTests,
      zoroasterTestLines,
      zoroasterTestComments
    if (hasTests) {
      if (!isEqual(deps, prevDeps) || !isEqual(devDeps, prevDevDeps)) {
        await yarn(current)
        prevDeps = deps
        prevDevDeps = devDeps
      }
      zoroasterTests = await getTests(current)
      ;({
        lines: zoroasterTestLines,
        comments: zoroasterTestComments,
      } = await getLines(current, 'test/spec'))
    }
    const { lines: sl, comments: sc } = await getLines(current, 'src')
    const { lines: il, comments: ic } = await getLines(current, 'index.js')
    const { lines: stl, comments: stc } = await getLines(current, 'index.js')

    // printLines('zoroaster test lines', zoroasterTestLines, zoroasterTestComments)
    // printLines('test lines', testLines, testComments)
    // printLines('source lines', sl, sc)
    // printLines('index lines', il, ic)
    // printLines('structure lines', stl, stc)

    const currentRes = {
      ...current,
      date,
      zoroasterTests,
      lines: {
        zoroaster: zoroasterTestLines,
        zoroasterComments: zoroasterTestComments,
        // test: testLines,
        // testComments,
        source: sl,
        sourceComments: sc,
        index: il,
        indexComments: ic,
        structure: stl,
        structureComments: stc,
      },
    }
    return [...res, currentRes]
  }, [])

  return result
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

const getTests = async ({ gitPath, name, retries = 0 }) => {
  const { promise } = spawn('zoroaster', ['test/spec', '-a'], {
    cwd: gitPath,
    env: {
      ...process.env,
      ZOROASTER_SKIP: 1,
      // DEBUG: 1,
    },
  })
  const { stdout, stderr } = await promise
  const res = /Executed (\d+)/.exec(stdout)
  if (!res) {
    console.warn(`[!] Could not get number of tests for ${name}. ${stdout || stderr}`)
    const m = /Cannot find module '(.+)'/.exec(stderr)
    if (m && retries < 1) {
      const [, mod] = m
      await tryInstallMod({ gitPath }, mod)
      const r = await getTests({ gitPath, name, retries: 1 })
      if (!r) {
        console.warn('Could not run tests after installing module.')
      } else {
        console.warn('Successfully fixed missing dependency.')
      }
      return r
    }
    return
  }
  const [, n] = res
  return parseInt(n)
}

const tryInstallMod = async ({ gitPath }, mod) => {
  console.log('[i] installing %s', mod)
  const { promise } = spawn('yarn', ['add', mod], {
    cwd: gitPath,
  })
  await promise
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
  console.log(' v%s (%s)', version, gitHead )
  const { promise } = spawn('git', ['reset', '--hard', gitHead], {
    cwd: gitPath,
  })
  const { stdout, stderr } = await promise
  if (stdout.startsWith('HEAD is now')) {
    return true
  }
  console.warn('[!] %s', stdout || stderr)
  const r = await gitResetVersion({ gitHead, gitPath, version, name })
  if (r) return true
  return false
}

const gitResetVersion = async ({ gitPath, version }) => {
  console.log(' v%s ', version )
  const { promise } = spawn('git', ['reset', '--hard', `v${version}`], {
    cwd: gitPath,
  })
  const { stdout, stderr } = await promise
  if (stdout.startsWith('HEAD is now')) {
    return true
  }
  console.warn('[!] %s', stdout || stderr)
  return false
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
