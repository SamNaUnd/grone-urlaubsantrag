import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, clearCsrf, errorMessage } from './api'
import { Alert, Field } from './components'
import type { User } from './types'
import { fullName, roleLabels } from './types'

export function Profile({
  user,
  onChanged,
}: {
  user: User
  onChanged: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const f = new FormData(event.currentTarget)
    try {
      if (f.get('newPassword') !== f.get('confirmation'))
        throw new Error('Die neuen Passwörter stimmen nicht überein.')
      await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: f.get('currentPassword'),
          newPassword: f.get('newPassword'),
        }),
      })
      clearCsrf()
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="two-column">
      <section className="panel padded">
        <h2>Persönliche Daten</h2>
        <p className="muted">Änderungen übernimmt Ihre Verwaltung.</p>
        <dl className="profile-details">
          <div>
            <dt>Name</dt>
            <dd>{fullName(user)}</dd>
          </div>
          <div>
            <dt>E-Mail-Adresse</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Rolle</dt>
            <dd>{roleLabels[user.role]}</dd>
          </div>
          {user.role === 'TRAINEE' && (
            <>
              <div>
                <dt>Ausbildungsbereich</dt>
                <dd>{user.trainingProgram}</dd>
              </div>
              <div>
                <dt>Ausbilder</dt>
                <dd>{user.instructorName}</dd>
              </div>
              <div>
                <dt>Standort</dt>
                <dd>{user.trainingLocation}</dd>
              </div>
            </>
          )}
        </dl>
      </section>
      <section className="panel padded">
        <h2>Passwort ändern</h2>
        <p className="muted">
          Danach melden Sie sich mit dem neuen Passwort an.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <Field label="Aktuelles Passwort">
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field
            label="Neues Passwort"
            hint="Mindestens 12 Zeichen, höchstens 72 UTF-8-Bytes."
          >
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </Field>
          <Field label="Neues Passwort wiederholen">
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <button className="button primary" disabled={busy}>
            {busy ? 'Wird gespeichert …' : 'Passwort ändern'}
          </button>
        </form>
      </section>
    </div>
  )
}
