import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from './api'
import { Alert, Empty, Field, Icon, Modal } from './components'
import type { Role, User } from './types'
import { formatDate, fullName, roleLabels } from './types'

interface Invitation {
  id: number
  role: Role
  trainingProgram: string | null
  instructorName: string | null
  year: number
  days: number
  expiresAt: string
  redeemedAt: string | null
  revokedAt: string | null
}
interface Created {
  invitation: Invitation
  code: string
}

export function Invitations({ users, year }: { users: User[]; year: number }) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [revision, setRevision] = useState(0)
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<'INSTRUCTOR' | 'TRAINEE'>('INSTRUCTOR')
  const [created, setCreated] = useState<Created | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const instructors = users.filter(
    (user) => user.active && user.role === 'INSTRUCTOR',
  )
  useEffect(() => {
    const controller = new AbortController()
    api<Invitation[]>('/admin/invitations', { signal: controller.signal })
      .then(setInvitations)
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err))
      })
    return () => controller.abort()
  }, [revision])
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(event.currentTarget)
    try {
      setCreated(
        await api<Created>('/admin/invitations', {
          method: 'POST',
          body: JSON.stringify({
            role,
            trainingProgram:
              role === 'TRAINEE' ? f.get('trainingProgram') : null,
            instructorId:
              role === 'TRAINEE' ? Number(f.get('instructorId')) : null,
            year,
            days: Number(f.get('days') ?? 0),
            validDays: Number(f.get('validDays')),
          }),
        }),
      )
      setRevision((value) => value + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  async function revoke(id: number) {
    setBusy(true)
    setError('')
    try {
      await api(`/admin/invitations/${id}/revoke`, { method: 'PUT' })
      setRevision((value) => value + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(created!.code)
      setCopied(true)
    } catch {
      setError('Bitte den Code im Feld markieren und kopieren.')
    }
  }
  function close() {
    setOpen(false)
    setCreated(null)
    setCopied(false)
    setError('')
  }
  return (
    <section className="panel" style={{ marginTop: 28 }}>
      <div className="panel-heading">
        <div>
          <h2>Einladungscodes</h2>
          <p>
            Getrennte Codes für Ausbilder und Auszubildende. Persönliche Daten
            und Passwort werden selbst eingegeben.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setOpen(true)
            setError('')
          }}
        >
          <Icon name="plus" size={17} />
          Code erstellen
        </button>
      </div>
      {!open && error && (
        <div className="padded">
          <Alert>{error}</Alert>
        </div>
      )}
      {invitations.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Einladung</th>
                <th>Rolle</th>
                <th>Ausbildungsbereich / Zuordnung</th>
                <th>Gültig bis</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const active =
                  !invitation.redeemedAt &&
                  !invitation.revokedAt &&
                  new Date(invitation.expiresAt) > new Date()
                return (
                  <tr key={invitation.id}>
                    <td>#{invitation.id}</td>
                    <td>{roleLabels[invitation.role]}</td>
                    <td>
                      <strong>{invitation.trainingProgram ?? '–'}</strong>
                      <small>
                        {invitation.instructorName ?? 'Ausbilderkonto'}
                      </small>
                    </td>
                    <td>{formatDate(invitation.expiresAt)}</td>
                    <td>
                      {invitation.redeemedAt
                        ? 'Verwendet'
                        : invitation.revokedAt
                          ? 'Widerrufen'
                          : active
                            ? 'Offen'
                            : 'Abgelaufen'}
                    </td>
                    <td>
                      {active && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => revoke(invitation.id)}
                        >
                          Widerrufen
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Noch keine Einladungscodes"
          text="Erstellen Sie pro Person einen eigenen Code für die passende Rolle."
        />
      )}
      {open && (
        <Modal
          title={
            created ? 'Einladungscode erstellt' : 'Einladungscode erstellen'
          }
          subtitle={
            created
              ? roleLabels[created.invitation.role]
              : 'Der Code legt die Berechtigungen bei der Registrierung fest.'
          }
          onClose={close}
        >
          {created ? (
            <div className="form-stack">
              <div className="notice">
                Privat weitergeben. Der vollständige Code wird nur jetzt
                angezeigt und kann einmal eingelöst werden.
              </div>
              <Field label="Einladungscode">
                <input
                  readOnly
                  value={created.code}
                  autoComplete="off"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </Field>
              <p className="muted">
                Gültig bis {formatDate(created.invitation.expiresAt)}. Auf der
                Anmeldeseite „Mit Einladungscode registrieren“ wählen und diesen
                Code eingeben.
              </p>
              {error && <Alert>{error}</Alert>}
              <div className="modal-actions">
                <button className="button secondary" onClick={copy}>
                  {copied ? 'Kopiert' : 'Code kopieren'}
                </button>
                <button className="button primary" onClick={close}>
                  Fertig
                </button>
              </div>
            </div>
          ) : (
            <form className="form-stack" onSubmit={create}>
              <Field label="Rolle der Einladung">
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'INSTRUCTOR' | 'TRAINEE')
                  }
                >
                  <option value="INSTRUCTOR">Ausbilder (AB-)</option>
                  <option value="TRAINEE">Auszubildende (AZ-)</option>
                </select>
              </Field>
              {role === 'TRAINEE' && (
                <>
                  <Field label="Ausbildungsbereich">
                    <input name="trainingProgram" maxLength={150} required />
                  </Field>
                  <Field label="Zuständiger Ausbilder">
                    <select name="instructorId" defaultValue="" required>
                      <option value="">Bitte auswählen</option>
                      {instructors.map((user) => (
                        <option key={user.id} value={user.id}>
                          {fullName(user)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`Urlaubskontingent ${year}`}>
                    <input
                      name="days"
                      type="number"
                      min={0}
                      max={366}
                      defaultValue={0}
                      required
                    />
                  </Field>
                  {!instructors.length && (
                    <Alert>
                      Erstellen Sie zuerst einen Ausbildercode und lassen Sie
                      den Ausbilder sein Konto anlegen.
                    </Alert>
                  )}
                </>
              )}
              <Field label="Gültigkeit in Tagen">
                <input
                  name="validDays"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={7}
                  required
                />
              </Field>
              {error && <Alert>{error}</Alert>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={close}
                >
                  Abbrechen
                </button>
                <button
                  className="button primary"
                  disabled={busy || (role === 'TRAINEE' && !instructors.length)}
                >
                  Code erstellen
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  )
}
