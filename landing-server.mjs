import http from 'node:http'
import { readFile } from 'node:fs/promises'

const server = http.createServer(async (req, res) => {
  try {
    const html = await readFile(new URL('./landing/index.html', import.meta.url))
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(html)
  } catch {
    res.statusCode = 500
    res.end('error')
  }
})
server.listen(4321, () => console.log('landing on :4321'))
