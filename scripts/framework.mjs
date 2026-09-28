// The case pages come from the case study framework, a separate repository: its case records, its
// built decks and its exporter. FSP_CASE_FRAMEWORK points at it if set; otherwise case-framework.json
// does, relative to this site.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const localCatalogue = path.join(siteRoot, 'src', 'data', 'generated', 'cases.local.json')

export function frameworkRoot() {
  const configured =
    process.env.FSP_CASE_FRAMEWORK ||
    JSON.parse(readFileSync(path.join(siteRoot, 'case-framework.json'), 'utf-8')).path
  const root = path.resolve(siteRoot, configured)
  if (!existsSync(path.join(root, 'scripts', 'export_site_cases.py'))) {
    throw new Error(
      `No case study framework at ${root}. Set FSP_CASE_FRAMEWORK or case-framework.json to its folder.`,
    )
  }
  return root
}

// The local preview's catalogue, exported by the framework's own Python from its own folder.
export function exportCommand(root = frameworkRoot()) {
  return {
    command: process.env.PYTHON ?? 'python',
    args: [path.join(root, 'scripts', 'export_site_cases.py'), '--output', localCatalogue],
    cwd: root,
  }
}
