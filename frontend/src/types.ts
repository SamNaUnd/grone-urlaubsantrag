export type Role = 'TRAINEE' | 'INSTRUCTOR' | 'ADMIN'
export type LeaveStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type Page =
  'dashboard' | 'requests' | 'team' | 'admin' | 'holidays' | 'profile'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: Role
  active: boolean
  traineeId: number | null
  trainingProgram: string | null
  instructorId: number | null
  instructorName: string | null
  trainingLocation: string | null
}

export interface Balance {
  traineeId: number
  year: number
  entitlement: number
  taken: number
  approvedUpcoming: number
  pending: number
  available: number
}

export interface LeaveRequest {
  id: number
  traineeId: number
  traineeName: string
  trainingProgram: string
  instructorName: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: LeaveStatus
  createdAt: string
  decisionComment: string | null
  decidedBy: string | null
  decidedAt: string | null
}

export interface Holiday {
  date: string
  name: string
}
export interface Preview {
  days: number
  balance: Balance
}

export const roleLabels: Record<Role, string> = {
  TRAINEE: 'Auszubildende',
  INSTRUCTOR: 'Ausbilder',
  ADMIN: 'Verwaltung',
}
export const statusLabels: Record<LeaveStatus, string> = {
  OPEN: 'Offen',
  APPROVED: 'Genehmigt',
  REJECTED: 'Abgelehnt',
  WITHDRAWN: 'Zurückgezogen',
}
export function fullName(user: User) {
  return `${user.firstName} ${user.lastName}`
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value))
}
export function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`
}
