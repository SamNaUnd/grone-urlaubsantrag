import { cloneElement, useEffect, useId, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { LeaveRequest, LeaveStatus } from './types'
import { formatDate, statusLabels } from './types'

export type IconName =
  | 'home'
  | 'calendar'
  | 'users'
  | 'settings'
  | 'sun'
  | 'user'
  | 'arrow'
  | 'plus'
  | 'logout'
  | 'check'
  | 'clock'
  | 'close'
const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  calendar:
    'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Zm3 10h2m4 0h2m-8 4h2',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2m8-12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  logout: 'M9 21H4V3h5m6 5 4 4-4 4M8 12h11',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  close: 'm6 6 12 12M6 18 18 6',
}
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
export function Status({ value }: { value: LeaveStatus }) {
  return (
    <span className={`status status-${value.toLowerCase()}`}>
      <span />
      {statusLabels[value]}
    </span>
  )
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="calendar" size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  )
}
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  )
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>
  hint?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        'aria-describedby': hint ? `${id}-hint` : undefined,
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  )
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <div className="modal-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Schließen"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function RequestTable({
  requests,
  onSelect,
  showPerson = true,
}: {
  requests: LeaveRequest[]
  onSelect: (request: LeaveRequest) => void
  showPerson?: boolean
}) {
  if (!requests.length)
    return (
      <Empty
        title="Noch keine Anträge"
        text="Sobald ein Urlaubsantrag vorliegt, erscheint er hier."
      />
    )
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {showPerson && <th>Auszubildende</th>}
            <th>Zeitraum</th>
            <th>Tage</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              {showPerson && (
                <td>
                  <strong>{request.traineeName}</strong>
                  <small>{request.trainingProgram}</small>
                </td>
              )}
              <td>
                <strong>
                  {formatDate(request.startDate)} –{' '}
                  {formatDate(request.endDate)}
                </strong>
                <small>Antrag #{request.id}</small>
              </td>
              <td>{request.totalDays}</td>
              <td>
                <Status value={request.status} />
              </td>
              <td>
                <button
                  className="table-action"
                  onClick={() => onSelect(request)}
                  aria-label={`Antrag ${request.id} öffnen`}
                >
                  <Icon name="arrow" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
