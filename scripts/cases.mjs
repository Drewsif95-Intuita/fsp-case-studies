// npm run cases: write src/data/generated/cases.local.json from the framework's case records.
import { spawnSync } from 'node:child_process'
import { exportCommand } from './framework.mjs'

let run
try {
  run = exportCommand()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
const result = spawnSync(run.command, run.args, { cwd: run.cwd, stdio: 'inherit' })
if (result.error) console.error(`Could not run ${run.command}: ${result.error.message}. Set PYTHON to the framework's interpreter.`)
process.exit(result.status ?? 1)
