import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: Number(env.DEV_PORT ?? 5173),
      proxy: {
        '/api':
          process.env.API_PROXY_TARGET ??
          env.API_PROXY_TARGET ??
          'http://127.0.0.1:8080',
      },
    },
  }
})
