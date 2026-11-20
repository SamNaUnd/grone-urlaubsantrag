import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from './api'
import { Alert, Empty, Field, Icon, Modal } from './components'
import type { Balance, Role, User } from './types'
import { fullName, roleLabels } from './types'
import { Invitations } from './Invitations'

export function Admin({
  users,
  balances,
  year,
  me,
  onSaved,
}: {
  users: User[]
  balances: Balance[]
  year: number
  me: User
  onSaved: (message: string) => void
}) {
  const [search, setSearch] = useState('')
  const [create, setCreate] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [quota, setQuota] = useState<User | null>(null)
  const [reset, setReset] = useState<User | null>(null)
  const filtered = users.filter((user) =>
    `${fullName(user)} ${user.email} ${roleLabels[user.role]}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Benutzerverwaltung</h2>
          <p className="muted">
            Konten, Zuständigkeiten und Urlaubskontingente.
          </p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          <Icon name="plus" size={18} />
          Benutzer anlegen
        </button>
      </div>
      <div className="panel">
        <div className="panel-toolbar">
          <input
            className="search-input"
            aria-label="Benutzer suchen"
            placeholder="Name, E-Mail oder Rolle suchen …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="muted">{filtered.length} Konten</span>
        </div>
        {!filtered.length ? (
          <Empty
            title="Keine passenden Konten"
            text="Passen Sie die Suche an oder legen Sie ein neues Konto an."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Benutzer</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {fullName(user)}
                        {user.id === me.id && (
                          <span className="you-label">Sie</span>
                        )}
                      </strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{roleLabels[user.role]}</td>
                    <td>
                      <span
                        className={`account-status ${user.active ? '' : 'inactive'}`}
                      >
                        {user.active ? 'Aktiv' : 'Deaktiviert'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => setEditing(user)}
                        >
                          Bearbeiten
                        </button>
                        {user.role === 'TRAINEE' && (
                          <button
                            className="text-button"
                            onClick={() => setQuota(user)}
                          >
                            Kontingent
                          </button>
                        )}
                        <button
                          className="text-button"
                          onClick={() => setReset(user)}
                        >
                          Passwort
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Invitations users={users} year={year} me={me} />
      {(create || editing) && (
        <UserForm
          key={editing?.id ?? 'new'}
          user={editing}
          users={users}
          me={me}
          onClose={() => {
            setCreate(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreate(false)
            setEditing(null)
            onSaved(editing ? 'Konto aktualisiert.' : 'Konto angelegt.')
          }}
        />
      )}
      {quota && (
        <QuotaForm
          user={quota}
          year={year}
          balance={balances.find((b) => b.traineeId === quota.traineeId)}
          onClose={() => setQuota(null)}
          onSaved={() => {
            setQuota(null)
            onSaved('Urlaubskontingent aktualisiert.')
          }}
        />
      )}
      {reset && (
        <ResetPassword
          user={reset}
          onClose={() => setReset(null)}
          onSaved={() => {
            setReset(null)
            onSaved(
              'Passwort aktualisiert. Bitte persönlich an die betroffene Person weitergeben.',
            )
          }}
        />
      )}
    </>
  )
}

function UserForm({
  user,
  users,
  me,
  onClose,
  onSaved,
}: {
  user: User | null
  users: User[]
  me: User
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<Role>(user?.role ?? 'INSTRUCTOR')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const instructors = users.filter((u) => u.role === 'INSTRUCTOR' && u.active)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(event.currentTarget)
    const body = {
      firstName: f.get('firstName'),
      lastName: f.get('lastName'),
      email: f.get('email'),
      role,
      active: user?.id === me.id ? true : f.get('active') === 'on',
      password: f.get('password'),
      trainingProgram: role === 'TRAINEE' ? f.get('trainingProgram') : null,
      instructorId: role === 'TRAINEE' ? Number(f.get('instructorId')) : null,
      entitlement: Number(f.get('entitlement') ?? 0),
    }
    try {
      await api(user ? `/admin/users/${user.id}` : '/admin/users', {
        method: user ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={user ? 'Konto bearbeiten' : 'Benutzer anlegen'}
      subtitle="Persönliche Daten werden nur in der Datenbank gespeichert."
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Vorname">
            <input
              name="firstName"
              defaultValue={user?.firstName}
              maxLength={100}
              required
              autoComplete="off"
            />
          </Field>
          <Field label="Nachname">
            <input
              name="lastName"
              defaultValue={user?.lastName}
              maxLength={100}
              required
              autoComplete="off"
            />
          </Field>
        </div>
        <Field label="E-Mail-Adresse">
          <input
            name="email"
            type="email"
            defaultValue={user?.email}
            maxLength={254}
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Rolle">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={user?.id === me.id}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {!user && (
          <Field
            label="Anfangspasswort"
            hint="Mindestens 12 Zeichen. Persönlich weitergeben; danach im Profil ändern."
          >
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </Field>
        )}
        {role === 'TRAINEE' && (
          <>
            <Field label="Ausbildungsbereich">
              <input
                name="trainingProgram"
                defaultValue={user?.trainingProgram ?? ''}
                maxLength={150}
                required
              />
            </Field>
            <Field label="Zuständiger Ausbilder">
              <select
                name="instructorId"
                defaultValue={user?.instructorId ?? ''}
                required
              >
                <option value="">Bitte auswählen</option>
                {instructors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {fullName(u)}
                  </option>
                ))}
              </select>
            </Field>
            {instructors.length === 0 && (
              <Alert>Legen Sie zuerst ein aktives Ausbilderkonto an.</Alert>
            )}
            {!user && (
              <Field
                label={`Urlaubskontingent ${new Date().getFullYear()}`}
                hint="Tatsächlichen Anspruch eintragen. Weitere Jahre können Sie später verwalten."
              >
                <input
                  name="entitlement"
                  type="number"
                  min={0}
                  max={366}
                  defaultValue={0}
                  required
                />
              </Field>
            )}
            <p className="field-hint">
              Ausbildungsstandort: Berlin · Feiertagsregion DE-BE
            </p>
          </>
        )}
        <label className="checkbox-field">
          <input
            name="active"
            type="checkbox"
            defaultChecked={user?.active ?? true}
            disabled={!user || user.id === me.id}
          />
          Konto ist aktiv
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="button primary"
            disabled={busy || (role === 'TRAINEE' && !instructors.length)}
          >
            {busy ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function QuotaForm({
  user,
  balance,
  year,
  onClose,
  onSaved,
}: {
  user: User
  balance?: Balance
  year: number
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await api(`/trainees/${user.traineeId}/entitlement`, {
        method: 'PUT',
        body: JSON.stringify({ year, days: Number(form.get('days')) }),
      })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`Urlaubskontingent ${year}`}
      subtitle={fullName(user)}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <Field label="Urlaubstage im Kalenderjahr">
          <input
            name="days"
            type="number"
            min={0}
            max={366}
            defaultValue={balance?.entitlement ?? 0}
            required
          />
        </Field>
        <div className="notice">
          Offene und genehmigte Anträge binden bereits Urlaubstage. Das
          Kontingent kann nicht darunter gesenkt werden.
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button className="button primary" disabled={busy}>
            Speichern
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPassword({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(event.currentTarget)
    try {
      await api(`/admin/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: f.get('password') }),
      })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Passwort zurücksetzen"
      subtitle={fullName(user)}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <Field label="Neues Anfangspasswort">
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button className="button primary" disabled={busy}>
            Passwort setzen
          </button>
        </div>
      </form>
    </Modal>
  )
}
