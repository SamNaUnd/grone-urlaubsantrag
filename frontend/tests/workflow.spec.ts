import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const password = 'browser-test-password-123'
test.describe.configure({ mode: 'serial' })

async function login(page: Page, email: string) {
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible()
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible()
}

test('complete leave request workflow and mobile layout', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Verwaltungskonto anlegen')).toBeVisible()
  await page.getByLabel('Einrichtungscode').fill(process.env.E2E_SETUP_TOKEN!)
  await page.getByLabel('Vorname', { exact: true }).fill('Verwaltung')
  await page.getByLabel('Nachname', { exact: true }).fill('Testkonto')
  await page.getByLabel('E-Mail-Adresse').fill('admin@example.test')
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.getByLabel('Passwort wiederholen').fill(password)
  await page.getByRole('button', { name: 'Konto anlegen', exact: true }).click()
  await login(page, 'admin@example.test')

  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Verwaltung', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Benutzer anlegen', exact: true })
    .click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Vorname', { exact: true }).fill('Ausbilder')
  await dialog.getByLabel('Nachname', { exact: true }).fill('Testkonto')
  await dialog.getByLabel('E-Mail-Adresse').fill('instructor@example.test')
  await dialog.getByLabel('Anfangspasswort', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByText('instructor@example.test', { exact: true }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Benutzer anlegen', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Vorname', { exact: true }).fill('Ausbildung')
  await dialog.getByLabel('Nachname', { exact: true }).fill('Testkonto')
  await dialog.getByLabel('E-Mail-Adresse').fill('trainee@example.test')
  await dialog.getByLabel('Rolle', { exact: true }).selectOption('TRAINEE')
  await dialog.getByLabel('Anfangspasswort', { exact: true }).fill(password)
  await dialog.getByLabel('Ausbildungsbereich').fill('Testbereich')
  await dialog
    .getByLabel('Zuständiger Ausbilder')
    .selectOption({ label: 'Ausbilder Testkonto' })
  await dialog.locator('input[name="entitlement"]').fill('30')
  await dialog.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByText('trainee@example.test', { exact: true }),
  ).toBeVisible()

  const start = new Date()
  start.setDate(start.getDate() + 14)
  while (start.getDay() !== 1) start.setDate(start.getDate() + 1)
  if (start.getMonth() === 11 && start.getDate() > 15) {
    start.setFullYear(start.getFullYear() + 1, 0, 11)
    while (start.getDay() !== 1) start.setDate(start.getDate() + 1)
  }
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const year = String(start.getFullYear())
  await page.getByLabel('Kalenderjahr').selectOption(year)
  await page.getByRole('button', { name: 'Kontingent', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Urlaubstage im Kalenderjahr').fill('30')
  await dialog.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Abmelden' }).click()

  await login(page, 'trainee@example.test')
  await page.getByLabel('Kalenderjahr').selectOption(year)
  await page
    .getByRole('button', { name: 'Urlaub beantragen', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Urlaubsbeginn', { exact: true }).fill(iso(start))
  await dialog
    .getByLabel('Urlaubsende (einschließlich)', { exact: true })
    .fill(iso(end))
  await dialog.getByLabel('Bemerkung (optional)').fill('Browser-Funktionstest')
  await expect(
    dialog.getByRole('button', { name: 'Antrag absenden' }),
  ).toBeEnabled({ timeout: 20_000 })
  const days = Number(
    await dialog.locator('.preview-box > strong').textContent(),
  )
  expect(days).toBeGreaterThan(0)
  await dialog.getByRole('button', { name: 'Antrag absenden' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.status-open').first()).toBeVisible()
  await page.getByRole('button', { name: 'Abmelden' }).click()

  await login(page, 'instructor@example.test')
  await page.getByLabel('Kalenderjahr').selectOption(year)
  await page
    .getByRole('button', { name: /Antrag \d+ öffnen/ })
    .first()
    .click()
  dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Begründung / Bemerkung')
    .fill('Im Funktionstest freigegeben.')
  await dialog.getByRole('button', { name: 'Genehmigen', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.status-approved').first()).toBeVisible()
  await page.getByRole('button', { name: 'Abmelden' }).click()

  await login(page, 'trainee@example.test')
  await page.getByLabel('Kalenderjahr').selectOption(year)
  await expect(page.locator('.metric').first().locator('strong')).toHaveText(
    String(30 - days),
  )
  await expect(page.locator('.status-approved').first()).toBeVisible()
  await page.screenshot({
    path: 'test-results/trainee-desktop.png',
    fullPage: true,
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole('heading', { name: 'Hallo, Ausbildung.' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/trainee-mobile.png',
    fullPage: true,
  })
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Feiertage', exact: true })
    .click()
  await expect(page.locator('.holiday-card').first()).toBeVisible({
    timeout: 20_000,
  })
})

test('separate instructor and trainee invitation registration', async ({
  page,
}) => {
  await page.goto('/')
  await login(page, 'admin@example.test')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Verwaltung', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Code erstellen', exact: true })
    .click()
  let dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Code erstellen', exact: true })
    .click()
  const instructorCode = await dialog
    .getByLabel('Einladungscode', { exact: true })
    .inputValue()
  expect(instructorCode).toMatch(/^AB-/)
  await dialog.getByRole('button', { name: 'Fertig', exact: true }).click()
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await register(
    page,
    instructorCode,
    'Einladung',
    'Ausbilderkonto',
    'invited-instructor@example.test',
  )
  await login(page, 'invited-instructor@example.test')
  await expect(
    page
      .getByRole('navigation')
      .getByRole('button', { name: 'Auszubildende', exact: true }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation')
      .getByRole('button', { name: 'Verwaltung', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Abmelden' }).click()

  await login(page, 'admin@example.test')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Verwaltung', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Code erstellen', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Rolle der Einladung').selectOption('TRAINEE')
  await dialog.getByLabel('Ausbildungsbereich').fill('Testbereich')
  await dialog
    .getByLabel('Zuständiger Ausbilder')
    .selectOption({ label: 'Einladung Ausbilderkonto' })
  await dialog.getByLabel(/^Urlaubskontingent/).fill('25')
  await dialog
    .getByRole('button', { name: 'Code erstellen', exact: true })
    .click()
  const traineeCode = await dialog
    .getByLabel('Einladungscode', { exact: true })
    .inputValue()
  expect(traineeCode).toMatch(/^AZ-/)
  await page.screenshot({
    path: 'test-results/invitation-created.png',
    fullPage: true,
  })
  await dialog.getByRole('button', { name: 'Fertig', exact: true }).click()
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await register(
    page,
    traineeCode,
    'Einladung',
    'Ausbildungskonto',
    'invited-trainee@example.test',
  )
  await login(page, 'invited-trainee@example.test')
  await expect(page.locator('.metric').first().locator('strong')).toHaveText(
    '25',
  )
  await expect(
    page.getByRole('button', { name: 'Urlaub beantragen', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Mein Profil', exact: true })
    .click()
  await expect(
    page.getByText('Einladung Ausbilderkonto', { exact: true }),
  ).toBeVisible()
})

async function register(
  page: Page,
  code: string,
  firstName: string,
  lastName: string,
  email: string,
) {
  await page
    .getByRole('button', {
      name: 'Mit Einladungscode registrieren',
      exact: true,
    })
    .click()
  await page.getByLabel('Einladungscode', { exact: true }).fill(code)
  await page.getByLabel('Vorname', { exact: true }).fill(firstName)
  await page.getByLabel('Nachname', { exact: true }).fill(lastName)
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.getByLabel('Passwort wiederholen').fill(password)
  await page.getByRole('button', { name: 'Konto anlegen', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Anmelden', exact: true }),
  ).toBeVisible()
}
