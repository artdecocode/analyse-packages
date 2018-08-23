import _packages from './packages.json'
import { readInfo, getLatestInfo } from './lib'
import bosom from 'bosom'

;(async () => {
  // const nodes = _packages.map((id) => {
  //   return { id }
  // })

  const packages = _packages.filter((name) => {
    if (/idio/.test(name)) return false
    if (name == 'koa2-jsx') return false
    if (/vue/.test(name)) return false
    if (/electron/.test(name)) return false
    if (/mnp-structure/.test(name)) return false
    if (/pampipe/.test(name)) return false
    if (/exiftool\.pl/.test(name)) return false
    if (/exiftool\.exe/.test(name)) return false
    return true
  })

  const { p: packs, l: links } = await packages.reduce(async (acc, name) => {
    const { p: currentPacks, l: currentLinks } = await acc

    const info = await readInfo(name)
    const { dependencies = {}, devDependencies = {} } = getLatestInfo(info)
    // console.log(dependencies)

    const p = [
      ...Object.keys(dependencies),
      ...Object.keys(devDependencies),
    ].filter((dep) => {
      return !/(babel|eslint)/.test(dep)
    })
    const l = p
      .map((k) => {
        return { source: name, target: k }
      })

    // const res = { p, l }

    return {
      p: [...currentPacks, ...p],
      l: [...currentLinks, ...l],
    }
  }, { p: packages, l: [] })

  const nodes = packs.filter((p, pos, arr) => {
    return arr.indexOf(p) == pos
  }).map((id) => {
    let group = _packages.indexOf(id) > -1 ? 1 : 2
    if (['zoroaster', 'documentary', 'mnp', 'alamode'].indexOf(id) > -1) group = 3
    return { id, group  }
  })

  const data = {
    nodes,
    links,
  }

  // console.log(JSON.stringify(data, null, 2))

  await bosom('build/packages-data.json', data, { space: 2 })
  // console.log(pp)


  // console.log(links)
})()