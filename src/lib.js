import bosom from 'bosom'
import spawn from 'spawncommand'
import aqt from '@rqt/aqt'
import { join } from 'path'
import { debuglog } from 'util'

const LOG = debuglog('analyse-packages')

const CACHE = 'cache'
export const GIT = '../../analyse-packages'

export const GIT_CACHE = 'git-cache.json'

const REGISTRY = 'https://registry.npmjs.org/'

export const cloneAll = async (packages) => {
  await packages.reduce(async (acc, current, i) => {
    await acc
    const n = getCachePath(current)
    console.log('[%s] Cloning %s (%s)', i, current, n)
    const c = await bosom(GIT_CACHE)
    if (current in c) return acc
    const info = await readInfo(current)
    const repo = getRepoUrl(info)
    const dir = await clone(repo)
    await bosom(GIT_CACHE, { ...c, [current]: dir }, { space: 2 })
  }, Promise.resolve())
}

export const getCachePath = (name) => {
  const n = `${name}.json`.replace(/[@/]/g, '_')
  const path = join(CACHE, n)
  return path
}

const getLatestInfo = (info) => {
  const { versions } = info
  const v = Object.keys(versions)
  const latest = v[v.length - 1]
  const i = versions[latest]
  return i
}

const getRepoUrl = (info) => {
  const i = getLatestInfo(info)
  const repo = getRepo(i)
  return repo
}

const getRepo = (info) => {
  try {
    const { repository: { url } } = info
    const res = url.replace(/^git\+/, '')
    return res
  } catch (err) {
    throw new Error(`${info.name} does not appear to have a repository.`)
  }
}


export const readInfo = async (name) => {
  const n = getCachePath(name)
  const res = await bosom(n)
  return res
}

export const download = async (packages, force) => {
  await packages.reduce(async (acc, current, i) => {
    const accRes = await acc
    const path = getCachePath(current)
    console.log('[%s] Downloading %s', i, current)
    if (!force)
    {
      try {
        const res = await bosom(path)
        return [...acc, res]
      } catch (err) { /**/ }
    }
    const encoded = encodeURIComponent(current)
    const url = `${REGISTRY}${encoded}`
    const { body } = await aqt(url)
    await bosom(path, body, { space: 2 })
    return [...accRes, body]
  }, Promise.resolve([]))
}

const clone = async (url) => {
  const { promise } = spawn('git', ['clone', url], {
    cwd: GIT,
  })
  const { stderr } = await promise
  const res = /Cloning into '(.+?)'/.exec(stderr)
  if (!res) throw new Error(stderr)
  const [, dir] = res
  return dir
}