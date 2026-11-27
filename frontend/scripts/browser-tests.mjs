import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const result = spawnSync(
  process.execPath,
  [
    join(root, 'node_modules/@playwright/test/cli.js'),
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: join(root, '.local/browsers'),
    },
    stdio: 'inherit',
  },
)
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
