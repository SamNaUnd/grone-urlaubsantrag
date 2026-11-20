import { useEffect, useState } from 'react'
import { api, ApiError, clearCsrf, errorMessage } from './api'
import { Auth } from './Auth'
import { Admin } from './Admin'
import { Holidays } from './Holidays'
import { Profile } from './Profile'
import { NewRequest, RequestDetails } from './RequestForms'
import { Alert, Empty, Icon, RequestTable } from './components'
import type { IconName } from './components'
import type { Balance, LeaveRequest, LeaveStatus, Page, User } from './types'
import { formatDate, fullName, roleLabels, statusLabels, today } from './types'

interface AppData {
  requests: LeaveRequest[]
  trainees: User[]
  users: User[]
  balances: Balance[]
}
const emptyData: AppData = {
  requests: [],
  trainees: [],
  users: [],
  balances: [],
}
const pageTitles: Record<Page, string> = {
  dashboard: 'Übersicht',
  requests: 'Urlaubsanträge',
  team: 'Auszubildende',
  admin: 'Verwaltung',
  holidays: 'Feiertage',
  profile: 'Mein Profil',
}
const navigation: { page: Page; icon: IconName; label: string }[] = [
  { page: 'dashboard', icon: 'home', label: 'Übersicht' },
  { page: 'requests', icon: 'calendar', label: 'Urlaubsanträge' },
  { page: 'team', icon: 'users', label: 'Auszubildende' },
  { page: 'admin', icon: 'settings', label: 'Verwaltung' },
  { page: 'holidays', icon: 'sun', label: 'Feiertage' },
  { page: 'profile', icon: 'user', label: 'Mein Profil' },
]

function App() {
  const [booting, setBooting] = useState(true)
  const [setup, setSetup] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [year, setYear] = useState(Number(today().slice(0, 4)))
  const [data, setData] = useState<AppData>(emptyData)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newRequest, setNewRequest] = useState(false)
  const [selected, setSelected] = useState<LeaveRequest | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeaveStatus | ''>('')

  useEffect(() => {
    const controller = new AbortController()
    async function initialize() {
      try {
        const state = await api<{ required: boolean }>('/setup/status', {
          signal: controller.signal,
        })
        setSetup(state.required)
        if (!state.required) {
          try {
            setUser(await api<User>('/auth/me', { signal: controller.signal }))
          } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) throw err
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(errorMessage(err))
      } finally {
        if (!controller.signal.aborted) setBooting(false)
      }
    }
    void initialize()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const options = { signal: controller.signal }
    Promise.all([
      api<LeaveRequest[]>('/leave-requests', options),
      api<User[]>('/trainees', options),
      user.role === 'ADMIN'
        ? api<User[]>('/admin/users', options)
        : Promise.resolve([]),
      api<Balance[]>(`/balances?year=${year}`, options),
    ])
      .then(([requests, trainees, users, balances]) => {
        setData({ requests, trainees, users, balances })
        setError('')
        setLoading(false)
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(err))
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [user, year, revision])

  useEffect(() => {
    const expired = () => {
      setUser(null)
      setData(emptyData)
      setSelected(null)
      setNewRequest(false)
      clearCsrf()
      setNotice('Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.')
    }
    window.addEventListener('session-expired', expired)
    return () => window.removeEventListener('session-expired', expired)
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 7000)
    return () => clearTimeout(timer)
  }, [notice])

  function reload(message?: string) {
    if (message) setNotice(message)
    setLoading(true)
    setRevision((value) => value + 1)
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
      clearCsrf()
      setUser(null)
      setData(emptyData)
      setPage('dashboard')
      setSelected(null)
      setNewRequest(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  if (booting)
    return (
      <main className="boot-screen">
        <span className="brand-mark">
          <Icon name="calendar" size={26} />
        </span>
        <h1>Grone</h1>
        <p>Urlaubsverwaltung wird geladen …</p>
      </main>
    )
  if (!user)
    return (
      <>
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
        {error ? (
          <div className="connection-error">
            <Alert>{error}</Alert>
            <button
              className="button primary"
              onClick={() => window.location.reload()}
            >
              Erneut verbinden
            </button>
          </div>
        ) : (
          <Auth
            setup={setup}
            onLogin={(value) => {
              setUser(value)
              setLoading(true)
              setPage('dashboard')
              setNotice('')
            }}
            onSetup={() => {
              setSetup(false)
              clearCsrf()
              setNotice('Konto angelegt. Bitte melden Sie sich an.')
            }}
          />
        )}
      </>
    )

  const requests = data.requests.filter(
    (request) => Number(request.startDate.slice(0, 4)) === year,
  )
  const ownBalance = data.balances.find(
    (balance) => balance.traineeId === user.traineeId,
  )
  const open = requests.filter((request) => request.status === 'OPEN').length
  const upcoming = requests
    .filter(
      (request) => request.status === 'APPROVED' && request.endDate >= today(),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const filtered = requests.filter(
    (request) =>
      (!status || request.status === status) &&
      `${request.traineeName} ${request.trainingProgram} ${request.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const visibleNavigation = navigation.filter(
    (item) =>
      !(user.role === 'TRAINEE' && item.page === 'team') &&
      !(user.role !== 'ADMIN' && item.page === 'admin'),
  )
  const currentYear = Number(today().slice(0, 4))

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Zum Inhalt springen
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="calendar" size={23} />
          </span>
          <div>
            Grone<small>Urlaub & Abwesenheit</small>
          </div>
        </div>
        <div className="sidebar-label">ARBEITSBEREICH</div>
        <nav aria-label="Hauptnavigation">
          {visibleNavigation.map((item) => (
            <button
              key={item.page}
              className={`nav-item ${page === item.page ? 'selected' : ''}`}
              aria-current={page === item.page ? 'page' : undefined}
              onClick={() => setPage(item.page)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.page === 'requests' && open > 0 && (
                <span className="nav-count">{open}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-info">
          <span className="small-dot" />
          Standort Berlin<small>Montag bis Freitag</small>
        </div>
        <div className="sidebar-user">
          <span className="avatar">
            {user.firstName[0]}
            {user.lastName[0]}
          </span>
          <div>
            <strong>{fullName(user)}</strong>
            <small>{roleLabels[user.role]}</small>
          </div>
          <button
            className="icon-button"
            onClick={logout}
            aria-label="Abmelden"
            title="Abmelden"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            Arbeitsbereich <span>/</span>
            <strong>{pageTitles[page]}</strong>
          </div>
          <span className="topbar-date">
            {new Intl.DateTimeFormat('de-DE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Europe/Berlin',
            }).format(new Date())}
          </span>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {roleLabels[user.role].toUpperCase()} · BERLIN
              </span>
              <h1>
                {page === 'dashboard'
                  ? `Hallo, ${user.firstName}.`
                  : pageTitles[page]}
              </h1>
              <p>
                {page === 'dashboard'
                  ? 'Ihre Urlaubsplanung. Alles an einem Ort.'
                  : page === 'requests'
                    ? 'Von der Planung bis zur Entscheidung.'
                    : page === 'team'
                      ? 'Urlaubskontingente und Abwesenheiten im Überblick.'
                      : page === 'admin'
                        ? 'Ein guter Überblick beginnt mit gepflegten Daten.'
                        : page === 'holidays'
                          ? 'Gut zu wissen, bevor die nächste Auszeit beginnt.'
                          : 'Ihre Daten und Zugangseinstellungen.'}
              </p>
            </div>
            <div className="heading-actions">
              {page !== 'profile' && (
                <label className="year-select">
                  <span className="sr-only">Kalenderjahr</span>
                  <select
                    value={year}
                    onChange={(e) => {
                      const nextYear = Number(e.target.value)
                      if (nextYear !== year) {
                        setYear(nextYear)
                        setLoading(true)
                      }
                    }}
                  >
                    {Array.from(
                      { length: 5 },
                      (_, index) => currentYear - 2 + index,
                    ).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
              {user.role === 'TRAINEE' && page !== 'profile' && (
                <button
                  className="button primary"
                  onClick={() => setNewRequest(true)}
                >
                  <Icon name="plus" size={18} />
                  Urlaub beantragen
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="error-row">
              <Alert>{error}</Alert>
              <button className="button secondary" onClick={() => reload()}>
                Erneut versuchen
              </button>
            </div>
          )}
          {loading && !['profile', 'holidays'].includes(page) ? (
            <div className="loading panel" role="status">
              Daten werden geladen …
            </div>
          ) : (
            <>
              {page === 'dashboard' && (
                <>
                  <div className="metrics-grid">
                    {user.role === 'TRAINEE' ? (
                      <>
                        <Metric
                          label="Verfügbarer Resturlaub"
                          value={ownBalance?.available ?? 0}
                          unit="Tage"
                          icon="sun"
                          accent
                        />
                        <Metric
                          label="Genehmigt / geplant"
                          value={ownBalance?.approvedUpcoming ?? 0}
                          unit="Tage"
                          icon="calendar"
                        />
                        <Metric
                          label="Abgeschlossener Urlaub"
                          value={ownBalance?.taken ?? 0}
                          unit="Tage"
                          icon="check"
                        />
                        <Metric
                          label="Offene Anträge"
                          value={open}
                          unit="Anträge"
                          icon="clock"
                        />
                      </>
                    ) : (
                      <>
                        <Metric
                          label="Auszubildende"
                          value={data.trainees.length}
                          unit="Personen"
                          icon="users"
                          accent
                        />
                        <Metric
                          label="Offene Anträge"
                          value={open}
                          unit="zu prüfen"
                          icon="clock"
                        />
                        <Metric
                          label="Genehmigte Anträge"
                          value={
                            requests.filter((r) => r.status === 'APPROVED')
                              .length
                          }
                          unit="Anträge"
                          icon="check"
                        />
                        <Metric
                          label="Alle Anträge"
                          value={requests.length}
                          unit={`im Jahr ${year}`}
                          icon="calendar"
                        />
                      </>
                    )}
                  </div>
                  {user.role === 'ADMIN' && data.users.length < 3 && (
                    <div className="onboarding-note">
                      <Icon name="users" size={22} />
                      <div>
                        <strong>Bereit für das erste Team?</strong>
                        <p>
                          Legen Sie zuerst einen Ausbilder an, danach die
                          zugehörigen Auszubildenden.
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setPage('admin')}
                      >
                        Benutzer verwalten
                        <Icon name="arrow" size={16} />
                      </button>
                    </div>
                  )}
                  <div className="dashboard-columns">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            {user.role === 'TRAINEE'
                              ? 'Meine letzten Anträge'
                              : 'Aktuelle Anträge'}
                          </h2>
                          <p>Der aktuelle Stand Ihrer Urlaubsplanung.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setPage('requests')}
                        >
                          Alle ansehen
                          <Icon name="arrow" size={16} />
                        </button>
                      </div>
                      <RequestTable
                        requests={requests.slice(0, 5)}
                        onSelect={setSelected}
                        showPerson={user.role !== 'TRAINEE'}
                      />
                    </section>
                    <aside className="panel leave-overview">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            {user.role === 'TRAINEE'
                              ? `Ihr Urlaub ${year}`
                              : 'Kommende Abwesenheiten'}
                          </h2>
                          <p>
                            {user.role === 'TRAINEE'
                              ? 'So verteilen sich Ihre Urlaubstage.'
                              : 'Bereits genehmigt und eingeplant.'}
                          </p>
                        </div>
                      </div>
                      {user.role === 'TRAINEE' ? (
                        <>
                          <div
                            className="balance-ring"
                            style={{
                              background: `conic-gradient(var(--green) ${ownBalance?.entitlement ? Math.max(0, ownBalance.available / ownBalance.entitlement) * 360 : 0}deg, #e5ebe7 0)`,
                            }}
                          >
                            <div>
                              <strong>{ownBalance?.available ?? 0}</strong>
                              <span>
                                von {ownBalance?.entitlement ?? 0} Tagen frei
                              </span>
                            </div>
                          </div>
                          <div className="balance-legend">
                            <span>
                              <i className="legend-dot green" />
                              Verfügbar
                              <strong>{ownBalance?.available ?? 0}</strong>
                            </span>
                            <span>
                              <i className="legend-dot amber" />
                              Offen reserviert
                              <strong>{ownBalance?.pending ?? 0}</strong>
                            </span>
                            <span>
                              <i className="legend-dot grey" />
                              Genehmigt gesamt
                              <strong>
                                {(ownBalance?.taken ?? 0) +
                                  (ownBalance?.approvedUpcoming ?? 0)}
                              </strong>
                            </span>
                          </div>
                          <p className="panel-footnote">
                            Offene Anträge reservieren bereits Urlaubstage.
                          </p>
                        </>
                      ) : upcoming.length ? (
                        <div className="absence-list">
                          {upcoming.slice(0, 5).map((request) => (
                            <button
                              key={request.id}
                              onClick={() => setSelected(request)}
                            >
                              <span className="absence-date">
                                {request.startDate.slice(8)}
                                <small>
                                  {new Intl.DateTimeFormat('de-DE', {
                                    month: 'short',
                                  }).format(
                                    new Date(`${request.startDate}T12:00:00`),
                                  )}
                                </small>
                              </span>
                              <span>
                                <strong>{request.traineeName}</strong>
                                <small>
                                  {formatDate(request.startDate)} –{' '}
                                  {formatDate(request.endDate)}
                                </small>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty
                          title="Noch nichts geplant"
                          text="Genehmigte Abwesenheiten erscheinen hier."
                        />
                      )}
                    </aside>
                  </div>
                </>
              )}
              {page === 'requests' && (
                <section className="panel">
                  <div className="panel-toolbar">
                    <input
                      className="search-input"
                      aria-label="Anträge suchen"
                      placeholder="Name, Ausbildungsbereich oder Antragsnummer …"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <label>
                      <span className="sr-only">Status filtern</span>
                      <select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as LeaveStatus | '')
                        }
                      >
                        <option value="">Alle Status</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="muted">{filtered.length} Anträge</span>
                  </div>
                  <RequestTable
                    requests={filtered}
                    onSelect={setSelected}
                    showPerson={user.role !== 'TRAINEE'}
                  />
                </section>
              )}
              {page === 'team' && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {user.role === 'INSTRUCTOR'
                          ? 'Meine Auszubildenden'
                          : 'Alle Auszubildenden'}
                      </h2>
                      <p>
                        Kontingente für {year} · Offene Anträge sind bereits
                        reserviert.
                      </p>
                    </div>
                  </div>
                  {!data.trainees.length ? (
                    <Empty
                      title="Noch keine Zuordnungen"
                      text="Die Verwaltung kann Auszubildende anlegen und einem Ausbilder zuordnen."
                    />
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Name / Ausbildungsbereich</th>
                            <th>Kontingent</th>
                            <th>Genehmigt</th>
                            <th>Offen</th>
                            <th>Verfügbar</th>
                            <th>Historie</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.trainees.map((trainee) => {
                            const balance = data.balances.find(
                              (b) => b.traineeId === trainee.traineeId,
                            )
                            return (
                              <tr key={trainee.id}>
                                <td>
                                  <strong>{fullName(trainee)}</strong>
                                  <small>
                                    {trainee.trainingProgram}
                                    {!trainee.active ? ' · deaktiviert' : ''}
                                  </small>
                                </td>
                                <td>{balance?.entitlement ?? 0}</td>
                                <td>
                                  {(balance?.taken ?? 0) +
                                    (balance?.approvedUpcoming ?? 0)}
                                </td>
                                <td>{balance?.pending ?? 0}</td>
                                <td>
                                  <strong className="green-text">
                                    {balance?.available ?? 0}
                                  </strong>
                                </td>
                                <td>
                                  <button
                                    className="text-button"
                                    onClick={() => {
                                      setSearch(fullName(trainee))
                                      setStatus('')
                                      setPage('requests')
                                    }}
                                  >
                                    Anträge
                                    <Icon name="arrow" size={16} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
              {page === 'admin' && user.role === 'ADMIN' && (
                <Admin
                  users={data.users}
                  balances={data.balances}
                  year={year}
                  me={user}
                  onSaved={reload}
                />
              )}
              {page === 'holidays' && <Holidays year={year} />}
              {page === 'profile' && (
                <Profile
                  user={user}
                  onChanged={() => {
                    setUser(null)
                    setData(emptyData)
                    setNotice('Passwort geändert. Bitte erneut anmelden.')
                    setPage('dashboard')
                  }}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Grone · Digitale Urlaubsverwaltung</span>
            <span>Standort Berlin</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
          <button
            className="icon-button"
            aria-label="Hinweis schließen"
            onClick={() => setNotice('')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {newRequest && (
        <NewRequest
          onClose={() => setNewRequest(false)}
          onSaved={() => {
            setNewRequest(false)
            reload('Urlaubsantrag eingereicht.')
          }}
        />
      )}
      {selected && (
        <RequestDetails
          key={selected.id}
          initial={selected}
          user={user}
          onClose={() => setSelected(null)}
          onSaved={(message) => {
            setSelected(null)
            reload(message)
          }}
        />
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  icon,
  accent = false,
}: {
  label: string
  value: number
  unit: string
  icon: IconName
  accent?: boolean
}) {
  return (
    <section className={`metric ${accent ? 'accent' : ''}`}>
      <div>
        <span className="metric-label">{label}</span>
        <span className="metric-icon">
          <Icon name={icon} size={20} />
        </span>
      </div>
      <p>
        <strong>{value}</strong>
        <span>{unit}</span>
      </p>
    </section>
  )
}

export default App
