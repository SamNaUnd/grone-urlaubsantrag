import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, clearCsrf, errorMessage } from './api'
import { Alert, Field, Icon } from './components'
import type { User } from './types'

export function Auth({
  setup,
  onLogin,
  onSetup,
}: {
  setup: boolean
  onLogin: (user: User) => void
  onSetup: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [register, setRegister] = useState(false)
  const creating = setup || register
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setBusy(true)
    try {
      const email = String(form.get('email')).trim()
      const password = String(form.get('password'))
      if (creating) {
        if (password !== form.get('confirmation'))
          throw new Error('Die Passwörter stimmen nicht überein.')
        await api(setup ? '/setup' : '/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            ...(setup
              ? { token: String(form.get('token')).trim() }
              : { code: String(form.get('token')).trim() }),
            firstName: form.get('firstName'),
            lastName: form.get('lastName'),
            email,
            password,
          }),
        })
        setRegister(false)
        onSetup()
      } else {
        await api('/auth/login', {
          method: 'POST',
          body: new URLSearchParams({ email, password }),
        })
        clearCsrf()
        onLogin(await api<User>('/auth/me'))
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="brand brand-light">
          <span className="brand-mark">
            <Icon name="calendar" size={23} />
          </span>
          <div>
            Grone<small>Urlaub & Abwesenheit</small>
          </div>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow light">MEHR ÜBERBLICK. WENIGER PAPIER.</span>
          <h1>
            Die nächste
            <br />
            Auszeit beginnt
            <br />
            <em>mit einem Antrag.</em>
          </h1>
          <p>
            Urlaub planen, Anträge im Blick behalten und Entscheidungen an einem
            Ort verwalten.
          </p>
          <div className="auth-feature">
            <Icon name="check" size={18} />
            Für den Ausbildungsalltag in Berlin
          </div>
        </div>
        <div className="auth-bottom">Digitale Urlaubsverwaltung · Grone</div>
        <div className="decorative-circle" aria-hidden="true" />
      </section>
      <main className="auth-main">
        <div className="auth-form-card">
          <span className="eyebrow">
            {setup
              ? 'ERSTEINRICHTUNG'
              : register
                ? 'PERSÖNLICHES KONTO'
                : 'WILLKOMMEN ZURÜCK'}
          </span>
          <h2>
            {setup
              ? 'Verwaltungskonto anlegen'
              : register
                ? 'Mit Einladungscode registrieren'
                : 'Schön, dass Sie da sind.'}
          </h2>
          <p className="muted">
            {setup
              ? 'Legen Sie Ihr eigenes Konto an. Weitere Benutzer können Sie danach hinzufügen.'
              : register
                ? 'Ihr Code legt die Rolle als Ausbilder oder Auszubildender fest.'
                : 'Melden Sie sich mit Ihrem persönlichen Konto an.'}
          </p>
          {error && <Alert>{error}</Alert>}
          <form
            key={setup ? 'setup' : register ? 'register' : 'login'}
            onSubmit={submit}
            className="form-stack"
          >
            {creating && (
              <>
                <Field
                  label={setup ? 'Einrichtungscode' : 'Einladungscode'}
                  hint={
                    setup
                      ? 'Den Code finden Sie auf diesem PC in backend/.local/setup-token.txt.'
                      : 'AB- für Ausbilder, AZ- für Auszubildende. Jeder Code ist nur einmal gültig.'
                  }
                >
                  <input name="token" required autoComplete="off" />
                </Field>
                <div className="form-grid">
                  <Field label="Vorname">
                    <input
                      name="firstName"
                      maxLength={100}
                      autoComplete="given-name"
                      required
                    />
                  </Field>
                  <Field label="Nachname">
                    <input
                      name="lastName"
                      maxLength={100}
                      autoComplete="family-name"
                      required
                    />
                  </Field>
                </div>
              </>
            )}
            <Field label="E-Mail-Adresse">
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
              />
            </Field>
            <Field
              label="Passwort"
              hint={
                creating
                  ? 'Mindestens 12 Zeichen, höchstens 72 UTF-8-Bytes.'
                  : undefined
              }
            >
              <input
                name="password"
                type="password"
                autoComplete={creating ? 'new-password' : 'current-password'}
                minLength={creating ? 12 : undefined}
                maxLength={72}
                required
              />
            </Field>
            {creating && (
              <Field label="Passwort wiederholen">
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                />
              </Field>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? 'Bitte warten …'
                : creating
                  ? 'Konto anlegen'
                  : 'Anmelden'}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          {!setup && (
            <button
              type="button"
              className="text-button"
              style={{ marginTop: 20 }}
              disabled={busy}
              onClick={() => {
                setRegister((value) => !value)
                setError('')
              }}
            >
              {register
                ? 'Zurück zur Anmeldung'
                : 'Mit Einladungscode registrieren'}
            </button>
          )}
          <p className="auth-help">
            {setup
              ? 'Die Ersteinrichtung wird nach dem ersten Konto automatisch geschlossen.'
              : register
                ? 'Einladungscodes erhalten Sie von Ihrer Verwaltung. Sie wählen Ihr Passwort selbst.'
                : 'Noch kein Code oder Passwort vergessen? Bitte wenden Sie sich an Ihre Verwaltung.'}
          </p>
        </div>
        <p className="auth-footer">
          Ein gemeinsamer Ort für Ihre Urlaubsplanung.
        </p>
      </main>
    </div>
  )
}
