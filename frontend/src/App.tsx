import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('Verbindung wird geprüft …')

  useEffect(() => {
    const controller = new AbortController()

    async function checkBackend() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Backend-Anfrage fehlgeschlagen')
        }

        const data = await response.json()

        if (data.status !== 'UP') {
          throw new Error('Backend ist nicht bereit')
        }

        setStatus('Backend verbunden')
      } catch {
        if (!controller.signal.aborted) {
          setStatus('Backend nicht erreichbar')
        }
      }
    }

    void checkBackend()

    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          Grone
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          Digitale Urlaubsverwaltung
        </h1>

        <p className="mt-4 text-slate-600">
          Urlaubsanträge erstellen, prüfen und verwalten.
        </p>

        <p className="mt-6 text-sm" role="status">
          {status}
        </p>
      </section>
    </main>
  )
}

export default App