import _packages from './packages.json'
import bosom from 'bosom'
import spawn from 'spawncommand'
import { getCachePath, gitReset, gitResetVersion, getLines } from './lib'

;(async () => {
  await _packages.reduce(async (acc, c) => {
    await acc
    const path = getCachePath(c, 'info')
    const path2 = getCachePath(c, 'info2')
    const data1 = await bosom(path)
    const data = await bosom(path2)
    // const nr = res.map(({ zoroasterTests = 0, lines: { index = 0, indexComments = 0, source = 0, sourceComments = 0, zoroaster = 0, zoroasterComments = 0 }, ...data }) => {
    //   return {
    //     tests: zoroasterTests,
    //     name: current,
    //     ...data,
    //     lines: {
    //       zoroaster,
    //       zoroasterComments,
    //       src: index || source,
    //       comments: indexComments || sourceComments,
    //     },
    //   }
    // })
    let previous = {
      readme: 0,
      tests: 0,
      lines: {
        zoroaster: 0,
        src: 0,
      },
    }
    const newData = data.map((current, i) => {
      // const prev = i > 0 ? arr[i - 1] :
      const tests = current.tests || previous.tests
      const d = data1[i]
      const src = (d.lines.source || 0) + (d.lines.index || 0)
      const a = {
        ...current,
        testsDelta: tests - previous.tests,
        readmeDelta: current.readme - previous.readme,
        lines: {
          ...current.lines,
          src,
          srcDelta: src - previous.lines.src,
          testDelta: current.lines.zoroaster - previous.lines.zoroaster,
        },
        tests,
      }
      previous = a
      return a
    })
    // const newData = await resetAndExecute(res, getSha)

    await bosom(path2, newData, { space: 2 })
  }, {})
})()

const getSha = async ({ gitPath }) => {
  const { promise } = spawn('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: gitPath,
  })
  const { stdout: sha } = await promise
  return { sha }
}

const getReadme = async (current) => {
  const readme = await getLines(current, 'README.md')
  return { readme }
}

const resetAndExecute = async (data, fn) => {
  const newData = await data.reduce(async (acc, current) => {
    const accRes = await acc
    const hasReset = current.gitHead ? await gitReset(current) : await gitResetVersion(current)

    if (!hasReset) return accRes

    const res = await fn(current)

    const c = {
      ...current,
      ...res,
    }

    return [...accRes, c]
  }, Promise.resolve([]))
  return newData
}