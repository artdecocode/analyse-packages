import _packages from './packages.json'
import { getCachePath, GIT  } from './lib'
import spawn from 'spawncommand'
import bosom from 'bosom'
import { join } from 'path'

;(async () => {
  const info = await bosom('git-cache.json')
  await _packages.reduce(async (acc, name) => {
    await acc
    const to = getCachePath(name, 'commits')
    const gitPath = join(GIT, info[name])
    console.log(gitPath)
    await reset({ gitPath })
    const log = await getLog({ gitPath, name })
    await bosom(to, log, { space: 2 })
    console.log('%s commits for %s', log.length, name)
  }, {})
})()

const reset = async ({ gitPath }) => {
  const { promise } = spawn('git', ['reset', '--hard', 'origin/master'], {
    cwd: gitPath,
  })
  await promise
}
const getLog = async ({ gitPath, name }) => {
  const { promise } = spawn('git', ['log', '--pretty=format:"%h%x09%ad%x09%s"'], {
    cwd: gitPath,
  })
  const { stdout } = await promise
  const commits = stdout.trim().split('\n')
  const c = commits.map((cc) => {
    const [hash, d, subject] = cc.split('\t')
    const date = new Date(d)
    return {
      name,
      hash: hash.replace(/^"/, ''),
      date,
      subject,
    }
  })
  return c
}