import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

const token = process.env.E2E_SETUP_TOKEN ?? randomBytes(32).toString('hex')
process.env.E2E_SETUP_TOKEN = token
const java = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java'
const packaged = process.env.E2E_PACKAGED_APP === 'true'
const backendJar = process.env.E2E_BACKEND_JAR ?? 'target/backend-0.0.1-SNAPSHOT.jar'

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: packaged ? 'http://127.0.0.1:19080' : 'http://127.0.0.1:15173',
    headless: true,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `"${java}" -jar "${backendJar}" --server.port=19080 --server.address=127.0.0.1 --server.servlet.session.cookie.secure=false --spring.datasource.url=jdbc:h2:mem:browser_tests --spring.datasource.driver-class-name=org.h2.Driver --spring.datasource.username=sa --spring.datasource.password=`,
      cwd: '../backend',
      env: { SETUP_TOKEN: token },
      url: 'http://127.0.0.1:19080/api/health',
      timeout: 90_000,
      reuseExistingServer: false,
    },
    ...(!packaged ? [{
      command:
        'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15173 --strictPort',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:19080' },
      url: 'http://127.0.0.1:15173',
      timeout: 30_000,
      reuseExistingServer: false,
    }] : []),
  ],
})
