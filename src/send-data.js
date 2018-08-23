import { Client } from 'elasticsearch'
import bosom from 'bosom'
import _packages from './packages.json'
import { getCachePath } from './lib'

;(async () => {
  await sendData(_packages)
})()

async function sendData (packages) {
  const client = new Client({
    host: '35.178.167.18:9200',
  })

  await packages.reduce(async (acc, current) => {
    await acc
    await sendRelease(client, current)
  }, Promise.resolve())
}

const sendRelease = async (client, current) => {
  const path2 = getCachePath(current, 'info2')
  const res = await bosom(path2)
  await Promise.all(res.map(async ({ sha: id, ...body }) => {
    try {
      const c = await client.create({
        index: 'releases',
        type: 'release',
        body,
        id,
      })
      process.stdout.write('.')
      return c
    } catch (err) {
      console.warn(err)
    }
    process.stdout.write('\n')
  }))
}
