import { useEffect, useState } from 'react'
import { api, errorMessage } from './api'
import { Alert, Icon } from './components'
import type { Holiday } from './types'
import { formatDate, today } from './types'

export function Holidays({ year }: { year: number }) {
  const [data, setData] = useState<{
    year: number
    holidays: Holiday[]
  } | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api<Holiday[]>(`/holidays?year=${year}`, { signal: controller.signal })
      .then((holidays) => {
        setData({ year, holidays })
        setError('')
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err))
      })
    return () => controller.abort()
  }, [year, revision])
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Berliner Feiertage {year}</h2>
          <p>Diese Tage werden bei Urlaubsanträgen berücksichtigt.</p>
        </div>
        <span className="region-label">
          <Icon name="sun" size={16} />
          Berlin · DE-BE
        </span>
      </div>
      {error ? (
        <div className="padded">
          <Alert>{error}</Alert>
          <button
            className="button secondary"
            onClick={() => setRevision(revision + 1)}
          >
            Erneut versuchen
          </button>
        </div>
      ) : data?.year !== year ? (
        <div className="loading">Feiertage werden geladen …</div>
      ) : (
        <div className="holiday-grid">
          {data.holidays.map((holiday) => (
            <div
              className={`holiday-card ${holiday.date < today() ? 'past' : ''}`}
              key={`${holiday.date}-${holiday.name}`}
            >
              <span className="holiday-day">
                {holiday.date.slice(8)}
                <small>
                  {new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(
                    new Date(`${holiday.date}T12:00:00`),
                  )}
                </small>
              </span>
              <div>
                <strong>{holiday.name}</strong>
                <small>
                  {formatDate(holiday.date)} ·{' '}
                  {new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(
                    new Date(`${holiday.date}T12:00:00`),
                  )}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="panel-footnote">
        Quelle: Nager.Date · Gesetzliche Feiertage für Berlin. Wochenenden
        zählen ebenfalls nicht als Urlaubstage.
      </div>
    </section>
  )
}
