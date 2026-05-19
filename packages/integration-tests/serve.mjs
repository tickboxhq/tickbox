// Minimal static server for the vanilla example fixture. No dependency on
// http-server so the package stays at one devDependency (@playwright/test).
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.argv[2] ?? 4173)
const root = fileURLToPath(
  new URL('../../examples/vanilla/uk-pecr-google-analytics/', import.meta.url),
)

createServer(async (req, res) => {
  const rel = (req.url ?? '/').split('?')[0].replace(/^\/+/, '') || 'index.html'
  const file = normalize(join(root, rel))
  if (!file.startsWith(root)) {
    res.statusCode = 403
    res.end('forbidden')
    return
  }
  try {
    const body = await readFile(file)
    res.setHeader(
      'content-type',
      file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain',
    )
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('not found')
  }
}).listen(port, () => console.log(`serving ${root} on :${port}`))
