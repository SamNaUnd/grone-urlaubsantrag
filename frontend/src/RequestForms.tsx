import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from './api'
import { Alert, Field, Icon, Modal, Status } from './components'
import type { LeaveRequest, Preview, User } from './types'
import { formatDate, today } from './types'

export function NewRequest({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  useEffect(() => {
    if (!start || !end) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api<Preview>(
        `/leave-requests/preview?startDate=${start}&endDate=${end}`,
        { signal: controller.signal },
      )
        .then((value) => {
          setPreview(value)
          setError('')
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(errorMessage(err))
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false)
        })
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [start, end])
  function changeStart(value: string) {
    setStart(value)
    setPreview(null)
    setError('')
    setChecking(Boolean(value && end))
  }
  function changeEnd(value: string) {
    setEnd(value)
    setPreview(null)
    setError('')
    setChecking(Boolean(start && value))
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await api('/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          reason: form.get('reason'),
        }),
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
      title="Urlaub beantragen"
      subtitle="Planen Sie Ihre nächste Auszeit."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        <div className="notice">
          <Icon name="sun" />
          Wochenenden und Berliner Feiertage werden automatisch abgezogen.
        </div>
        <div className="form-grid">
          <Field label="Urlaubsbeginn">
            <input
              name="startDate"
              type="date"
              min={today()}
              value={start}
              onChange={(e) => changeStart(e.target.value)}
              required
            />
          </Field>
          <Field label="Urlaubsende (einschließlich)">
            <input
              name="endDate"
              type="date"
              min={start || today()}
              value={end}
              onChange={(e) => changeEnd(e.target.value)}
              required
            />
          </Field>
        </div>
        <p className="field-hint">
          Für einen Urlaub über den Jahreswechsel erstellen Sie bitte zwei
          Anträge.
        </p>
        <div className="preview-box" aria-live="polite">
          <span>Beantragte Urlaubstage</span>
          <strong>{checking ? '…' : (preview?.days ?? '–')}</strong>
          {preview && (
            <small>
              {preview.balance.available} Tage verfügbar ·{' '}
              {preview.balance.available - preview.days} Tage nach diesem Antrag
            </small>
          )}
        </div>
        <Field label="Bemerkung (optional)">
          <textarea
            name="reason"
            rows={3}
            maxLength={2000}
            placeholder="Was möchten Sie Ihrem Ausbilder mitteilen?"
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="button primary"
            disabled={
              busy ||
              checking ||
              !preview ||
              preview.days < 1 ||
              preview.days > preview.balance.available
            }
          >
            {busy ? 'Wird gesendet …' : 'Antrag absenden'}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function RequestDetails({
  initial,
  user,
  onClose,
  onSaved,
}: {
  initial: LeaveRequest
  user: User
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [request, setRequest] = useState(initial)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    api<LeaveRequest>(`/leave-requests/${initial.id}`, {
      signal: controller.signal,
    })
      .then(setRequest)
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err))
      })
    return () => controller.abort()
  }, [initial.id])
  async function decide(action: 'approve' | 'reject' | 'withdraw') {
    if (action === 'reject' && !comment.trim()) {
      setError('Bitte einen Ablehnungsgrund eingeben.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api(`/leave-requests/${request.id}/${action}`, {
        method: 'PUT',
        ...(action === 'withdraw' ? {} : { body: JSON.stringify({ comment }) }),
      })
      onSaved(
        action === 'approve'
          ? 'Antrag genehmigt.'
          : action === 'reject'
            ? 'Antrag abgelehnt.'
            : 'Antrag zurückgezogen.',
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`Urlaubsantrag #${request.id}`}
      subtitle={request.traineeName}
      onClose={onClose}
    >
      <div className="detail-status">
        <Status value={request.status} />
        <span className="muted">
          Erstellt am {formatDate(request.createdAt)}
        </span>
      </div>
      <div className="detail-period">
        <Icon name="calendar" size={25} />
        <div>
          <strong>
            {formatDate(request.startDate)} – {formatDate(request.endDate)}
          </strong>
          <span>{request.totalDays} Urlaubstage</span>
        </div>
      </div>
      <dl className="details-grid">
        <div>
          <dt>Ausbildungsbereich</dt>
          <dd>{request.trainingProgram}</dd>
        </div>
        <div>
          <dt>Zuständiger Ausbilder</dt>
          <dd>{request.instructorName}</dd>
        </div>
      </dl>
      {request.reason && (
        <div className="text-block">
          <h3>Bemerkung</h3>
          <p>{request.reason}</p>
        </div>
      )}
      {request.decidedBy && (
        <div className="text-block">
          <h3>Entscheidung von {request.decidedBy}</h3>
          <p>{request.decisionComment || 'Keine zusätzliche Bemerkung.'}</p>
          <small className="muted">
            {request.decidedAt && formatDate(request.decidedAt)}
          </small>
        </div>
      )}
      {request.status === 'OPEN' && user.role === 'INSTRUCTOR' && (
        <div className="form-stack">
          <Field
            label="Begründung / Bemerkung"
            hint="Bei einer Ablehnung ist eine Begründung erforderlich."
          >
            <textarea
              rows={3}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <div className="modal-actions">
            <button
              className="button danger"
              disabled={busy}
              onClick={() => decide('reject')}
            >
              Ablehnen
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => decide('approve')}
            >
              <Icon name="check" size={18} />
              Genehmigen
            </button>
          </div>
        </div>
      )}
      {request.status === 'OPEN' && user.role === 'TRAINEE' && (
        <div className="modal-actions">
          {confirmWithdraw ? (
            <>
              <span className="muted">Antrag wirklich zurückziehen?</span>
              <button
                className="button secondary"
                onClick={() => setConfirmWithdraw(false)}
              >
                Abbrechen
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => decide('withdraw')}
              >
                Ja, zurückziehen
              </button>
            </>
          ) : (
            <button
              className="button secondary"
              onClick={() => setConfirmWithdraw(true)}
            >
              Antrag zurückziehen
            </button>
          )}
        </div>
      )}
      {error && <Alert>{error}</Alert>}
    </Modal>
  )
}
