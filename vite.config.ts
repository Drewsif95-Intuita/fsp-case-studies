import { spawn } from 'node:child_process'
import { createReadStream, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Logger, type Plugin } from 'vite'
import { exportCommand, frameworkRoot, localCatalogue, siteRoot } from './scripts/framework.mjs'

const pageCatalogue = path.join(siteRoot, 'src', 'data', 'page-catalog.json')
const deckRoute = /^\/api\/decks\/([a-z0-9-]+)\/([a-z0-9-]+\.pptx)$/

// The local stand-in for server/app.py: the same three routes, without sign-in. Decks stream from
// each case's outputs folder in the framework and are never copied into public/ or dist/, so no
// build carries them.
function localApi(base: string, casesRoot: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    let url = (req.url ?? '').split('?')[0]
    if (base !== '/' && url.startsWith(base)) url = `/${url.slice(base.length)}`
    if (url === '/api/config') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ local: true, configured: false }))
      return
    }
    if (url === '/api/cases') {
      if (!existsSync(localCatalogue)) {
        res.statusCode = 404
        res.end('No local catalogue yet. Run npm run cases.')
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      createReadStream(localCatalogue).pipe(res)
      return
    }
    const match = deckRoute.exec(url)
    if (!match) return next()
    const file = path.join(casesRoot, match[1], 'outputs', match[2])
    if (!existsSync(file)) {
      res.statusCode = 404
      res.end('Deck not found. Build it with python scripts/build_case.py ' + match[1])
      return
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
    res.setHeader('Content-Disposition', `attachment; filename="${match[2]}"`)
    res.setHeader('Content-Length', String(statSync(file).size))
    res.setHeader('Cache-Control', 'no-store')
    createReadStream(file).pipe(res)
  }
}

// Re-run the exporter after a record or deck changes, one run at a time.
function exportRunner(root: string, logger: Logger, done: () => void) {
  let running = false
  let pending = false

  function run() {
    if (running) {
      pending = true
      return
    }
    running = true
    const { command, args, cwd } = exportCommand(root)
    const child = spawn(command, args, { cwd })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.on('error', (error) => logger.error(`[cases] could not run ${command}: ${error.message}`))
    child.on('close', (code) => {
      const text = output.trim().replace(/\n/g, '\n[cases] ')
      if (code === 0) {
        logger.info(`[cases] ${text}`, { timestamp: true })
        done()
      } else {
        logger.error(`[cases] export failed (exit ${code})\n[cases] ${text}`, { timestamp: true })
      }
      running = false
      if (pending) {
        pending = false
        run()
      }
    })
  }

  return run
}

function caseRecords(): Plugin {
  return {
    name: 'fsp-case-records',
    configureServer(server) {
      const root = frameworkRoot()
      const casesRoot = path.join(root, 'cases')
      server.middlewares.use(localApi(server.config.base, casesRoot))

      // The catalogue is fetched at runtime rather than bundled, so a fresh export needs a reload.
      const run = exportRunner(root, server.config.logger, () => server.ws.send({ type: 'full-reload' }))
      const folders = readdirSync(casesRoot, { withFileTypes: true }).filter(
        (entry) => entry.isDirectory() && !entry.name.startsWith('_'),
      )
      server.watcher.add(
        folders.flatMap((entry) => [
          path.join(casesRoot, entry.name, 'case-study.yaml'),
          path.join(casesRoot, entry.name, 'outputs'),
        ]),
      )

      let timer: ReturnType<typeof setTimeout> | undefined
      const onChange = (file: string) => {
        const name = path.basename(file)
        if (!file.startsWith(casesRoot) || name.startsWith('~$')) return
        if (name !== 'case-study.yaml' && !name.endsWith('.pptx')) return
        clearTimeout(timer)
        timer = setTimeout(run, 400)
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
    },
    configurePreviewServer(server) {
      server.middlewares.use(localApi(server.config.base, path.join(frameworkRoot(), 'cases')))
    },
  }
}

// Legacy pages, the campaign plan and the bundle belong to the local preview only. The FSP site
// carries product pages beside the cases, so in a hosted build the rest never enters the bundle.
function pageCatalog(hosted: boolean): Plugin {
  const id = 'virtual:page-catalog'
  return {
    name: 'fsp-page-catalog',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return
      this.addWatchFile(pageCatalogue)
      const pages = JSON.parse(readFileSync(pageCatalogue, 'utf-8')) as Array<{ category: string }>
      const kept = hosted ? pages.filter((page) => page.category === 'product') : pages
      return `export default ${JSON.stringify(kept)}`
    },
  }
}

// Vite copies public/ into every build. The hosted build drops the legacy pages again, so they
// cannot reach the FSP site even by mistake; the packager's allowlist and the server's routes are
// the other two locks.
function hostedPublicFiles(): Plugin {
  return {
    name: 'fsp-hosted-public-files',
    apply: 'build',
    closeBundle() {
      rmSync(path.join(siteRoot, 'dist', 'legacy-pages'), { recursive: true, force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    pageCatalog(mode === 'hosted'),
    caseRecords(),
    ...(mode === 'hosted' ? [hostedPublicFiles()] : []),
  ],
  server: {
    watch: {
      // Release tooling writes here while the dev server runs. Watching these folders gains nothing,
      // and a file locked mid-write (artifacts/last-deployment.json, say) crashed the watcher.
      ignored: ['**/artifacts/**', '**/.venv/**', '**/dist/**', '**/server/**', '**/.cache/**'],
    },
  },
  build: {
    rolldownOptions: {
      // bridge.html completes MSAL's silent sign-in in a hidden frame, apart from the app.
      input: {
        main: path.join(siteRoot, 'index.html'),
        bridge: path.join(siteRoot, 'bridge.html'),
      },
    },
  },
}))
